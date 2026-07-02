// ============================================================================
// AegisLog-Analytics — AI Analysis Engine
// Gemini API integration + local rule-based threat analysis fallback
// ============================================================================

/**
 * Build a structured prompt for the Gemini API from metrics and parsed data.
 *
 * @param {object} metrics - Computed metrics object
 * @param {Array} parsedData - Array of parsed log entries
 * @returns {string} Prompt string
 */
export function buildPrompt(metrics, parsedData) {
  // Determine time range from data
  let timeRange = 'Unknown';
  if (parsedData.length > 0) {
    const timestamps = parsedData.map((e) => new Date(e.timestamp).getTime());
    const minTime = new Date(Math.min(...timestamps)).toISOString();
    const maxTime = new Date(Math.max(...timestamps)).toISOString();
    timeRange = `${minTime} to ${maxTime}`;
  }

  const topIPsText = metrics.topIPs
    .map((ip, i) => `  ${i + 1}. ${ip.ip} — ${ip.count} requests`)
    .join('\n');

  const statusText = metrics.statusDistribution
    .map((s) => `  - ${s.name}: ${s.value}`)
    .join('\n');

  const anomaliesText =
    metrics.anomalies.length > 0
      ? metrics.anomalies
          .map(
            (a, i) =>
              `  ${i + 1}. [${a.severity}] ${a.type}: ${a.description}`
          )
          .join('\n')
      : '  None detected';

  const endpointsText = metrics.topEndpoints
    .map((ep, i) => `  ${i + 1}. ${ep.endpoint} — ${ep.count} hits`)
    .join('\n');

  const prompt = `You are AegisAI, a cybersecurity intelligence analyst. Based on this network log distribution data, identify the top 3 traffic bottlenecks, potential security threats (like brute-force or DDoS patterns), or unusual patterns, and provide a clear executive business impact summary. Format your response in markdown with clear sections: ## Threat Assessment, ## Key Findings, ## Anomaly Details, ## Executive Summary, ## Recommended Actions.

=== LOG ANALYSIS DATA ===

Time Range: ${timeRange}

Overview:
  - Total Requests: ${metrics.totalRequests}
  - Unique IPs: ${metrics.uniqueIPs}
  - Error Rate: ${metrics.errorRate}%
  - Total Bandwidth: ${metrics.totalBandwidth} bytes
  - 4xx Errors: ${metrics.errorsByType['4xx']}
  - 5xx Errors: ${metrics.errorsByType['5xx']}

Method Distribution:
  - GET: ${metrics.methodDistribution.GET}
  - POST: ${metrics.methodDistribution.POST}
  - PUT: ${metrics.methodDistribution.PUT}
  - DELETE: ${metrics.methodDistribution.DELETE}
  - PATCH: ${metrics.methodDistribution.PATCH}

Top 10 IPs by Request Count:
${topIPsText}

Status Code Distribution:
${statusText}

Detected Anomalies:
${anomaliesText}

Top Endpoints:
${endpointsText}

=== END DATA ===

Provide a thorough, professional cybersecurity analysis.`;

  return prompt;
}

/**
 * Call the Google Gemini API to generate AI-powered insights.
 *
 * @param {string} prompt - The analysis prompt
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<string>} Generated insight text
 */
export async function callGeminiAPI(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(
      `Gemini API returned ${response.status}: ${errorBody}`
    );
  }

  const data = await response.json();

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini API returned an empty or unexpected response structure.');
  }

  return text;
}

/**
 * Generate AI-powered insights using Gemini API or local fallback.
 *
 * @param {object} metrics - Computed metrics object
 * @param {Array} parsedData - Array of parsed log entries
 * @param {string|null} apiKey - Optional Gemini API key
 * @returns {Promise<string>} Markdown-formatted insights
 */
export async function generateAIInsights(metrics, parsedData, apiKey = null) {
  if (apiKey && apiKey.trim().length > 0) {
    try {
      const prompt = buildPrompt(metrics, parsedData);
      const result = await callGeminiAPI(prompt, apiKey.trim());
      return result;
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local analysis:', err.message);
      // Fall through to local analysis
    }
  }

  return generateLocalInsights(metrics, parsedData);
}

/**
 * Sophisticated rule-based local analysis engine.
 * Generates a professional markdown threat assessment report without any API.
 *
 * @param {object} metrics - Computed metrics object
 * @param {Array} parsedData - Array of parsed log entries
 * @returns {string} Markdown-formatted report
 */
export function generateLocalInsights(metrics, parsedData) {
  // --- Determine time range ---
  let startTime = '';
  let endTime = '';
  let durationHours = 0;

  if (parsedData.length > 0) {
    const timestamps = parsedData.map((e) => new Date(e.timestamp).getTime());
    const minMs = Math.min(...timestamps);
    const maxMs = Math.max(...timestamps);
    startTime = new Date(minMs).toUTCString();
    endTime = new Date(maxMs).toUTCString();
    durationHours = ((maxMs - minMs) / (1000 * 60 * 60)).toFixed(1);
  }

  // --- Classify overall threat level ---
  const anomalyCount = metrics.anomalies.length;
  const hasCritical = metrics.anomalies.some((a) => a.severity === 'CRITICAL');
  const hasHigh = metrics.anomalies.some((a) => a.severity === 'HIGH');

  let classification = 'LOW';
  if (hasCritical || anomalyCount >= 5) classification = 'CRITICAL';
  else if (hasHigh || anomalyCount >= 3) classification = 'HIGH';
  else if (anomalyCount >= 1) classification = 'MEDIUM';

  const classEmoji =
    classification === 'CRITICAL'
      ? '🔴'
      : classification === 'HIGH'
      ? '🟠'
      : classification === 'MEDIUM'
      ? '🟡'
      : '🟢';

  // --- Build per-IP analytics ---
  const ipRequestMap = {};
  const ipMethodMap = {};
  const ipStatusMap = {};
  const ipEndpointMap = {};
  const ipTimestamps = {};

  for (const entry of parsedData) {
    const ip = entry.sourceIP;

    // Count requests
    ipRequestMap[ip] = (ipRequestMap[ip] || 0) + 1;

    // Track methods
    if (!ipMethodMap[ip]) ipMethodMap[ip] = {};
    ipMethodMap[ip][entry.method] = (ipMethodMap[ip][entry.method] || 0) + 1;

    // Track status codes
    if (!ipStatusMap[ip]) ipStatusMap[ip] = {};
    ipStatusMap[ip][entry.statusCode] = (ipStatusMap[ip][entry.statusCode] || 0) + 1;

    // Track endpoints
    if (!ipEndpointMap[ip]) ipEndpointMap[ip] = {};
    ipEndpointMap[ip][entry.endpoint] = (ipEndpointMap[ip][entry.endpoint] || 0) + 1;

    // Track timestamps
    if (!ipTimestamps[ip]) ipTimestamps[ip] = [];
    ipTimestamps[ip].push(new Date(entry.timestamp).getTime());
  }

  // --- Calculate requests per minute for each IP ---
  function getRequestsPerMinute(ip) {
    const ts = ipTimestamps[ip];
    if (!ts || ts.length < 2) return 0;
    const sorted = [...ts].sort((a, b) => a - b);
    const durationMin = (sorted[sorted.length - 1] - sorted[0]) / (1000 * 60);
    if (durationMin === 0) return ts.length;
    return parseFloat((ts.length / durationMin).toFixed(2));
  }

  // --- Calculate peak burst rate (max requests in any 1-minute window) ---
  function getPeakBurstRate(ip) {
    const ts = ipTimestamps[ip];
    if (!ts || ts.length < 2) return ts ? ts.length : 0;
    const sorted = [...ts].sort((a, b) => a - b);
    let maxCount = 0;
    for (let i = 0; i < sorted.length; i++) {
      let j = i;
      while (j < sorted.length && sorted[j] - sorted[i] <= 60000) j++;
      maxCount = Math.max(maxCount, j - i);
    }
    return maxCount;
  }

  // --- Generate threat analysis entries ---
  const threats = [];

  // Process anomalies into detailed threat descriptions
  const processedIPs = new Set();

  for (const anomaly of metrics.anomalies) {
    // Extract IP from anomaly description
    const ipMatch = anomaly.description.match(/IP\s+(\S+)/);
    const ip = ipMatch ? ipMatch[1] : null;

    if (anomaly.type === 'Potential DDoS' && ip && !processedIPs.has(`ddos-${ip}`)) {
      processedIPs.add(`ddos-${ip}`);
      const rpm = getRequestsPerMinute(ip);
      const peakBurst = getPeakBurstRate(ip);
      const totalReqs = ipRequestMap[ip] || 0;
      const topEps = ipEndpointMap[ip]
        ? Object.entries(ipEndpointMap[ip])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([ep, c]) => `${ep} (${c})`)
            .join(', ')
        : 'N/A';

      threats.push({
        severity: 'CRITICAL',
        type: 'DDoS / Volumetric Attack',
        source: ip,
        evidence: `This IP generated ${totalReqs} total requests with an average rate of ${rpm} req/min and a peak burst of ${peakBurst} requests within a single minute. Most targeted endpoints: ${topEps}.`,
        impact:
          'Sustained volumetric traffic at this rate can exhaust server resources, degrade response times for legitimate users, and potentially cause complete service outage. Load balancers and upstream infrastructure may also be affected.',
      });
    }

    if (anomaly.type === 'Brute Force' && ip && !processedIPs.has(`bf-${ip}`)) {
      processedIPs.add(`bf-${ip}`);
      const totalReqs = ipRequestMap[ip] || 0;
      const statusBreakdown = ipStatusMap[ip]
        ? Object.entries(ipStatusMap[ip])
            .map(([code, c]) => `${code}: ${c}`)
            .join(', ')
        : 'N/A';
      const failedLogins = Object.entries(ipEndpointMap[ip] || {})
        .filter(([ep]) => ep.includes('login'))
        .reduce((sum, [, c]) => sum + c, 0);

      threats.push({
        severity: 'HIGH',
        type: 'Brute Force Authentication Attack',
        source: ip,
        evidence: `This IP made ${failedLogins} requests to login endpoints out of ${totalReqs} total requests. Response status breakdown: ${statusBreakdown}. The high ratio of 401/403 responses indicates systematic credential guessing.`,
        impact:
          'Successful credential compromise could lead to unauthorized data access, privilege escalation, or lateral movement within the network. Even unsuccessful attempts may trigger account lockout policies, denying service to legitimate users.',
      });
    }

    if (anomaly.type === 'Vulnerability Scan' && ip && !processedIPs.has(`scan-${ip}`)) {
      processedIPs.add(`scan-${ip}`);
      const suspiciousEps = Object.entries(ipEndpointMap[ip] || {})
        .filter(([ep]) =>
          ['/.env', '/wp-admin', '/phpmyadmin'].some((s) => ep.includes(s))
        )
        .map(([ep, c]) => `${ep} (${c})`)
        .join(', ');

      threats.push({
        severity: 'HIGH',
        type: 'Vulnerability Scanning / Reconnaissance',
        source: ip,
        evidence: `This IP probed known sensitive paths: ${suspiciousEps || 'N/A'}. These targets are commonly scanned by automated tools seeking exposed configuration files, admin panels, and database management interfaces.`,
        impact:
          'Successful reconnaissance could reveal server configuration, database credentials, or administrative access points. This is often a precursor to a more targeted attack and indicates the server is being actively profiled.',
      });
    }

    if (anomaly.type === 'Traffic Anomaly' && ip && !processedIPs.has(`traffic-${ip}`)) {
      processedIPs.add(`traffic-${ip}`);
      const totalReqs = ipRequestMap[ip] || 0;
      const pct = ((totalReqs / metrics.totalRequests) * 100).toFixed(1);

      threats.push({
        severity: 'MEDIUM',
        type: 'Disproportionate Traffic Source',
        source: ip,
        evidence: `This single IP accounts for ${pct}% of all observed traffic (${totalReqs} of ${metrics.totalRequests} requests), far exceeding normal distribution patterns.`,
        impact:
          'A single source dominating traffic may indicate a compromised host, a misconfigured client, or an early-stage attack. This concentration creates a single point of failure for traffic analysis and may mask other threats.',
      });
    }

    if (anomaly.type === 'High Error Rate' && !processedIPs.has('error-rate')) {
      processedIPs.add('error-rate');
      threats.push({
        severity: 'MEDIUM',
        type: 'Elevated System Error Rate',
        source: 'System-wide',
        evidence: `The overall error rate is ${metrics.errorRate}% (4xx: ${metrics.errorsByType['4xx']}, 5xx: ${metrics.errorsByType['5xx']}). This exceeds the acceptable threshold of 20% and may indicate ongoing attacks, misconfigured services, or infrastructure instability.`,
        impact:
          'High error rates directly affect user experience and system reliability. Elevated 5xx errors suggest backend instability, while 4xx spikes may correlate with attack traffic or broken client integrations.',
      });
    }
  }

  // Sort threats by severity
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  threats.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));
  const topThreats = threats.slice(0, 5);

  // --- Peak traffic analysis ---
  let peakHour = { time: 'N/A', count: 0 };
  for (const entry of metrics.requestsOverTime) {
    if (entry.count > peakHour.count) {
      peakHour = entry;
    }
  }

  const avgRequestsPerHour =
    metrics.requestsOverTime.length > 0
      ? (
          metrics.requestsOverTime.reduce((sum, e) => sum + e.count, 0) /
          metrics.requestsOverTime.length
        ).toFixed(1)
      : 0;

  // --- Build endpoint load analysis ---
  const endpointAnalysis = metrics.topEndpoints
    .slice(0, 5)
    .map((ep) => {
      const pct = ((ep.count / metrics.totalRequests) * 100).toFixed(1);
      return `- **${ep.endpoint}**: ${ep.count} requests (${pct}% of total traffic)`;
    })
    .join('\n');

  // --- Build recommended actions ---
  const actions = [];
  let actionNum = 1;

  const ddosIPs = topThreats
    .filter((t) => t.type.includes('DDoS'))
    .map((t) => t.source);
  const bfIPs = topThreats
    .filter((t) => t.type.includes('Brute Force'))
    .map((t) => t.source);
  const scanIPs = topThreats
    .filter((t) => t.type.includes('Scanning'))
    .map((t) => t.source);
  const allMaliciousIPs = [...new Set([...ddosIPs, ...bfIPs, ...scanIPs])];

  if (allMaliciousIPs.length > 0) {
    actions.push(
      `${actionNum++}. **Immediate IP Blocking**: Block the following IPs at the firewall/WAF level: \`${allMaliciousIPs.join('`, `')}\`. These IPs show clear malicious activity patterns and pose an active threat.`
    );
  }

  if (ddosIPs.length > 0) {
    actions.push(
      `${actionNum++}. **Rate Limiting**: Implement aggressive rate limiting (max 30 requests per 5-minute window per IP) on all API endpoints. Consider implementing CAPTCHA challenges for IPs exceeding 50% of the rate limit threshold.`
    );
  }

  if (bfIPs.length > 0) {
    actions.push(
      `${actionNum++}. **Authentication Hardening**: Enforce account lockout after 5 consecutive failed login attempts. Implement multi-factor authentication (MFA) for all user accounts. Add progressive delays between failed login attempts.`
    );
  }

  if (scanIPs.length > 0) {
    actions.push(
      `${actionNum++}. **Attack Surface Reduction**: Ensure sensitive paths (/.env, /wp-admin, /phpmyadmin) return 404 rather than 403 to avoid information disclosure. Implement a Web Application Firewall (WAF) with rules to block common vulnerability scanning patterns.`
    );
  }

  if (metrics.errorsByType['5xx'] > 0) {
    actions.push(
      `${actionNum++}. **Server Stability**: Investigate the ${metrics.errorsByType['5xx']} server errors (5xx). Check application logs for stack traces, database connection pool exhaustion, or memory pressure. Consider horizontal scaling if errors correlate with traffic spikes.`
    );
  }

  actions.push(
    `${actionNum++}. **Enhanced Monitoring**: Deploy real-time alerting for: (a) any IP exceeding 30 requests in 5 minutes, (b) failed login rate exceeding 10/minute, (c) requests to honeypot endpoints (/.env, /wp-admin, /phpmyadmin), (d) 5xx error rate exceeding 5%.`
  );

  actions.push(
    `${actionNum++}. **Incident Response**: Document the identified threat IPs and patterns. Cross-reference with threat intelligence feeds (e.g., AbuseIPDB, Shodan). File abuse reports with the relevant ISPs for the most egregious offenders.`
  );

  // --- Build the threat analysis section ---
  let threatSection = '';
  if (topThreats.length === 0) {
    threatSection =
      'No significant threats detected in the current dataset. Continue monitoring.\n';
  } else {
    threatSection = topThreats
      .map(
        (t, i) => `### Threat #${i + 1}: ${t.type}
**Severity**: ${t.severity === 'CRITICAL' ? '🔴 CRITICAL' : t.severity === 'HIGH' ? '🟠 HIGH' : '🟡 MEDIUM'}
**Type**: ${t.type}
**Source**: \`${t.source}\`
**Evidence**: ${t.evidence}
**Impact**: ${t.impact}`
      )
      .join('\n\n');
  }

  // --- Compose Executive Summary ---
  const critCount = threats.filter((t) => t.severity === 'CRITICAL').length;
  const highCount = threats.filter((t) => t.severity === 'HIGH').length;

  let execSummary = '';
  if (classification === 'CRITICAL' || classification === 'HIGH') {
    execSummary = `The analyzed log data spanning ${durationHours} hours reveals **significant security concerns** requiring immediate attention. A total of ${metrics.totalRequests} requests from ${metrics.uniqueIPs} unique sources were processed, with an overall error rate of ${metrics.errorRate}%. The analysis identified ${anomalyCount} anomalies, including ${critCount} critical and ${highCount} high-severity threats.

The most pressing concern is the presence of ${allMaliciousIPs.length > 0 ? allMaliciousIPs.length : 'multiple'} IP address(es) exhibiting clear attack patterns, including ${ddosIPs.length > 0 ? 'volumetric flood attacks' : ''}${ddosIPs.length > 0 && bfIPs.length > 0 ? ', ' : ''}${bfIPs.length > 0 ? 'brute-force credential attacks' : ''}${(ddosIPs.length > 0 || bfIPs.length > 0) && scanIPs.length > 0 ? ', and ' : ''}${scanIPs.length > 0 ? 'active vulnerability reconnaissance' : ''}. These activities pose a direct risk to service availability, data confidentiality, and system integrity.

Immediate remediation actions should focus on IP-level blocking, rate limiting enforcement, and authentication hardening. A full incident response investigation is recommended to assess potential compromise and establish whether these are coordinated or independent attacks.`;
  } else if (classification === 'MEDIUM') {
    execSummary = `The analysis of ${metrics.totalRequests} requests over ${durationHours} hours from ${metrics.uniqueIPs} unique sources reveals a **moderate security posture** with some areas of concern. ${anomalyCount} anomaly(ies) were detected, primarily involving ${threats.map((t) => t.type).join(', ') || 'minor irregularities'}.

While no critical threats were identified, the detected patterns warrant further investigation and proactive measures. Enhanced monitoring and the implementation of recommended security controls will reduce the attack surface and improve the overall security posture.`;
  } else {
    execSummary = `The analysis of ${metrics.totalRequests} requests over ${durationHours} hours indicates a **healthy security posture**. Traffic from ${metrics.uniqueIPs} unique sources showed normal distribution patterns with an error rate of ${metrics.errorRate}%. No significant anomalies or active threats were detected. Continue routine monitoring and periodic security assessments to maintain this posture.`;
  }

  // --- Assemble the final report ---
  const report = `## 🔒 AegisAI Threat Assessment Report
**Analysis Period**: ${startTime} — ${endTime} (${durationHours} hours)
**Classification**: ${classEmoji} ${classification}
**Generated**: ${new Date().toUTCString()} (Local Analysis Engine)

---

## 📊 Key Findings
- **Total requests analyzed**: ${metrics.totalRequests.toLocaleString()}
- **Unique sources identified**: ${metrics.uniqueIPs}
- **Overall error rate**: ${metrics.errorRate}% (4xx: ${metrics.errorsByType['4xx']}, 5xx: ${metrics.errorsByType['5xx']})
- **Total bandwidth consumed**: ${(metrics.totalBandwidth / 1024 / 1024).toFixed(2)} MB
- **Anomalies detected**: ${anomalyCount}
- **Method breakdown**: GET ${metrics.methodDistribution.GET} | POST ${metrics.methodDistribution.POST} | PUT ${metrics.methodDistribution.PUT} | DELETE ${metrics.methodDistribution.DELETE} | PATCH ${metrics.methodDistribution.PATCH}

## 🚨 Threat Analysis

${threatSection}

## 📈 Traffic Bottleneck Analysis
- **Peak traffic hour**: ${peakHour.time} with ${peakHour.count} requests
- **Average requests per hour**: ${avgRequestsPerHour}
- **Top loaded endpoints**:
${endpointAnalysis}

## 💼 Executive Summary

${execSummary}

## ✅ Recommended Actions

${actions.join('\n\n')}
`;

  return report;
}
