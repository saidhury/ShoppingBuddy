const db = require('../db/database');
const config = require('../config/recommenderConfig');


/**
 * Agent 1: Gets profile from DB or generates and saves it.
 * Returns a Promise resolving with profile string or error string.
 */
async function getCustomerProfile(customerId, customerMap) { // Removed db instance, uses module directly
    // 1. Check DB
    const profileFromDb = await db.getProfileFromDb(customerId);
    if (profileFromDb) {
        console.log(`Profile found in DB for ${customerId}.`);
        return profileFromDb
    }

    // 2. Check if customer exists in loaded data
    const customerData = customerMap.get(customerId);
    if (!customerData) {
        return `Error: Customer ID ${customerId} not found in loaded data.`;
    }

    // 3. Generate Profile String
    console.log(`Generating profile for ${customerId}...`);
    let profileSummary = `Customer Profile for ${customerId}:\n`; // Use let
    profileSummary += `- Age: ${customerData[config.CUST_AGE_COL] || 'N/A'}\n`;
    profileSummary += `- Gender: ${customerData[config.CUST_GENDER_COL] || 'N/A'}\n`;
    profileSummary += `- Location: ${customerData[config.CUST_LOCATION_COL] || 'N/A'}\n`;
    profileSummary += `- Segment: ${customerData[config.CUST_SEGMENT_COL] || 'N/A'}\n`;
    profileSummary += `- Avg Order Value: ${customerData[config.CUST_AVG_ORDER_COL] || 'N/A'}\n`;
    profileSummary += `- Prefers Holiday Shopping: ${customerData[config.CUST_HOLIDAY_COL] || 'N/A'}\n`;
    profileSummary += `- Active Season: ${customerData[config.CUST_SEASON_COL] || 'N/A'}\n`;

    const browsing = customerData[config.CUST_BROWSING_COL] || [];
    const purchase = customerData[config.CUST_PURCHASE_COL] || [];
    profileSummary += `- Recently Browsed: ${browsing.slice(0, 5).join(', ')}...\n` ;
    profileSummary += `- Recently Purchased: ${purchase.slice(0, 5).join(', ')}...\n`;

    // 4. Save to DB (async but don't necessarily wait for save before returning profile)
    db.saveProfileToDb(customerId, profileSummary)
      .then(success => {
          if (success) console.log(`Profile for ${customerId} save initiated.`);
      });
      // Note: Errors logged within saveProfileToDb

    return profileSummary; // Return generated profile immediately
}

module.exports = { getCustomerProfile };
