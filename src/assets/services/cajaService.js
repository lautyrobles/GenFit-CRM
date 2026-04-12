import { supabase } from './supabaseClient';

/* =========================================
   📉 REGISTRAR UN EGRESO (En system_logs)
   ========================================= */
export const registrarEgreso = async (monto, categoria, descripcion, userId) => {
  try {
    const { data, error } = await supabase
      .from('system_logs')
      .insert({
        module: 'CAJA', // Módulo de donde viene
        action: 'EGRESO_EFECTIVO', // Acción específica
        details: descripcion,
        monto: parseFloat(monto),
        categoria: categoria,
        user_id: userId
      });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("❌ Error registrando egreso:", error);
    return { success: false, error };
  }
};

/* =========================================
   ⚖️ OBTENER BALANCE REAL DEL DÍA (EFECTIVO)
   ========================================= */
export const obtenerBalanceDelDia = async () => {
  try {
    // Calculamos inicio y fin del día actual local
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 1. OBTENER INGRESOS (Solo EFECTIVO desde la tabla payments)
    const { data: pagos, error: errPagos } = await supabase
      .from('payments')
      .select('amount')
      .eq('payment_method', 'EFECTIVO')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString());

    if (errPagos) throw errPagos;

    // 2. OBTENER EGRESOS (Solo dinero retirado hoy desde system_logs)
    const { data: egresos, error: errEgresos } = await supabase
      .from('system_logs')
      .select('monto')
      .eq('action', 'EGRESO_EFECTIVO')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString());

    if (errEgresos) throw errEgresos;

    // Sumamos todos los ingresos y egresos
    const totalIngresos = pagos.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
    const totalEgresos = egresos.reduce((acc, e) => acc + parseFloat(e.monto || 0), 0);

    // El balance esperado en caja física
    const totalEsperado = totalIngresos - totalEgresos;

    return { success: true, totalEsperado };
  } catch (error) {
    console.error("❌ Error obteniendo balance:", error);
    return { success: false, totalEsperado: 0 };
  }
};

/* =========================================
   🔒 REGISTRAR CIERRE DE CAJA
   ========================================= */
export const registrarCierre = async (montoDeclarado, montoEsperado, userId) => {
  try {
    const diferencia = parseFloat(montoDeclarado) - parseFloat(montoEsperado);
    
    // Guardamos el historial del cierre
    const { data, error } = await supabase
      .from('cierres_caja')
      .insert({
        usuario_id: userId,
        monto_declarado: parseFloat(montoDeclarado),
        monto_esperado: parseFloat(montoEsperado), 
        diferencia: diferencia
      });

    if (error) throw error;

    // Dejamos un log para que el Admin lo vea en la sección Movimientos
    await supabase.from('system_logs').insert({
      module: 'CAJA',
      action: 'CIERRE_CAJA',
      details: `Arqueo finalizado. Físico: $${montoDeclarado} | Diferencia: $${diferencia}`,
      user_id: userId
    });

    return { success: true, data };
  } catch (error) {
    console.error("❌ Error en cierre de caja:", error);
    return { success: false, error };
  }
};