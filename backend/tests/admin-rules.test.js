import test from 'node:test';
import assert from 'node:assert/strict';
import { assertAdminUpdateAllowed } from '../src/services/adminRules.js';

test('no permite que un administrador cambie su propio rol o estado', () => {
  assert.throws(() => assertAdminUpdateAllowed({
    id: 1, actorId: 1, target: { role: 'admin', active: true },
    nextRole: 'encargado', nextActive: true, activeAdminCount: 2,
  }), { status: 409 });
  assert.throws(() => assertAdminUpdateAllowed({
    id: 1, actorId: 1, target: { role: 'admin', active: true },
    nextRole: 'admin', nextActive: false, activeAdminCount: 2,
  }), { status: 409 });
});

test('protege la última cuenta administradora activa', () => {
  assert.throws(() => assertAdminUpdateAllowed({
    id: 8, actorId: 1, target: { role: 'admin', active: true },
    nextRole: 'encargado', nextActive: true, activeAdminCount: 1,
  }), { status: 409 });
  assert.throws(() => assertAdminUpdateAllowed({
    id: 8, actorId: 1, target: { role: 'admin', active: true },
    nextRole: 'admin', nextActive: false, activeAdminCount: 1,
  }), { status: 409 });
});

test('permite cambiar otro usuario cuando sigue existiendo un administrador activo', () => {
  assert.doesNotThrow(() => assertAdminUpdateAllowed({
    id: 8, actorId: 1, target: { role: 'admin', active: true },
    nextRole: 'encargado', nextActive: true, activeAdminCount: 2,
  }));
  assert.doesNotThrow(() => assertAdminUpdateAllowed({
    id: 9, actorId: 1, target: { role: 'caja', active: true },
    nextRole: 'encargado', nextActive: false, activeAdminCount: 1,
  }));
});
