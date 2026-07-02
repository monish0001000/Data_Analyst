// ============================================================================
// AegisLog-Analytics — ETL Parser
// Extract, Transform, Load pipeline for server log files
// Supports Apache/Nginx combined log format (.log/.txt) and JSON (.json)
// ============================================================================

// --- Apache/Nginx Combined Log Format Regex ---
const APACHE_LOG_REGEX =
  /^(\S+)\s+-\s+-\s+\[(.+?)\]\s+"(\w+)\s+(\S+)\s+HTTP\/[\d.]+"\s+(\d+)\s+(\d+)/;

// --- Apache timestamp month lookup ---
const MONTH_MAP = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/**
 * Parse Apache timestamp format: DD/Mon/YYYY:HH:MM:SS +ZZZZ
 * into ISO 8601 string.
 */
function parseApacheTimestamp(raw) {
  // Example: 25/Jun/2025:14:32:07 +0000
  const match = raw.match(
    /^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s+([+-]\d{4})$/
  );
  if (!match) return null;

  const [, day, monthStr, year, hours, minutes, seconds, tz] = match;
  const month = MONTH_MAP[monthStr];
  if (month === undefined) return null;

  // Parse timezone offset
  const tzSign = tz[0] === '+' ? 1 : -1;
  const tzHours = parseInt(tz.slice(1, 3), 10);
  const tzMinutes = parseInt(tz.slice(3, 5), 10);
  const tzOffsetMs = tzSign * (tzHours * 60 + tzMinutes) * 60 * 1000;

  const date = new Date(
    Date.UTC(
      parseInt(year, 10),
      month,
      parseInt(day, 10),
      parseInt(hours, 10),
      parseInt(minutes, 10),
      parseInt(seconds, 10)
    ) - tzOffsetMs
  );

  return date.toISOString();
}

/**
 * Categorize an HTTP status code into a human-readable category.
 */
function categorizeStatus(code) {
  if (code >= 100 && code <= 399) return 'Success';
  if (code >= 400 && code <= 499) return 'Client Error';
  if (code >= 500 && code <= 599) return 'Server Error';
  return 'Success';
}

/**
 * Parse a single Apache/Nginx combined log line into a structured entry.
 * Returns null if the line cannot be parsed.
 */
function parseApacheLine(line) {
  const match = line.match(APACHE_LOG_REGEX);
  if (!match) return null;

  const [, sourceIP, rawTimestamp, method, endpoint, statusStr, bytesStr] = match;

  const timestamp = parseApacheTimestamp(rawTimestamp);
  if (!timestamp) return null;

  const statusCode = parseInt(statusStr, 10);
  const bytes = parseInt(bytesStr, 10);

  if (isNaN(statusCode) || isNaN(bytes)) return null;

  return {
    id: 0, // assigned later
    timestamp,
    sourceIP: sourceIP.trim(),
    method: method.toUpperCase(),
    endpoint: endpoint.trim(),
    statusCode,
    statusCategory: categorizeStatus(statusCode),
    bytes,
  };
}

/**
 * Resolve a field value from an object with flexible key mapping.
 * Supports both camelCase and snake_case variants.
 */
function resolveField(obj, ...keys) {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

/**
 * Parse a single JSON log object into a structured entry.
 * Handles both camelCase and snake_case field names.
 */
function parseJsonEntry(obj) {
  const sourceIP = resolveField(obj, 'sourceIP', 'source_ip', 'ip', 'client_ip', 'clientIP', 'remote_addr', 'remoteAddr');
  const timestamp = resolveField(obj, 'timestamp', 'time', 'date', 'datetime', 'date_time');
  const method = resolveField(obj, 'method', 'http_method', 'httpMethod', 'request_method', 'requestMethod');
  const endpoint = resolveField(obj, 'endpoint', 'path', 'url', 'uri', 'request_path', 'requestPath', 'request_uri', 'requestUri');
  const statusCode = resolveField(obj, 'statusCode', 'status_code', 'status', 'http_status', 'httpStatus', 'response_code', 'responseCode');
  const bytes = resolveField(obj, 'bytes', 'size', 'body_bytes_sent', 'bodyBytesSent', 'content_length', 'contentLength', 'response_size', 'responseSize');

  if (!sourceIP || !timestamp || !method || !endpoint || statusCode === undefined) {
    return null;
  }

  const parsedStatus = parseInt(statusCode, 10);
  const parsedBytes = parseInt(bytes, 10) || 0;

  if (isNaN(parsedStatus)) return null;

  // Normalize timestamp — if it's already ISO, keep it; otherwise try to parse
  let isoTimestamp;
  if (typeof timestamp === 'string' && timestamp.includes('/') && timestamp.includes(':')) {
    // Attempt Apache format parse
    isoTimestamp = parseApacheTimestamp(timestamp);
    if (!isoTimestamp) {
      // Try native Date parsing
      const d = new Date(timestamp);
      isoTimestamp = isNaN(d.getTime()) ? null : d.toISOString();
    }
  } else {
    const d = new Date(timestamp);
    isoTimestamp = isNaN(d.getTime()) ? null : d.toISOString();
  }

  if (!isoTimestamp) return null;

  return {
    id: 0,
    timestamp: isoTimestamp,
    sourceIP: String(sourceIP).trim(),
    method: String(method).toUpperCase(),
    endpoint: String(endpoint).trim(),
    statusCode: parsedStatus,
    statusCategory: categorizeStatus(parsedStatus),
    bytes: parsedBytes,
  };
}

// ============================================================================
// MAIN EXPORTED FUNCTIONS
// ============================================================================

/**
 * Parse raw log text into structured log entries.
 *
 * @param {string} rawText - Raw file contents
 * @param {string} fileType - File extension: 'log', 'txt', or 'json'
 * @returns {{ parsedData: Array, errors: string[] }}
 */
export function parseLogFile(rawText, fileType = 'log') {
  const parsedData = [];
  const errors = [];
  let idCounter = 1;

  const normalizedType = (fileType || 'log').toLowerCase().replace('.', '');

  if (normalizedType === 'json') {
    // --- JSON Format Parsing ---
    try {
      let jsonData = JSON.parse(rawText);

      // Handle both array and single-object input
      if (!Array.isArray(jsonData)) {
        jsonData = [jsonData];
      }

      for (let i = 0; i < jsonData.length; i++) {
        const entry = parseJsonEntry(jsonData[i]);
        if (entry) {
          entry.id = idCounter++;
          parsedData.push(entry);
        } else {
          errors.push(`JSON entry at index ${i} could not be parsed: ${JSON.stringify(jsonData[i]).slice(0, 120)}`);
        }
      }
    } catch (e) {
      errors.push(`Failed to parse JSON: ${e.message}`);
    }
  } else {
    // --- Apache/Nginx Combined Log Format Parsing (.log / .txt) ---
    const lines = rawText.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // skip empty lines

      const entry = parseApacheLine(line);
      if (entry) {
        entry.id = idCounter++;
        parsedData.push(entry);
      } else {
        errors.push(`Line ${i + 1}: Failed to parse: "${line.slice(0, 120)}"`);
      }
    }
  }

  return { parsedData, errors };
}

/**
 * Compute comprehensive metrics from parsed log data.
 *
 * @param {Array} parsedData - Array of parsed log entry objects
 * @returns {object} Metrics object
 */
export function computeMetrics(parsedData) {
  if (!parsedData || parsedData.length === 0) {
    return {
      totalRequests: 0,
      uniqueIPs: 0,
      errorRate: 0,
      totalBandwidth: 0,
      requestsOverTime: [],
      topIPs: [],
      statusDistribution: [],
      anomalies: [],
      methodDistribution: { GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0 },
      topEndpoints: [],
      errorsByType: { '4xx': 0, '5xx': 0 },
    };
  }

  const totalRequests = parsedData.length;

  // --- Unique IPs ---
  const ipCounts = {};
  for (const entry of parsedData) {
    ipCounts[entry.sourceIP] = (ipCounts[entry.sourceIP] || 0) + 1;
  }
  const uniqueIPs = Object.keys(ipCounts).length;

  // --- Error rate ---
  let errorCount = 0;
  let count4xx = 0;
  let count5xx = 0;
  for (const entry of parsedData) {
    if (entry.statusCode >= 400) {
      errorCount++;
      if (entry.statusCode < 500) count4xx++;
      else count5xx++;
    }
  }
  const errorRate = parseFloat(((errorCount / totalRequests) * 100).toFixed(2));

  // --- Total bandwidth ---
  let totalBandwidth = 0;
  for (const entry of parsedData) {
    totalBandwidth += entry.bytes;
  }

  // --- Method distribution ---
  const methodDistribution = { GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0 };
  for (const entry of parsedData) {
    if (methodDistribution.hasOwnProperty(entry.method)) {
      methodDistribution[entry.method]++;
    }
  }

  // --- Requests over time (grouped by hour) ---
  const hourBuckets = {};
  for (const entry of parsedData) {
    const d = new Date(entry.timestamp);
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hour = String(d.getUTCHours()).padStart(2, '0');
    const key = `${month}/${day} ${hour}:00`;
    hourBuckets[key] = (hourBuckets[key] || 0) + 1;
  }
  const requestsOverTime = Object.entries(hourBuckets)
    .map(([time, count]) => ({ time, count }))
    .sort((a, b) => a.time.localeCompare(b.time));

  // --- Top IPs (top 10 by count, descending) ---
  const topIPs = Object.entries(ipCounts)
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // --- Status distribution (grouped by category) ---
  const statusCategoryCounts = {};
  for (const entry of parsedData) {
    statusCategoryCounts[entry.statusCategory] =
      (statusCategoryCounts[entry.statusCategory] || 0) + 1;
  }
  const STATUS_COLORS = {
    'Success': '#00F0FF',
    'Client Error': '#BD00FF',
    'Server Error': '#FF0055',
  };
  const statusDistribution = Object.entries(statusCategoryCounts).map(
    ([name, value]) => ({
      name,
      value,
      color: STATUS_COLORS[name] || '#888888',
    })
  );

  // --- Top Endpoints (top 10 by count, descending) ---
  const endpointCounts = {};
  for (const entry of parsedData) {
    endpointCounts[entry.endpoint] = (endpointCounts[entry.endpoint] || 0) + 1;
  }
  const topEndpoints = Object.entries(endpointCounts)
    .map(([endpoint, count]) => ({ endpoint, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // --- Errors by type ---
  const errorsByType = { '4xx': count4xx, '5xx': count5xx };

  // --- Anomaly Detection ---
  const anomalies = [];

  // 1. DDoS Detection: IPs with >30 requests in any 5-minute window
  const ipTimestamps = {};
  for (const entry of parsedData) {
    if (!ipTimestamps[entry.sourceIP]) ipTimestamps[entry.sourceIP] = [];
    ipTimestamps[entry.sourceIP].push(new Date(entry.timestamp).getTime());
  }

  const ddosIPs = new Set();
  for (const [ip, timestamps] of Object.entries(ipTimestamps)) {
    const sorted = [...timestamps].sort((a, b) => a - b);
    const fiveMinMs = 5 * 60 * 1000;
    for (let i = 0; i < sorted.length; i++) {
      let windowEnd = i;
      while (windowEnd < sorted.length && sorted[windowEnd] - sorted[i] <= fiveMinMs) {
        windowEnd++;
      }
      const windowCount = windowEnd - i;
      if (windowCount > 30) {
        ddosIPs.add(ip);
        break;
      }
    }
  }
  for (const ip of ddosIPs) {
    anomalies.push({
      type: 'Potential DDoS',
      description: `IP ${ip} made over 30 requests within a 5-minute window (total: ${ipCounts[ip]} requests)`,
      severity: 'CRITICAL',
    });
  }

  // 2. Brute Force: IPs with >10 failed login attempts (POST to */login* with 401/403)
  const bruteForceMap = {};
  for (const entry of parsedData) {
    if (
      entry.method === 'POST' &&
      entry.endpoint.includes('login') &&
      (entry.statusCode === 401 || entry.statusCode === 403)
    ) {
      bruteForceMap[entry.sourceIP] = (bruteForceMap[entry.sourceIP] || 0) + 1;
    }
  }
  for (const [ip, count] of Object.entries(bruteForceMap)) {
    if (count > 10) {
      anomalies.push({
        type: 'Brute Force',
        description: `IP ${ip} had ${count} failed login attempts (POST to login endpoint with 401/403)`,
        severity: 'HIGH',
      });
    }
  }

  // 3. Vulnerability Scan: Requests to suspicious endpoints
  const SUSPICIOUS_PATHS = ['/.env', '/wp-admin', '/phpmyadmin'];
  const scannerIPs = {};
  for (const entry of parsedData) {
    if (SUSPICIOUS_PATHS.some((p) => entry.endpoint.includes(p))) {
      scannerIPs[entry.sourceIP] = (scannerIPs[entry.sourceIP] || 0) + 1;
    }
  }
  for (const [ip, count] of Object.entries(scannerIPs)) {
    anomalies.push({
      type: 'Vulnerability Scan',
      description: `IP ${ip} made ${count} request(s) to suspicious endpoints (/.env, /wp-admin, /phpmyadmin)`,
      severity: 'HIGH',
    });
  }

  // 4. High Error Rate
  if (errorRate > 20) {
    anomalies.push({
      type: 'High Error Rate',
      description: `Overall error rate is ${errorRate}%, exceeding the 20% threshold (${errorCount} errors out of ${totalRequests} requests)`,
      severity: 'MEDIUM',
    });
  }

  // 5. Traffic Anomaly: Any IP contributing >15% of total traffic
  for (const [ip, count] of Object.entries(ipCounts)) {
    const percentage = (count / totalRequests) * 100;
    if (percentage > 15) {
      anomalies.push({
        type: 'Traffic Anomaly',
        description: `IP ${ip} accounts for ${percentage.toFixed(1)}% of total traffic (${count} of ${totalRequests} requests)`,
        severity: 'MEDIUM',
      });
    }
  }

  return {
    totalRequests,
    uniqueIPs,
    errorRate,
    totalBandwidth,
    requestsOverTime,
    topIPs,
    statusDistribution,
    anomalies,
    methodDistribution,
    topEndpoints,
    errorsByType,
  };
}

/**
 * Format a byte count into a human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return '-' + formatBytes(-bytes);

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const index = Math.min(i, units.length - 1);
  const value = bytes / Math.pow(k, index);

  return `${parseFloat(value.toFixed(2))} ${units[index]}`;
}

/**
 * Format a number with commas as thousands separators.
 * @param {number} num
 * @returns {string}
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
