import { supabase } from './supabaseClient';

/* =========================================
   📉 REGISTRAR UN EGRESO (En system_logs)
   ========================================= */
export const registrarEgreso = async (monto, categoria, descripcion, userId) => {
  try {
    const { data, error } = await supabase
      .from('system_logs')
      .insert({
        module: 'CAJA', 
        action: 'EGRESO_EFECTIVO', 
        details: descripcion,
        monto: parseFloat(monto),
        categoria: categoria,
        user_id: userId // system_logs usualmente no es tan estricto con las foreign keys
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
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const { data: pagos, error: errPagos } = await supabase
      .from('payments')
      .select('amount')
      .eq('payment_method', 'EFECTIVO')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString());

    if (errPagos) throw errPagos;

    const { data: egresos, error: errEgresos } = await supabase
      .from('system_logs')
      .select('monto')
      .eq('action', 'EGRESO_EFECTIVO')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString());

    if (errEgresos) throw errEgresos;

    const totalIngresos = pagos.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
    const totalEgresos = egresos.reduce((acc, e) => acc + parseFloat(e.monto || 0), 0);
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
/* =========================================
   🔒 REGISTRAR CIERRE DE CAJA
   ========================================= */
export const registrarCierre = async (montoDeclarado, montoEsperado, userId) => {
  try {
    const diferencia = parseFloat(montoDeclarado) - parseFloat(montoEsperado);
    
    // Inserción limpia y directa (ahora la DB lo aceptará sin problemas)
    const { data, error } = await supabase
      .from('cierres_caja')
      .insert({
        usuario_id: userId,
        monto_declarado: parseFloat(montoDeclarado),
        monto_esperado: parseFloat(montoEsperado), 
        diferencia: diferencia,
        fecha_cierre: new Date().toISOString()
      });

    if (error) throw error;

    // Dejamos un log para la sección de Movimientos
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