// src/utils/gymLogic.js

/**
 * 1. Determina el estado actual del cliente basado en su fecha de vencimiento
 */
export const obtenerEstadoCuota = (dueDate) => {
  if (!dueDate) return 'NO ACTIVO';

  const hoy = new Date();
  // Normalizamos las fechas para no renegar con las horas
  hoy.setHours(0, 0, 0, 0); 
  const vencimiento = new Date(dueDate);
  vencimiento.setHours(0, 0, 0, 0);

  // Calculamos la diferencia en días
  const diferenciaTiempo = hoy.getTime() - vencimiento.getTime();
  const diasPasados = Math.floor(diferenciaTiempo / (1000 * 3600 * 24));

  if (diasPasados <= 0) {
    return 'ACTIVO'; // Aún no vence
  } else if (diasPasados > 0 && diasPasados <= 5) {
    return 'RETRASO'; // Venció hace 1 a 5 días
  } else {
    return 'NO ACTIVO'; // Pasaron más de 5 días
  }
};

/**
 * 2. Calcula el próximo vencimiento cuando el cliente paga
 */
export const calcularNuevoVencimiento = (dueDateActual) => {
  const estado = obtenerEstadoCuota(dueDateActual);
  const nuevoVencimiento = new Date();

  if (estado === 'ACTIVO' || estado === 'RETRASO') {
    // Si está al día o en los 5 días de gracia: 
    // Le sumamos 30 días a su vencimiento ORIGINAL.
    // (Así los días de retraso se le descuentan del mes nuevo)
    const vencimientoOriginal = new Date(dueDateActual);
    nuevoVencimiento.setTime(vencimientoOriginal.getTime() + (30 * 24 * 60 * 60 * 1000));
  } else {
    // Si es un cliente nuevo o estaba NO ACTIVO (pasó la tolerancia):
    // El mes nuevo arranca desde HOY.
    nuevoVencimiento.setTime(new Date().getTime() + (30 * 24 * 60 * 60 * 1000));
  }

  return nuevoVencimiento.toISOString();
};