import test from 'node:test';
import assert from 'node:assert/strict';
import { csrfProtection, csrfTokenMatches } from '../src/middleware/csrfProtection.js';

function mockResponse() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; },
  };
}

test('CSRF compara tokens de forma segura y rechaza valores ausentes o distintos', () => {
  assert.equal(csrfTokenMatches('token-aleatorio', 'token-aleatorio'), true);
  assert.equal(csrfTokenMatches('token-aleatorio', 'otro-token'), false);
  assert.equal(csrfTokenMatches('token-aleatorio', undefined), false);
  assert.equal(csrfTokenMatches('', ''), false);
});

test('CSRF deja pasar métodos de solo lectura sin token', () => {
  let nextCalled = false;
  csrfProtection({ method: 'GET', get: () => undefined }, mockResponse(), () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('CSRF rechaza una mutación sin token', () => {
  const res = mockResponse();
  csrfProtection({ method: 'POST', get: () => undefined, session: {} }, res, () => assert.fail('No debe continuar'));
  assert.equal(res.statusCode, 403);
  assert.match(res.payload.error, /Token CSRF/);
});

test('CSRF rechaza un Origin que no está en la lista blanca', () => {
  const previous = process.env.CORS_ORIGIN;
  process.env.CORS_ORIGIN = 'http://localhost:5173';
  try {
    const res = mockResponse();
    const req = { method: 'DELETE', get: (name) => name.toLowerCase() === 'origin' ? 'https://sitio-malicioso.example' : 'token-valido', session: { csrfToken: 'token-valido' } };
    csrfProtection(req, res, () => assert.fail('No debe continuar'));
    assert.equal(res.statusCode, 403);
    assert.match(res.payload.error, /Origen no autorizado/);
  } finally {
    if (previous === undefined) delete process.env.CORS_ORIGIN;
    else process.env.CORS_ORIGIN = previous;
  }
});

test('CSRF permite mutación con token válido y Origin permitido', () => {
  const previous = process.env.CORS_ORIGIN;
  process.env.CORS_ORIGIN = 'http://localhost:5173';
  try {
    let nextCalled = false;
    const req = { method: 'POST', get: (name) => ({ origin: 'http://localhost:5173', 'x-csrf-token': 'token-valido', 'sec-fetch-site': 'same-origin' })[name.toLowerCase()], session: { csrfToken: 'token-valido' } };
    csrfProtection(req, mockResponse(), () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  } finally {
    if (previous === undefined) delete process.env.CORS_ORIGIN;
    else process.env.CORS_ORIGIN = previous;
  }
});
