import { AppError } from '../utils/AppError.js';

// Regla pura y testeable: nadie debe poder bloquearse a sí mismo ni dejar el sistema sin admin activo.
export function assertAdminUpdateAllowed({ id, actorId, target, nextRole, nextActive, activeAdminCount }) {
  const changesPermissions = nextRole !== target.role || nextActive !== target.active;
  if (Number(id) === Number(actorId) && changesPermissions) {
    throw new AppError(409, 'No puedes cambiar tu propio rol ni desactivar tu cuenta');
  }
  const currentlyActiveAdmin = target.role === 'admin' && target.active;
  const willRemainActiveAdmin = nextRole === 'admin' && nextActive;
  if (currentlyActiveAdmin && !willRemainActiveAdmin && activeAdminCount <= 1) {
    throw new AppError(409, 'Debe quedar al menos una cuenta administradora activa');
  }
}
