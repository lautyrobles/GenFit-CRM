import { supabase } from './supabaseClient';

export const registrarEgreso = async (monto, categoria, descripcion, userId, gymId) => {
  try {
    const { data, error } = await supabase
      .from('system_logs')
      .insert({
        module: 'CAJA',
        action: 'EGRESO_EFECTIVO',
        details: descripcion,
        monto: parseFloat(monto),
        categoria: categoria,
        user_id: userId,
        gym_id: gymId
      });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("❌ Error registrando egreso:", error);
    return { success: false, error };
  }
};

export const obtenerBalanceDelDia = async (gymId) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);

    const { data: pagos } = await supabase
      .from('payments')
      .select('amount')
      .eq('gym_id', gymId)
      .eq('payment_method', 'EFECTIVO')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    const { data: egresos } = await supabase
      .from('system_logs')
      .select('monto')
      .eq('gym_id', gymId)
      .eq('action', 'EGRESO_EFECTIVO')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    const totalIngresos = pagos?.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0) || 0;
    const totalEgresos = egresos?.reduce((acc, e) => acc + parseFloat(e.monto || 0), 0) || 0;

    return { success: true, totalEsperado: totalIngresos - totalEgresos };
  } catch (error) {
    return { success: false, totalEsperado: 0 };
  }
};

export const registrarCierre = async (montoDeclarado, montoEsperado, userId, gymId) => {
  try {
    const diferencia = parseFloat(montoDeclarado) - parseFloat(montoEsperado);
    
    const { data, error } = await supabase
      .from('cierres_caja')
      .insert({
        usuario_id: userId,
        monto_declarado: parseFloat(montoDeclarado),
        monto_esperado: parseFloat(montoEsperado), 
        diferencia: diferencia,
        gym_id: gymId
      });

    if (error) throw error;

    await supabase.from('system_logs').insert({
      module: 'CAJA',
      action: 'CIERRE_CAJA',
      details: `Arqueo finalizado. Físico: $${montoDeclarado} | Diferencia: $${diferencia}`,
      user_id: userId,
      gym_id: gymId
    });

    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
};