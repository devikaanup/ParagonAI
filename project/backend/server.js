/**
 * Standalone Local API Server for The Panel
 * Runs on port 3001 and handles all /api/* requests.
 */

import http from 'http';
import dotenv from 'dotenv';
import { handler } from './api.js';

dotenv.config();

const PORT = process.env.PORT || 3001;

const server = http.createServer(async (req, res) => {
  const buffers = [];
  for await (const chunk of req) {
    buffers.push(chunk);
  }
  const bodyString = Buffer.concat(buffers).toString();

  const event = {
    httpMethod: req.method,
    path: req.url.split('?')[0],
    headers: req.headers,
    queryStringParameters: Object.fromEntries(new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams),
    body: bodyString
  };

  try {
    const result = await handler(event, {});
    res.writeHead(result.statusCode, result.headers);
    res.end(result.body);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`[The Panel API Server] Running on http://localhost:${PORT}`);
});
