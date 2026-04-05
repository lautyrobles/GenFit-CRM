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
  let paymentIdGenerado = null; // Guardamos el ID del pago por si hay que borrarlo

  try {
    const userIdFinal = pagoData.clienteId || pagoData.user_id;
    const monto = pagoData.montoFinal || pagoData.amount;
    
    if (!userIdFinal || !gymId) throw new Error("Datos insuficientes.");

    // --- PASO 1: REGISTRO DEL PAGO ---
    const { data: paymentData, error: pErr } = await supabase
      .from('payments')
      .insert([{
          user_id: userIdFinal,
          amount: Number(monto),
          payment_date: new Date().toISOString(), 
          gym_id: gymId
      }]).select().single();

    if (pErr) throw new Error(`Error registrando el pago: ${pErr.message}`);
    
    // Guardamos el ID del pago exitoso
    paymentIdGenerado = paymentData.id;

    // --- PASO 2: SUSCRIPCIÓN ---
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, due_date')
      .eq('user_id', userIdFinal)
      .maybeSingle();

    const hoyStr = new Date().toISOString().split('T')[0];
    const hoy = new Date(hoyStr + "T12:00:00");
    let fechaBase = new Date(hoy);

    if (sub && sub.due_date) {
      const vencimientoAnterior = new Date(sub.due_date + "T12:00:00");
      const limiteGracia = new Date(vencimientoAnterior);
      limiteGracia.setDate(limiteGracia.getDate() + 5);

      if (hoy <= limiteGracia) {
        fechaBase = new Date(vencimientoAnterior);
      }
    }

    fechaBase.setDate(fechaBase.getDate() + 30);
    const nuevaFechaISO = fechaBase.toISOString().split('T')[0];

    // Delay de seguridad RLS
    if (!sub) await new Promise(r => setTimeout(r, 1000));

    // Upsert Suscripción
    if (sub?.id) {
        const { error: uErr } = await supabase.from('subscriptions')
          .update({ due_date: nuevaFechaISO, active: true, gym_id: gymId })
          .eq('id', sub.id);
        if (uErr) throw new Error(`Fallo actualizando suscripción: ${uErr.message}`);
    } else {
        const { error: iErr } = await supabase.from('subscriptions')
          .insert([{
              user_id: userIdFinal, 
              plan_id: pagoData.plan_id || null, 
              start_date: hoyStr, 
              due_date: nuevaFechaISO, 
              active: true, 
              gym_id: gymId
          }]);
        if (iErr) throw new Error(`Fallo creando suscripción: ${iErr.message}`);
    }

    // --- PASO 3: HABILITAR USUARIO ---
    await supabase.from('users').update({ enabled: true }).eq('id', userIdFinal);
    
    return paymentData;

  } catch (error) {
    // ⚠️ EL ROLLBACK (La magia ocurre aquí) ⚠️
    // Si la función falló en cualquier punto DESPUÉS de crear el pago, lo borramos.
    if (paymentIdGenerado) {
      console.warn(`🔄 Haciendo Rollback: Borrando pago huérfano ID ${paymentIdGenerado}`);
      await supabase.from('payments').delete().eq('id', paymentIdGenerado);
    }
    
    console.error("❌ Error en registrarPago:", error.message);
    throw error; // Lanzamos el error final al modal
  }
};