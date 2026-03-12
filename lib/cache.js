const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(process.cwd(), 'public', 'eczaneler-cache.json');
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Reads cached data from file
 * @returns {Object|null} Cached data or null if not found
 */
function getCachedData() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const content = fs.readFileSync(CACHE_FILE, 'utf-8');
      const cacheData = JSON.parse(content);

      if (cacheData && cacheData.timestamp && cacheData.data && cacheData.ilceler) {
        return cacheData;
      }
    }
  } catch (error) {
    console.error('Cache read error:', error.message);
  }
  return null;
}

/**
 * Checks if cache is valid (less than 24 hours old)
 * @returns {boolean} True if cache exists and is fresh
 */
function isCacheValid() {
  try {
    const cacheData = getCachedData();
    if (!cacheData || !cacheData.timestamp) {
      return false;
    }

    const now = Date.now();
    const age = now - cacheData.timestamp;
    return age < CACHE_TTL;
  } catch (error) {
    console.error('Cache validation error:', error.message);
    return false;
  }
}

/**
 * Writes data to cache file with timestamp
 * @param {Object} data - Eczaneler grouped by "Ankara" -> district -> array
 * @param {Array} ilceler - Array of district names
 */
function setCachedData(data, ilceler) {
  try {
    const cacheData = {
      timestamp: Date.now(),
      data: data,
      ilceler: ilceler
    };

    // Ensure public directory exists
    const publicDir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf-8');
  } catch (error) {
    console.error('Cache write error:', error.message);
  }
}

/**
 * Clears the cache file
 */
function clearCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
    }
  } catch (error) {
    console.error('Cache clear error:', error.message);
  }
}

module.exports = {
  getCachedData,
  isCacheValid,
  setCachedData,
  clearCache
};

