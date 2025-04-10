// routes/index.js
const express = require('express');
const router = express.Router();
const config = require('../config/recommenderConfig');

// Import agent functions
const { getCustomerProfile } = require('../agents/customerProfiler');
const { selectCandidateProducts } = require('../agents/candidateSelector');
const { getLlmRecommendations } = require('../agents/recommendationAgent');
const { getDb } = require('../db/database'); // To get DB instance if not passed differently

// GET route for the main page
router.get('/', (req, res) => {
    // Access loaded data via app.locals set in server.js
    const appData = req.app.locals.appData;
    if (!appData || !appData.customerMap || !appData.productMap) {
        // Handle case where data isn't ready (shouldn't happen if init works)
        return res.status(503).send("Service temporarily unavailable - data not loaded.");
    }

    // Prepare data for the template
    const templateData = {
        customer_id: "",
        profile_summary: null,
        recommendations: null,
        model_options: { // Pass model options from config
            'ollama': config.AVAILABLE_OLLAMA_MODELS,
            'gemini': config.AVAILABLE_GEMINI_MODELS
        },
        selected_service: config.DEFAULT_LLM_SERVICE,
        selected_model: config.DEFAULT_LLM_SERVICE === 'ollama' ? config.AVAILABLE_OLLAMA_MODELS[0] : config.AVAILABLE_GEMINI_MODELS[0]
    };
    res.render('index', templateData);
});

// POST route to handle form submission
router.post('/', async (req, res) => {
    // Access loaded data and db instance
    const appData = req.app.locals.appData;
    const dbInstance = getDb(); // Get DB instance via module
    if (!appData || !appData.customerMap || !appData.productMap || !dbInstance) {
        return res.status(503).send("Service temporarily unavailable - data/db not ready.");
    }
    const { customerMap, productMap } = appData;

    // Get form data
    const customer_id_submitted = req.body.customer_id?.trim();
    const selected_service = req.body.llm_service || config.DEFAULT_LLM_SERVICE;
    const selected_model = req.body.generation_model?.trim();

    let profile_summary = null;
    let recommendations_list = null;
    let flash_error = null; // Simulate flash messages for now

    // --- Input Validation ---
    if (!customer_id_submitted) {
        flash_error = 'Please enter a Customer ID.';
    } else if (!selected_model) {
        flash_error = 'Please select a Generation Model.';
    } else if (selected_service === 'gemini' && !process.env[config.GEMINI_API_KEY_ENV_VAR]) {
        flash_error = `Error: Gemini selected, but ${config.GEMINI_API_KEY_ENV_VAR} env var not set.`;
    } else {
        // --- Orchestration ---
        try {
            console.log(`--- Request for Customer: ${customer_id_submitted}, Service: ${selected_service}, Model: ${selected_model} ---`);

            profile_summary = await getCustomerProfile(customer_id_submitted, customerMap); // Pass map

            if (profile_summary.startsWith("Error:")) {
                flash_error = profile_summary;
                profile_summary = null; // Clear profile if error
            } else {
                const candidate_products = selectCandidateProducts(customer_id_submitted, customerMap, productMap); // Pass maps

                if (!candidate_products || candidate_products.length === 0) {
                    flash_error = "No suitable candidate products found based on profile filtering.";
                    recommendations_list = []; // Empty list
                } else {
                    const llm_result = await getLlmRecommendations(
                        profile_summary,
                        candidate_products,
                        selected_service,
                        selected_model
                    );

                    if (typeof llm_result === 'object' && llm_result !== null && llm_result.error) {
                        flash_error = `LLM Error: ${llm_result.error}`;
                        if(llm_result.raw_output) console.error("LLM Raw Output:", llm_result.raw_output); // Log raw output on error
                        recommendations_list = null;
                    } else if (!Array.isArray(llm_result)) {
                        flash_error = `Error: Unexpected result type from LLM: ${typeof llm_result}`;
                        recommendations_list = null;
                    } else {
                        // Success - Fetch details
                        recommendations_list = llm_result.map(rec => {
                            const prod_id = rec?.product_id;
                            if (!prod_id) return { error: 'Missing product_id from LLM', id: 'N/A' }; // Handle missing ID
                            const prod_data = productMap.get(prod_id);
                            if (!prod_data) {
                                return {
                                    id: prod_id, category: 'N/A', error: 'Product details not found',
                                    explanation: rec.explanation
                                };
                            }
                            return { // Map to structure expected by template
                                id: prod_id,
                                category: prod_data[config.PROD_CATEGORY_COL] || 'N/A',
                                subcategory: prod_data[config.PROD_SUBCATEGORY_COL] || 'N/A',
                                brand: prod_data[config.PROD_BRAND_COL] || 'N/A',
                                price: prod_data[config.PROD_PRICE_COL] || 'N/A',
                                rating: prod_data[config.PROD_RATING_COL] || 'N/A',
                                why: rec?.explanation || null
                            };
                        });
                         // Optional: Filter out items that had errors during detail fetching if needed
                         // recommendations_list = recommendations_list.filter(r => !r.error || r.error !== 'Product details not found');
                    }
                }
            }
        } catch (error) {
            console.error(`Error during recommendation generation: ${error.message}`, error);
            flash_error = 'An unexpected server error occurred.';
            recommendations_list = null; // Clear results on server error
        }
    }

    // --- Render Template ---
    // Re-prepare template data with results and selections
    const templateData = {
        customer_id: customer_id_submitted,
        profile_summary: profile_summary,
        recommendations: recommendations_list,
        model_options: {
            'ollama': config.AVAILABLE_OLLAMA_MODELS,
            'gemini': config.AVAILABLE_GEMINI_MODELS
        },
        selected_service: selected_service,
        selected_model: selected_model,
        flash_error: flash_error // Pass error message to template
    };
    res.render('index', templateData);
});

module.exports = router;