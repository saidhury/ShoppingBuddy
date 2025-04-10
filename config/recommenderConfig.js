require('dotenv').config();

const config = {
    // --- Service Configuration ---
    DEFAULT_LLM_SERVICE: process.env.LLM_SERVICE || 'ollama',
    GEMINI_API_KEY_ENV_VAR: 'GOOGLE_API_KEY',
    OLLAMA_API_URL: process.env.OLLAMA_API_URL || 'http://localhost:11434',

    // --- Model Lists ---
    AVAILABLE_OLLAMA_MODELS: [  ],
    AVAILABLE_GEMINI_MODELS: [ 'gemini-1.5-flash'],

    // --- File Paths & DB ---
    CUSTOMER_DATA_FILE: './data/customer_data_collection.csv', // Relative to project root
    PRODUCT_DATA_FILE: './data/product_recommendation_data.csv',
    DB_NAME: './hackathon_memory.db', // Use relative path

    // --- Column Names ---
    // Customer
    CUST_ID_COL: 'Customer_ID', CUST_AGE_COL: 'Age', CUST_GENDER_COL: 'Gender',
    CUST_LOCATION_COL: 'Location', CUST_BROWSING_COL: 'Browsing_History',
    CUST_PURCHASE_COL: 'Purchase_History', CUST_SEGMENT_COL: 'Customer_Segment',
    CUST_AVG_ORDER_COL: 'Avg_Order_Value', CUST_HOLIDAY_COL: 'Holiday', CUST_SEASON_COL: 'Season',
    // Product
    PROD_ID_COL: 'Product_ID', PROD_CATEGORY_COL: 'Category', PROD_SUBCATEGORY_COL: 'Subcategory',
    PROD_PRICE_COL: 'Price', PROD_BRAND_COL: 'Brand', PROD_AVG_SIMILAR_RATING_COL: 'Average_Rating_of_Similar_Products',
    PROD_RATING_COL: 'Product_Rating', PROD_SENTIMENT_COL: 'Customer_Review_Sentiment_Score',
    PROD_HOLIDAY_COL: 'Holiday', PROD_SEASON_COL: 'Season', PROD_GEOGRAPHY_COL: 'Geographical_Location',
    PROD_SIMILAR_COL: 'Similar_Product_List', PROD_PROBABILITY_COL: 'Probability_of_Recommendation',

    // --- Candidate Selection ---
    MAX_CANDIDATES_TO_LLM: 30,
    MAX_CANDIDATE_DETAILS_IN_PROMPT: 15,

    // --- Gemini API Configuration Flag ---
    GEMINI_CONFIGURED: false // Will be set during initialization
};

module.exports = config; // Export the config object
