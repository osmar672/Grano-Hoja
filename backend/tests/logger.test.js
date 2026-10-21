import test from 'node:test';
import assert from 'node:assert/strict';
import { createLogEntry } from '../src/utils/logger.js';

test('logger conserva campos permitidos para auditoría y correlación', () => {
  const entry = createLogEntry('info', 'audit.product.updated', {
    requestId: 'request-123', actorId: '17', role: 'admin',
    action: 'update', resourceType: 'product', resourceId: '91', outcome: 'success',
  });
  assert.equal(entry.event, 'audit.product.updated');
  assert.equal(entry.requestId, 'request-123');
  assert.equal(entry.actorId, '17');
  assert.equal(entry.resourceId, '91');
  assert.equal(entry.role, 'admin');
});

test('logger descarta contraseñas, tokens, correos, cuerpos y mensajes libres', () => {
  const entry = createLogEntry('error', 'http.request_failed', {
    requestId: 'req-1', statusCode: 500,
    email: 'persona@example.com', password: 'no-loguear', token: 'secret-token',
    authorization: 'Bearer secret-token', body: { password: 'no-loguear' },
    message: 'DATABASE_URL=postgresql://user:pass@host/db',
    error: { stack: 'secret stack' },
  });
  const serialized = JSON.stringify(entry);
  assert.equal(entry.requestId, 'req-1');
  assert.equal(entry.statusCode, 500);
  for (const secret of ['persona@example.com', 'no-loguear', 'secret-token', 'DATABASE_URL', 'secret stack']) {
    assert.equal(serialized.includes(secret), false);
  }
});

test('logger rechaza valores categóricos mal formados', () => {
  const entry = createLogEntry('notice', 'test event!', {
    role: 'admin\nforged', method: 'GET\nPOST', errorCode: '23505;token',
  });
  assert.equal(entry.level, 'info');
  assert.equal(entry.event, 'testevent');
  assert.equal('role' in entry, false);
  assert.equal('method' in entry, false);
  assert.equal('errorCode' in entry, false);
});
