const config = require('../config/recommenderConfig');
// const _ = require('lodash');


function selectCandidateProducts(customerId, customerMap, productMap) {
    console.log(`\n--- Selecting Candidates for ${customerId} (Filtering) ---`);
    const maxCandidates = config.MAX_CANDIDATES_TO_LLM;

    const customerData = customerMap.get(customerId);
    if (!customerData) {
        console.error(`Error: Customer data not found for ${customerId}.`);
        return [];
    }

    const allProducts = Array.from(productMap.values());

    // 1. Identify Interested Categories
    const interestedItems = new Set([
        ...(customerData[config.CUST_BROWSING_COL] || []),
        ...(customerData[config.CUST_PURCHASE_COL] || [])
    ]);

    let interestedMainCategories = new Set();
    interestedItems.forEach(item => {
        const mainCat = String(item).split(':')[0].trim();
        if (mainCat) interestedMainCategories.add(mainCat)
    })

    let potentialCandidates = [];

    // 2. Filter by Category (Primary Filter)
    if (interestedMainCategories.size > 0) {
        potentialCandidates = allProducts.filter(prod => {
            const prodMainCat = String(prod[config.PROD_CATEGORY_COL] || '').split(':')[0].trim();
            return interestedMainCategories.has(prodMainCat);
        });
        console.log(`Found ${potentialCandidates.length} potential candidates matching categories: ${[...interestedMainCategories].join(', ')}`);
    }

    // 3. Fallback if no category matches
    if (potentialCandidates.length === 0) {
        console.log("No category matches found. Falling back to top-rated products.");
        potentialCandidates = [...allProducts] // Create a mutable copy
            .sort((a, b) => (b[config.PROD_RATING_COL] || 0) - (a[config.PROD_RATING_COL] || 0))
            .slice(0, maxCandidates * 2); // Get more initially for potential filtering later
                                          // Adjust multiplier as needed
        if (potentialCandidates.length === 0) {
             console.warn("Warning: No products available for fallback.")
             return []; // No products at all
        }
    }

    // 4. Exclude Recently Purchased (using Product ID if available)
    const purchasedItemsSet = new Set(customerData[config.CUST_PURCHASE_COL] || []);
    const possiblePurchasedIds = new Set();
    purchasedItemsSet.forEach(item => {
         if (typeof item === 'string' && productMap.has(item)) { // Check if item looks like an ID and exists
             possiblePurchasedIds.add(item);
         }
    });

    let filteredCandidates = [];
    if (possiblePurchasedIds.size > 0) {
        filteredCandidates = potentialCandidates.filter(prod =>
            !possiblePurchasedIds.has(prod[config.PROD_ID_COL])
        );
        console.log(`Excluded ${potentialCandidates.length - filteredCandidates.length} purchased items.`);
    } else {
        filteredCandidates = potentialCandidates; // No purchase history to filter by
    }


    // 5. Optional: Sort by Season Match (Give priority)
    const customerSeason = customerData[config.CUST_SEASON_COL];
    if (customerSeason) {
        filteredCandidates.sort((a, b) => {
            const aMatchesSeason = a[config.PROD_SEASON_COL] === customerSeason;
            const bMatchesSeason = b[config.PROD_SEASON_COL] === customerSeason;

            if (aMatchesSeason && !bMatchesSeason) {
                return -1; // a comes first
            } else if (!aMatchesSeason && bMatchesSeason) {
                return 1;  // b comes first
            } else {
                // If both match season or both don't, sort by rating (desc) as secondary criteria
                return (b[config.PROD_RATING_COL] || 0) - (a[config.PROD_RATING_COL] || 0);
            }
        });
        console.log("Sorted candidates prioritizing season match and rating.");
    } else {
         // If no customer season, just sort by rating
         filteredCandidates.sort((a, b) => (b[config.PROD_RATING_COL] || 0) - (a[config.PROD_RATING_COL] || 0));
         console.log("Sorted candidates by rating.");
    }


    // 6. Final Limit
    const finalCandidates = filteredCandidates.slice(0, maxCandidates);
    console.log(`Selected ${finalCandidates.length} final candidate products.`);
    return finalCandidates; // Return array of product objects
}

module.exports = { selectCandidateProducts };

