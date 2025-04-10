// data_handling/dataLoader.js
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const config = require('../config/recommenderConfig');
const { safeParseList } = require('../utils/helpers');

/**
 * Loads and preprocesses CSV data.
 * Returns a Promise resolving with { customerMap, productMap }.
 */
function loadAndPreprocessData() {
    console.log("Starting data loading...");
    const customerData = [];
    const productData = [];

    const customerPromise = new Promise((resolve, reject) => {
        fs.createReadStream(path.resolve(__dirname, '..', config.CUSTOMER_DATA_FILE))
            .pipe(csv())
            .on('data', (row) => customerData.push(row))
            .on('end', () => {
                console.log(`Customer CSV (${config.CUSTOMER_DATA_FILE}) processed.`);
                resolve(customerData);
            })
            .on('error', (error) => {
                console.error(`Error reading customer CSV: ${error.message}`);
                reject(new Error(`Failed to read customer data: ${error.message}`));
            });
    });

    const productPromise = new Promise((resolve, reject) => {
         fs.createReadStream(path.resolve(__dirname, '..', config.PRODUCT_DATA_FILE))
            .pipe(csv())
            .on('data', (row) => productData.push(row))
            .on('end', () => {
                console.log(`Product CSV (${config.PRODUCT_DATA_FILE}) processed.`);
                resolve(productData);
            })
            .on('error', (error) => {
                 console.error(`Error reading product CSV: ${error.message}`);
                 reject(new Error(`Failed to read product data: ${error.message}`));
            });
    });

    // Wait for both files to be read
    return Promise.all([customerPromise, productPromise])
        .then(([rawCustomers, rawProducts]) => {
            console.log("Preprocessing data...");

            // Process Customers into a Map for fast lookup
            const customerMap = new Map();
            rawCustomers.forEach(cust => {
                const customerId = cust[config.CUST_ID_COL];
                if (!customerId) return; // Skip rows without ID

                // Preprocess list columns
                cust[config.CUST_BROWSING_COL] = safeParseList(cust[config.CUST_BROWSING_COL]);
                cust[config.CUST_PURCHASE_COL] = safeParseList(cust[config.CUST_PURCHASE_COL]);
                // Convert numeric potentially
                cust[config.CUST_AVG_ORDER_COL] = parseFloat(cust[config.CUST_AVG_ORDER_COL]) || 0;
                cust[config.CUST_AGE_COL] = parseInt(cust[config.CUST_AGE_COL], 10) || null;

                customerMap.set(customerId, cust);
            });

            // Process Products into a Map
            const productMap = new Map();
            rawProducts.forEach(prod => {
                const productId = prod[config.PROD_ID_COL];
                if (!productId) return;

                // Preprocess list column
                prod[config.PROD_SIMILAR_COL] = safeParseList(prod[config.PROD_SIMILAR_COL]);
                // Preprocess numeric columns
                prod[config.PROD_RATING_COL] = parseFloat(prod[config.PROD_RATING_COL]) || 0;
                prod[config.PROD_PRICE_COL] = parseFloat(prod[config.PROD_PRICE_COL]) || 0;
                // Add other numeric conversions as needed

                productMap.set(productId, prod);
            });

            console.log(`Data preprocessed: ${customerMap.size} customers, ${productMap.size} products.`);
            return { customerMap, productMap }; // Return maps
        });
}

module.exports = { loadAndPreprocessData };