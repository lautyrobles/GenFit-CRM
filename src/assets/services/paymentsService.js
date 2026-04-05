import { supabase } from "./supabaseClient";

export const obtenerPagos = async (gymId) => {
  try {
    if (!gymId) throw new Error("Gym ID es requerido");
    const { data, error } = await supabase
      .from('payments')
      .select(`
        id, amount, payment_date, payment_method, status, notes, created_at,
        users (id, first_name, last_name, dni, email, plans (name))
      `)
      .eq('gym_id', gymId)
      .order('payment_date', { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al obtener pagos:", error.message);
    throw error;
  }
};

export const registrarPago = async (pagoData, gymId) => {
  try {
    const userIdFinal = pagoData.clienteId || pagoData.user_id;
    const monto = pagoData.montoFinal || pagoData.amount;
    const hoyISO = new Date().toISOString().split('T')[0];
    
    if (!userIdFinal || !gymId) throw new Error("Datos insuficientes.");

    // 1. Pago
    const { data: paymentData, error: pErr } = await supabase
      .from('payments')
      .insert([{
          user_id: userIdFinal,
          amount: Number(monto),
          payment_date: new Date().toISOString(), 
          gym_id: gymId
      }]).select().single();

    if (pErr) throw pErr;

    // 2. Suscripción
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, due_date')
      .eq('user_id', userIdFinal)
      .maybeSingle();

    // 🎯 LÓGICA DE HIERRO:
    let puntoDePartida = hoyISO;

    // SI TIENE SUSCRIPCIÓN Y NO ESTÁ VENCIDA: sumamos desde su vencimiento actual
    if (sub?.due_date && sub.due_date > hoyISO) {
        puntoDePartida = sub.due_date;
    }

    // Calculamos el vencimiento (Punto de partida + 30 días exactos)
    const calculo = new Date(puntoDePartida + "T12:00:00");
    calculo.setDate(calculo.getDate() + 30);
    const nuevaFechaISO = calculo.toISOString().split('T')[0];

    // Delay RLS
    if (!sub) await new Promise(r => setTimeout(r, 1000));

    if (sub?.id) {
        const { error: uErr } = await supabase.from('subscriptions')
          .update({ due_date: nuevaFechaISO, active: true, gym_id: gymId })
          .eq('id', sub.id);
        if (uErr) throw uErr;
    } else {
        const { error: iErr } = await supabase.from('subscriptions')
          .insert([{
              user_id: userIdFinal, 
              plan_id: pagoData.plan_id || null, 
              start_date: hoyISO, 
              due_date: nuevaFechaISO, 
              active: true, 
              gym_id: gymId
          }]);
        if (iErr) throw iErr;
    }

    await supabase.from('users').update({ enabled: true }).eq('id', userIdFinal);
    return paymentData;

  } catch (error) {
    throw error;
  }
};