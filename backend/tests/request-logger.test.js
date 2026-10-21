import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { requestLogger } from '../src/middleware/requestLogger.js';

test('requestLogger asigna un ID nuevo y registra ruta sin query ni datos del body', () => {
  const req = {
    method: 'GET',
    path: '/api/productos',
    originalUrl: '/api/productos?q=persona%40example.com',
    baseUrl: '/api/productos',
    route: { path: '/' },
    body: { password: 'must-not-log' },
  };
  const res = new EventEmitter();
  const headers = {};
  res.statusCode = 200;
  res.setHeader = (name, value) => { headers[name] = value; };
  let nextCalled = false;
  let output = '';
  const originalWrite = process.stdout.write;
  try {
    process.stdout.write = (chunk) => { output += String(chunk); return true; };
    requestLogger(req, res, () => { nextCalled = true; });
    res.emit('finish');
  } finally {
    process.stdout.write = originalWrite;
  }
  assert.equal(nextCalled, true);
  assert.match(req.requestId, /^[0-9a-f-]{36}$/i);
  assert.equal(headers['X-Request-Id'], req.requestId);
  assert.match(output, /http\.request_completed/);
  assert.match(output, /\/api\/productos\//);
  assert.equal(output.includes('persona@example.com'), false);
  assert.equal(output.includes('must-not-log'), false);
  assert.equal(output.includes('?q='), false);
});
