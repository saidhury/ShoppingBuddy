// db/database.js
const sqlite3 = require('sqlite3').verbose(); // Use verbose for more detailed errors
const config = require('../config/recommenderConfig');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '..', config.DB_NAME); // Ensure correct path from project root

let db = null; // Hold the connection globally within this module

/**
 * Initializes the SQLite database connection and creates tables.
 * Returns a Promise that resolves with the db instance or rejects on error.
 */
function initDb() {
    return new Promise((resolve, reject) => {
        // Ensure directory exists (though '.' usually does)
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
            if (err) {
                console.error("DB Connection Error:", err.message);
                return reject(new Error(`DB Connection Error: ${err.message}`));
            }
            console.log('Connected to the SQLite database.');

            db.run(`CREATE TABLE IF NOT EXISTS customer_profiles (
                        customer_id TEXT PRIMARY KEY,
                        profile_summary TEXT,
                        last_updated TEXT
                    )`, (err) => {
                if (err) {
                    console.error("DB Table Creation Error:", err.message);
                    db.close(); // Close connection on error
                    return reject(new Error(`DB Table Creation Error: ${err.message}`));
                }
                console.log("Database initialized (tables checked/created).");
                resolve(db); // Resolve with the db instance
            });
        });
    });
}

/**
 * Gets the database instance. Initializes if not already done.
 * SHOULD ONLY BE CALLED AFTER initDb has successfully resolved in server.js
 */
function getDb() {
    if (!db) {
        // This scenario ideally shouldn't happen if initDb is awaited in server.js
        console.error("CRITICAL: getDb called before database was initialized!");
        // You might throw an error or attempt re-initialization depending on strategy
        throw new Error("Database not initialized");
    }
    return db;
}

/**
 * Fetches profile summary from DB.
 * Returns a Promise resolving with the profile string or null.
 */
function getProfileFromDb(customerId) {
    const currentDb = getDb(); // Get the initialized DB instance
    return new Promise((resolve, reject) => {
        const sql = `SELECT profile_summary FROM customer_profiles WHERE customer_id = ?`;
        currentDb.get(sql, [customerId], (err, row) => {
            if (err) {
                console.error(`DB read error for ${customerId}:`, err.message);
                // Resolve with null, don't reject the whole request usually
                resolve(null);
            } else {
                resolve(row ? row.profile_summary : null);
            }
        });
    });
}

/**
 * Saves or updates profile summary in DB.
 * Returns a Promise resolving with true on success, false on failure.
 */
function saveProfileToDb(customerId, profileSummary) {
    const currentDb = getDb();
    return new Promise((resolve) => { // Don't typically reject for save failure
        const now = new Date().toISOString();
        const sql = `INSERT OR REPLACE INTO customer_profiles (customer_id, profile_summary, last_updated)
                     VALUES (?, ?, ?)`;
        currentDb.run(sql, [customerId, profileSummary, now], function(err) { // Use function() for this.changes
            if (err) {
                console.error(`DB write error for ${customerId}:`, err.message);
                resolve(false); // Indicate failure
            } else {
                // console.log(`Profile for ${customerId} saved/updated. Rows affected: ${this.changes}`);
                resolve(true); // Indicate success
            }
        });
    });
}

/**
 * Closes the database connection.
 * Returns a Promise.
 */
function closeDb() {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err) => {
                if (err) {
                    console.error("DB Close Error:", err.message);
                    return reject(err);
                }
                console.log("Database connection closed.");
                db = null; // Clear reference
                resolve();
            });
        } else {
            resolve(); // Already closed or never opened
        }
    });
}


module.exports = {
    initDb,
    getDb, // Export if needed elsewhere, but prefer passing the instance
    getProfileFromDb,
    saveProfileToDb,
    closeDb,
};