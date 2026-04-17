import { supabase } from "./supabaseClient";

/* =========================================
    💰 OBTENER TODOS LOS PAGOS (Historial)
   ========================================= */
export const obtenerPagos = async (gymId = null) => {
  try {
    let query = supabase
      .from('payments')
      .select(`
        id,
        amount,
        payment_date,
        payment_method,
        status,
        notes,
        created_at,
        category,
        users (
          id,
          first_name,
          last_name,
          dni,
          email,
          plans (
            id,
            name,
            price
          )
        )
      `)
      .order('payment_date', { ascending: false });

    if (gymId) query = query.eq('gym_id', gymId);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al obtener pagos:", error.message);
    throw error;
  }
};

/* =========================================
    ➕ REGISTRAR UN NUEVO PAGO
    LÓGICA DE FACTURACIÓN:
    - Si el usuario está dentro de los 30 días O dentro de los 5 días de gracia
      (hasta 5 días después del vencimiento): el nuevo vencimiento se calcula
      sumando 30 días al vencimiento ORIGINAL (no a la fecha de pago).
    - Si pasó la tolerancia de 5 días: los 30 días arrancan desde hoy.
    - Al registrar el pago, se activa el usuario (enabled = true, condition = true).
   ========================================= */
export const registrarPago = async (pagoData) => {
  try {
    const userIdFinal = pagoData.clienteId || pagoData.user_id;

    if (!userIdFinal) {
      throw new Error("No se proporcionó un ID de usuario válido para el pago.");
    }

    // 1. Registrar el pago en payments
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        user_id: userIdFinal,
        amount: pagoData.montoFinal || pagoData.amount,
        payment_date: pagoData.fechaPago || pagoData.payment_date || new Date().toISOString(),
        payment_method: pagoData.metodoPago || pagoData.payment_method,
        status: pagoData.status || 'COMPLETED',
        notes: pagoData.notes || null,
        category: pagoData.category || 'MEMBRESIA',
        gym_id: pagoData.gym_id || null
      }])
      .select()
      .single();

    if (paymentError) throw paymentError;

    // 2. Calcular la nueva fecha de vencimiento
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Buscar suscripción activa del usuario
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, due_date, active')
      .eq('user_id', userIdFinal)
      .order('due_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nuevaFechaVencimiento;

    if (sub && sub.due_date) {
      const vencimientoOriginal = new Date(sub.due_date);
      vencimientoOriginal.setHours(0, 0, 0, 0);

      const diffDias = Math.ceil(
        (vencimientoOriginal.getTime() - hoy.getTime()) / (1000 * 3600 * 24)
      );

      // diffDias >= -5 significa que está dentro del período de gracia (hasta 5 días vencido)
      // En ese caso, sumamos 30 días al vencimiento ORIGINAL para no "regalar" los días de gracia
      if (diffDias >= -5) {
        nuevaFechaVencimiento = new Date(vencimientoOriginal.getTime() + 30 * 24 * 60 * 60 * 1000);
      } else {
        // Pasó la tolerancia: 30 días desde hoy
        nuevaFechaVencimiento = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
    } else {
      // Sin suscripción previa: 30 días desde hoy
      nuevaFechaVencimiento = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    // 3. Actualizar o crear la suscripción
    if (sub && sub.id) {
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({
          due_date: nuevaFechaVencimiento.toISOString(),
          active: true
        })
        .eq('id', sub.id);

      if (subError) throw subError;
    } else {
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert([{
          user_id: userIdFinal,
          plan_id: pagoData.plan_id || null,
          start_date: new Date().toISOString(),
          due_date: nuevaFechaVencimiento.toISOString(),
          active: true,
          gym_id: pagoData.gym_id || null
        }]);

      if (insertError) throw insertError;
    }

    // 4. Activar el usuario
    const { error: userError } = await supabase
      .from('users')
      .update({ condition: true, enabled: true })
      .eq('id', userIdFinal);

    if (userError) throw userError;

    return paymentData;
  } catch (error) {
    console.error("❌ Error al registrar pago:", error.message);
    throw error;
  }
};

/* =========================================
    📋 OBTENER ESTADO DE SUSCRIPCIÓN
   ========================================= */
export const obtenerEstadoSuscripcion = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, due_date, active, plan_id, plans(name, price)')
      .eq('user_id', userId)
      .order('due_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al obtener suscripción:", error.message);
    return null;
  }
};