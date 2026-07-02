import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We will generate 50,000 records per file to create a very large dataset
const NUM_RECORDS = 50000;

const normalIPs = [
  '10.0.1.15', '10.0.2.42', '10.0.1.108', '10.0.3.7', 
  '192.168.1.101', '192.168.1.200', '172.16.0.50', '10.1.1.100'
];
const attackIPs = ['185.220.101.45', '45.33.32.156', '23.129.64.100', '103.253.41.98'];
const endpoints = [
  '/api/v1/dashboard', '/api/v1/users', '/api/v1/settings', 
  '/api/v1/reports', '/api/v1/data/export', '/api/v1/health'
];
const attackEndpoints = ['/api/v1/auth/login', '/.env', '/wp-admin', '/phpmyadmin'];

// Helper for Apache date format: DD/Mon/YYYY:HH:MM:SS +0000
function formatApacheDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(date.getDate())}/${months[date.getMonth()]}/${date.getFullYear()}:${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} +0000`;
}

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

let currentTime = new Date('2026-07-01T00:00:00Z').getTime();

function generateLog(isJson, index) {
    // 15% probability of attack traffic
    const isAttack = Math.random() < 0.15; 
    const ip = isAttack ? randomItem(attackIPs) : randomItem(normalIPs);
    let method, endpoint, status, bytes;
    
    if (isAttack) {
        const attackType = Math.random();
        if (attackType < 0.6) {
            // Credential Stuffing / Brute Force
            method = 'POST';
            endpoint = '/api/v1/auth/login';
            status = randomItem([401, 403]);
            bytes = Math.floor(Math.random() * 50) + 300; // ~320 bytes
        } else if (attackType < 0.8) {
            // Vulnerability Scanning
            method = 'GET';
            endpoint = randomItem(['/.env', '/wp-admin', '/phpmyadmin']);
            status = 404;
            bytes = Math.floor(Math.random() * 20) + 100; // ~120 bytes
        } else {
            // Error spike / Resource exhaustion
            method = 'GET';
            endpoint = '/api/v1/data/export';
            status = 500;
            bytes = 512;
        }
    } else {
        // Normal Traffic
        method = randomItem(['GET', 'GET', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
        endpoint = randomItem(endpoints);
        status = Math.random() < 0.95 ? (method === 'POST' ? 201 : 200) : randomItem([400, 404, 503]);
        bytes = Math.floor(Math.random() * 50000) + 500;
    }
    
    // Increment time sequentially but with some bursts for realism
    const timeDeltaMs = (isAttack && index % 10 !== 0) ? Math.floor(Math.random() * 500) : Math.floor(Math.random() * 10000);
    currentTime += timeDeltaMs;
    const d = new Date(currentTime);
    
    if (isJson) {
        return {
            sourceIP: ip,
            timestamp: d.toISOString(),
            method,
            endpoint,
            statusCode: status,
            bytes
        };
    } else {
        return `${ip} - - [${formatApacheDate(d)}] "${method} ${endpoint} HTTP/1.1" ${status} ${bytes}`;
    }
}

// Generate files sequentially to avoid holding too much in memory
console.log("Generating Test.log (50,000 lines)...");
let logStream = fs.createWriteStream(path.join(__dirname, 'Test.log'));
for (let i = 0; i < NUM_RECORDS; i++) {
    logStream.write(generateLog(false, i) + '\n');
}
logStream.end();

console.log("Generating Test.txt (50,000 lines)...");
currentTime = new Date('2026-07-08T00:00:00Z').getTime(); // Start another week for txt
let txtStream = fs.createWriteStream(path.join(__dirname, 'Test.txt'));
for (let i = 0; i < NUM_RECORDS; i++) {
    txtStream.write(generateLog(false, i) + '\n');
}
txtStream.end();

console.log("Generating Test.json (50,000 objects)...");
currentTime = new Date('2026-07-15T00:00:00Z').getTime();
let jsonRecords = [];
for (let i = 0; i < NUM_RECORDS; i++) {
    jsonRecords.push(generateLog(true, i));
}
fs.writeFileSync(path.join(__dirname, 'Test.json'), JSON.stringify(jsonRecords, null, 2));

console.log("Large dataset generation complete! (150,000 total records)");
