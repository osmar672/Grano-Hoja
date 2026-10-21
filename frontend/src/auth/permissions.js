export const ROLE = Object.freeze({
  ADMIN: 'admin',
  MANAGER: 'encargado',
  CASHIER: 'caja',
});

const permissions = Object.freeze({
  adminPanel: [ROLE.ADMIN],
  manageCatalog: [ROLE.ADMIN, ROLE.MANAGER],
  deleteCatalog: [ROLE.ADMIN],
  purchaseAssistant: [ROLE.ADMIN, ROLE.MANAGER],
  operateOrders: [ROLE.ADMIN, ROLE.MANAGER, ROLE.CASHIER],
});

export function can(user, permission) {
  return Boolean(user && permissions[permission]?.includes(user.role));
}
