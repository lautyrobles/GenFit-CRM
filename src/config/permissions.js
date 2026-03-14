export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  CLIENTE: 'CLIENTE'
};

export const PERMISOS = {
  VER_DASHBOARD: 'VER_DASHBOARD',
  VER_CLIENTES: 'VER_CLIENTES',
  MODIFICAR_CLIENTES: 'MODIFICAR_CLIENTES', // Crear, Editar, Alertas
  VER_PAGOS: 'VER_PAGOS',
  GESTIONAR_PAGOS: 'GESTIONAR_PAGOS',
  VER_MOVIMIENTOS: 'VER_MOVIMIENTOS',
  GESTIONAR_PERMISOS: 'GESTIONAR_PERMISOS'
};

// Mapa de qué puede hacer cada rol
const MAPA_PERMISOS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISOS), // Tiene TODO
  [ROLES.ADMIN]: Object.values(PERMISOS),       // Tiene TODO
  [ROLES.SUPERVISOR]: [
    PERMISOS.VER_DASHBOARD,
    PERMISOS.VER_CLIENTES,
    PERMISOS.VER_PAGOS,
    PERMISOS.MODIFICAR_CLIENTES,
    PERMISOS.GESTIONAR_PAGOS
    // Nota: NO tiene modificar ni movimientos
  ],
};

export const tienePermiso = (rol, permiso) => {
  return MAPA_PERMISOS[rol]?.includes(permiso) || false;
};