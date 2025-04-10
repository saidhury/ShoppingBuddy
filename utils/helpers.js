// utils/helpers.js - WORKAROUND for Python repr format (Use with caution!)
function safeParseList(str) {
    if (!str || typeof str !== 'string') return [];
    str = str.trim();
    // Basic check for Python list format
    if (str.startsWith('[') && str.endsWith(']')) {
        try {
            // Remove brackets, split by comma, trim whitespace and quotes
            const items = str.slice(1, -1)
                             .split(',')
                             .map(item => item.trim().replace(/^['"]|['"]$/g, '')) // Remove leading/trailing quotes
                             .filter(item => item.length > 0);
            return items;
        } catch (e) {
            console.error(`Error parsing Python-like list string: ${str.substring(0,50)}...`, e.message);
            return [];
        }
    }
    // Fallback if not in expected format
    return [];
}

module.exports = { safeParseList };