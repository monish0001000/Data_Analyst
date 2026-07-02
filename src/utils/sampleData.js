// ============================================================================
// AegisLog-Analytics — Sample Data Generator
// Generates 500+ realistic server log entries in Apache/Nginx combined format
// Uses a seeded LCG PRNG for deterministic output
// ============================================================================

// --- Seeded Pseudorandom Number Generator (Linear Congruential Generator) ---
function createLCG(seed) {
  let state = seed;
  return function next() {
    // LCG parameters (Numerical Recipes)
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0x100000000;
  };
}

// --- Weighted random selection helper ---
function weightedRandom(rng, items, weights) {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let r = rng() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// --- IP Address Pools ---
const NORMAL_IPS = [
  '192.168.1.101', '10.0.0.25', '172.16.0.50', '192.168.2.200',
  '10.1.1.100', '172.16.5.30', '192.168.3.75', '10.0.2.150',
  '172.16.8.20', '192.168.4.15', '10.0.3.200', '172.16.10.5',
];

const SUSPICIOUS_IPS = [
  '45.33.32.156', '185.220.101.45', '23.129.64.100', '103.253.41.98',
];

// --- Endpoint Pool ---
const ENDPOINTS = [
  '/api/v1/login', '/api/v1/users', '/api/v1/dashboard', '/api/v1/reports',
  '/api/v1/settings', '/api/v1/auth/token', '/api/v1/logs',
  '/api/v1/admin/config', '/api/v1/health', '/api/v1/data/export',
  '/api/v1/uploads', '/api/v1/notifications', '/.env', '/wp-admin',
  '/phpmyadmin', '/api/v1/payments',
];

const SUSPICIOUS_ENDPOINTS = ['/.env', '/wp-admin', '/phpmyadmin'];
const BRUTE_FORCE_ENDPOINT = '/api/v1/login';

// --- HTTP Methods (weighted) ---
const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const METHOD_WEIGHTS = [60, 25, 8, 5, 2];

// --- Status Codes (weighted) ---
const STATUS_CODES = [200, 201, 301, 304, 400, 401, 403, 404, 500, 502, 503];
const STATUS_WEIGHTS = [55, 8, 5, 5, 5, 8, 4, 5, 3, 1, 1];

// Suspicious status codes (mostly auth failures)
const SUSPICIOUS_STATUS_CODES = [401, 403, 400, 200, 404];
const SUSPICIOUS_STATUS_WEIGHTS = [40, 30, 10, 5, 15];

// --- Month abbreviations for Apache log format ---
const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Format a Date object into Apache/Nginx combined log timestamp format:
 * DD/Mon/YYYY:HH:MM:SS +0000
 */
function formatApacheTimestamp(date) {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = MONTH_ABBR[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${day}/${month}/${year}:${hours}:${minutes}:${seconds} +0000`;
}

/**
 * Generates an array of 500+ realistic server log entry strings in
 * Apache/Nginx combined log format.
 *
 * @returns {string[]} Array of raw log line strings
 */
export function generateSampleLogs() {
  const rng = createLCG(42);
  const logs = [];
  const baseDate = new Date('2025-06-25T00:00:00Z');
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  let currentTimeMs = baseDate.getTime();
  const endTimeMs = baseDate.getTime() + sevenDaysMs;

  // --- Phase 1: Generate normal traffic entries (~400 entries) ---
  while (currentTimeMs < endTimeMs && logs.length < 400) {
    const ip = NORMAL_IPS[Math.floor(rng() * NORMAL_IPS.length)];
    const method = weightedRandom(rng, METHODS, METHOD_WEIGHTS);
    const endpoint = ENDPOINTS[Math.floor(rng() * ENDPOINTS.length)];
    const statusCode = weightedRandom(rng, STATUS_CODES, STATUS_WEIGHTS);

    // Bytes: larger for success, smaller for errors
    const isError = statusCode >= 400;
    const bytes = isError
      ? Math.floor(rng() * 401) + 100   // 100-500
      : Math.floor(rng() * 49801) + 200; // 200-50000

    const timestamp = formatApacheTimestamp(new Date(currentTimeMs));
    const line = `${ip} - - [${timestamp}] "${method} ${endpoint} HTTP/1.1" ${statusCode} ${bytes}`;
    logs.push({ time: currentTimeMs, line });

    // Normal interval: 1-300 seconds
    const intervalSec = Math.floor(rng() * 300) + 1;
    currentTimeMs += intervalSec * 1000;
  }

  // --- Phase 2: Generate suspicious burst traffic ---
  // Each suspicious IP gets multiple bursts across the 7-day window
  for (const suspiciousIP of SUSPICIOUS_IPS) {
    // Place 2-4 burst windows per suspicious IP across the 7 days
    const burstCount = Math.floor(rng() * 3) + 2;

    for (let b = 0; b < burstCount; b++) {
      // Pick a random start time within the 7-day window
      const burstStartMs = baseDate.getTime() + Math.floor(rng() * sevenDaysMs * 0.9);
      let burstTimeMs = burstStartMs;

      // Each burst: 15-40 rapid-fire requests
      const burstSize = Math.floor(rng() * 26) + 15;

      for (let i = 0; i < burstSize; i++) {
        let method, endpoint, statusCode;

        const attackType = rng();

        if (attackType < 0.45) {
          // Brute force: POST to /api/v1/login with auth failure
          method = 'POST';
          endpoint = BRUTE_FORCE_ENDPOINT;
          statusCode = weightedRandom(rng, SUSPICIOUS_STATUS_CODES, SUSPICIOUS_STATUS_WEIGHTS);
        } else if (attackType < 0.70) {
          // Vulnerability scanning
          method = 'GET';
          endpoint = SUSPICIOUS_ENDPOINTS[Math.floor(rng() * SUSPICIOUS_ENDPOINTS.length)];
          statusCode = weightedRandom(rng, [403, 404, 401, 400], [35, 30, 25, 10]);
        } else {
          // General flood / DDoS-style requests
          method = weightedRandom(rng, METHODS, METHOD_WEIGHTS);
          endpoint = ENDPOINTS[Math.floor(rng() * ENDPOINTS.length)];
          statusCode = weightedRandom(rng, SUSPICIOUS_STATUS_CODES, SUSPICIOUS_STATUS_WEIGHTS);
        }

        const isError = statusCode >= 400;
        const bytes = isError
          ? Math.floor(rng() * 401) + 100
          : Math.floor(rng() * 49801) + 200;

        const timestamp = formatApacheTimestamp(new Date(burstTimeMs));
        const line = `${suspiciousIP} - - [${timestamp}] "${method} ${endpoint} HTTP/1.1" ${statusCode} ${bytes}`;
        logs.push({ time: burstTimeMs, line });

        // Suspicious interval: 1-5 seconds between entries (burst pattern)
        const intervalSec = Math.floor(rng() * 5) + 1;
        burstTimeMs += intervalSec * 1000;
      }
    }
  }

  // --- Phase 3: Add some additional normal entries to ensure 500+ total ---
  currentTimeMs = baseDate.getTime() + Math.floor(rng() * sevenDaysMs * 0.5);
  while (logs.length < 550) {
    const ip = NORMAL_IPS[Math.floor(rng() * NORMAL_IPS.length)];
    const method = weightedRandom(rng, METHODS, METHOD_WEIGHTS);
    const endpoint = ENDPOINTS[Math.floor(rng() * ENDPOINTS.length)];
    const statusCode = weightedRandom(rng, STATUS_CODES, STATUS_WEIGHTS);

    const isError = statusCode >= 400;
    const bytes = isError
      ? Math.floor(rng() * 401) + 100
      : Math.floor(rng() * 49801) + 200;

    const timestamp = formatApacheTimestamp(new Date(currentTimeMs));
    const line = `${ip} - - [${timestamp}] "${method} ${endpoint} HTTP/1.1" ${statusCode} ${bytes}`;
    logs.push({ time: currentTimeMs, line });

    const intervalSec = Math.floor(rng() * 300) + 1;
    currentTimeMs += intervalSec * 1000;
    // Wrap around if we exceed 7 days
    if (currentTimeMs > endTimeMs) {
      currentTimeMs = baseDate.getTime() + Math.floor(rng() * sevenDaysMs * 0.3);
    }
  }

  // --- Sort all entries chronologically and return just the line strings ---
  logs.sort((a, b) => a.time - b.time);
  return logs.map((entry) => entry.line);
}

/**
 * Returns all sample logs joined as a single newline-delimited text block.
 * @returns {string}
 */
export function getSampleLogsAsText() {
  return generateSampleLogs().join('\n');
}
