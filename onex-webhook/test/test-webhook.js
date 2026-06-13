/**
 * ─────────────────────────────────────────────────────────────────────
 * Quick Local Test — Simulates a 99acres webhook payload
 * ─────────────────────────────────────────────────────────────────────
 * Usage:
 *   1. Start the server:  npm run dev
 *   2. In another terminal: node test/test-webhook.js
 * ─────────────────────────────────────────────────────────────────────
 */

const http = require('http');

const payload = JSON.stringify({
  name: 'Rahul Sharma',
  phone: '9876543210',
  email: 'rahul.sharma@example.com',
  property: '3 BHK Apartment in Lodha Palava',
  budget: '₹1.2 Cr',
  location: 'Dombivli East, Mumbai',
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/99acres-webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
};

console.log('Sending test webhook payload…\n');

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    try {
      console.log('Response:', JSON.stringify(JSON.parse(body), null, 2));
    } catch {
      console.log('Response:', body);
    }
  });
});

req.on('error', (err) => {
  console.error('Request failed:', err.message);
  console.error('Is the server running? (npm run dev)');
});

req.write(payload);
req.end();
