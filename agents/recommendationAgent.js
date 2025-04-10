// agents/recommendationAgent.js
import ollama from 'ollama';
// const { GoogleGenerativeAI } = require('@google/generative-ai');
import { GoogleGenerativeAI } from '@google/generative-ai'; // Import specific class
const json = JSON; // Alias built-in JSON
// const config = require('../config/recommenderConfig');
import config from '../config/recommenderConfig.mjs';


// Initialize Gemini client ONLY IF key exists (avoids error if key missing but Ollama selected)
let genAI = null;
const geminiApiKey = process.env[config.GEMINI_API_KEY_ENV_VAR];
if (geminiApiKey) {
    try {
        genAI = new GoogleGenerativeAI(geminiApiKey);
        console.log("Gemini AI Client initialized (API key found).");
    } catch (e) {
        console.error("Failed to initialize GoogleGenerativeAI:", e.message);
        // Proceed, but Gemini calls will fail if selected later without successful init
    }
} else {
     console.warn(`Optional: Environment variable ${config.GEMINI_API_KEY_ENV_VAR} not set. Gemini service will not be available.`);
}


/**
 * Formats candidate product details for the LLM prompt.
 */
function formatCandidatesForLlm(candidateProducts) { // Takes array of objects
    if (!candidateProducts || candidateProducts.length === 0) {
        return "No candidate products.";
    }
    let output = "Candidate Products (Selected based on profile matching):\n";
    const limit = config.MAX_CANDIDATE_DETAILS_IN_PROMPT;
    candidateProducts.slice(0, limit).forEach(product => {
        const prod_id = product[config.PROD_ID_COL]; // Get ID from object
        output += `- ID: ${prod_id}, `;
        output += `Cat: ${product[config.PROD_CATEGORY_COL] || 'N/A'}, `;
        output += `Subcat: ${product[config.PROD_SUBCATEGORY_COL] || 'N/A'}, `;
        output += `Brand: ${product[config.PROD_BRAND_COL] || 'N/A'}, `;
        output += `Price: ${product[config.PROD_PRICE_COL] || 'N/A'}, `;
        output += `Rating: ${product[config.PROD_RATING_COL] || 'N/A'}\n`;
    });
    if (candidateProducts.length > limit) {
         output += `... (plus ${candidateProducts.length - limit} more candidates not detailed)\n`;
    }
    return output;
}

/**
 * Agent 3: Gets recommendations from the LLM, requesting JSON.
 * Returns a Promise resolving with parsed JSON list or error dict.
 */
export async function getLlmRecommendations(profileSummary, candidateProducts, service, generationModelName) {
    if (!candidateProducts || candidateProducts.length === 0) {
        return { error: "Could not generate: No candidates." };
    }

    const candidateProductText = formatCandidatesForLlm(candidateProducts);

    // --- Prompt for JSON Output (Same as before) ---
    const prompt = `
You are an AI E-commerce Agent generating personalized recommendations.
Analyze the Customer Profile and Candidate Products below. Select the top 5 most relevant products for this customer.

**Customer Profile:**
${profileSummary}

**Candidate Products (Pre-filtered):**
${candidateProductText}

**Output Instructions:**
1.  **Format:** Respond ONLY with a single, valid JSON array containing exactly 5 objects.
2.  **Object Keys:** Each object MUST have:
    *   "product_id": (String) The exact Product ID from the candidate list.
    *   "explanation": (String or null) A 1-sentence explanation referencing the customer's profile for the top 5 ranks.
3.  **Ranking:** Order objects in the array from rank 1 (most relevant) to rank 5.
4.  **Exclusion:** Do not recommend products recently purchased by the customer (if mentioned in profile).
5.  **JSON Validity:** Ensure all strings use double quotes ("). No text or markdown before '[' or after ']'.

**Example JSON Output:**
[{"product_id": "P1234", "explanation": "Matches browsing history and preferred brand."}, {"product_id": "P5678", "explanation": "Good for customer's active season."}, {"product_id": "P9012", "explanation": "Similar to past purchases."}, {"product_id": "P3456", "explanation": null}, {"product_id": "P7890", "explanation": ""}]

Generate the JSON array now.
`;

    console.log(`\n--- Sending Prompt to ${service} using model ${generationModelName} ---`);
    let llmOutputText = null;

    try {
        if (service === 'ollama') {
            const response = await ollama.chat({
                model: generationModelName,
                messages: [
                    { role: 'user', content: prompt }
                ],
            });
            // Extract content, structure depends slightly on Ollama version / format support
            if (response && response.message && response.message.content) {
                llmOutputText = response.message.content;
            } else {
                throw new Error("Invalid response structure from Ollama.");
            }

        } else if (service === 'gemini') {
            if (!genAI) { // Check if client initialized successfully
                 return { error: `Gemini API key not configured or initialization failed.` };
            }
            const model = genAI.getGenerativeModel({ model: generationModelName });
            // Attempt to request JSON output directly if supported by model/SDK
            // const generationConfig = { responseMimeType: "application/json" };
            // const result = await model.generateContent(prompt, generationConfig);
            const result = await model.generateContent(prompt); // Rely on prompt first
            const response = result.response; // Use await result.response for clarity

            if (!response || !response.candidates || response.candidates.length === 0) {
                 const feedback = response?.promptFeedback ? `Feedback: ${JSON.stringify(response.promptFeedback)}` : "No feedback.";
                 throw new Error(`Gemini response blocked or empty. ${feedback}`);
            }
            // Gemini text is usually nested within candidates[0].content.parts[0].text
            llmOutputText = response.text(); // .text() helper method usually works

        } else {
            return { error: `Invalid service configuration: ${service}` };
        }

        console.log(`--- ${service} Raw Response Received ---`);
        // console.log(llmOutputText); // DEBUG

        // --- Attempt to Parse JSON ---
        try {
            // Basic cleaning - remove potential markdown fences and trim whitespace
            let cleanedOutput = llmOutputText.trim();
            if (cleanedOutput.startsWith('```json')) {
                cleanedOutput = cleanedOutput.substring(7);
            }
            if (cleanedOutput.startsWith('```')) {
                cleanedOutput = cleanedOutput.substring(3);
            }
            if (cleanedOutput.endsWith('```')) {
                cleanedOutput = cleanedOutput.substring(0, cleanedOutput.length - 3);
            }
            cleanedOutput = cleanedOutput.trim();




            if (!cleanedOutput) { throw new Error("Cleaned output is empty"); }

            const parsedJson = json.parse(cleanedOutput); // Correct method is json.loads for strings
            if (Array.isArray(parsedJson)) {
                console.log("--- Successfully parsed JSON response ---");
                console.log(`LLM Raw Output was:\n${llmOutputText}`);

                return parsedJson;
            } else {
                console.error("Error: LLM response was valid JSON but not a list.");
                return { error: "LLM returned JSON but not in the expected list format." };
            }
        } catch (jsonError) {
            console.error(`Error: Failed to decode LLM response as JSON. Error: ${jsonError.message}`);
            console.error(`LLM Raw Output was:\n${llmOutputText}`);
            return { error: "LLM response was not valid JSON.", raw_output: llmOutputText };
        }

    } catch (error) {
        console.error(`Error interacting with ${service} model ${generationModelName}:`, error.message);
        // Include response details if available (e.g., from axios error)
        if (error.response && error.response.data) {
            console.error("API Error Response Data:", error.response.data);
        }
        return { error: `Could not get recommendations from ${service}: ${error.message}` };
    }
}
