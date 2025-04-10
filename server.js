// server.js
require('dotenv').config(); // Load .env file first
const express = require('express');
const path = require('path');
const db = require('./db/database'); // Import db functions
const { loadAndPreprocessData } = require('./data_handling/dataLoader');
const indexRoutes = require('./routes/index'); // Import router

const app = express();
const PORT = process.env.PORT || 3000;

// --- Global Storage for Loaded Data ---
// In real apps, consider dependency injection or context instead of globals
let AppData = {
    customerMap: null,
    productMap: null,
    dbInstance: null // Store DB connection instance
};

// --- Middleware ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files
app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(express.json()); // Parse JSON body

// --- Initialization Function ---
async function initializeApp() {
    try {
        console.log("Initializing application...");
        // Init DB and store instance
        AppData.dbInstance = await db.initDb();
        console.log("Database connection established.");

        // Load data and store maps
        const { customerMap, productMap } = await loadAndPreprocessData();
        AppData.customerMap = customerMap;
        AppData.productMap = productMap;
        console.log("Customer and Product data loaded into memory.");

        // Pass loaded data/db to routes (using app.locals or middleware)
        // Simple approach: make it available via app.locals
        app.locals.appData = AppData;
        console.log("Data made available to routes.");

        // Mount routes AFTER data is loaded
        app.use('/', indexRoutes);
        console.log("Routes mounted.");

        // Start listening
        app.listen(PORT, '0.0.0.0', () => {   // Listen on 0.0.0.0
            console.log(`Server listening on port ${PORT}`);
            console.log("Application initialized successfully.");
        });

    } catch (error) {
        console.error("FATAL: Application failed to initialize:", error);
        process.exit(1); // Exit if critical initialization fails
    }
}

// --- Start Initialization ---
initializeApp();

// --- Optional Graceful Shutdown ---
process.on('SIGINT', async () => {
    console.log('\nCaught interrupt signal. Closing database connection...');
    try {
        await db.closeDb();
        process.exit(0);
    } catch (err) {
        console.error('Error closing database:', err);
        process.exit(1);
    }
});