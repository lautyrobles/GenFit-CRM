import { supabase } from "./supabaseClient";

/* =========================================
    💰 OBTENER TODOS LOS PAGOS (Historial)
   ========================================= */
export const obtenerPagos = async () => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        payment_date,
        payment_method,
        status,
        notes,
        created_at,
        users (
          id,
          first_name,
          last_name,
          dni,
          email,
          plans (
            name
          )
        )
      `)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al obtener pagos:", error.message);
    throw error;
  }
};

/* =========================================
    ➕ REGISTRAR UN NUEVO PAGO
   ========================================= */
export const registrarPago = async (pagoData) => {
  try {
    // 👉 CLAVE 1: Normalizamos el ID del usuario para evitar errores
    // Si viene desde ModalNuevoPago, se llama 'clienteId'. Si viene de otro lado, 'user_id'.
    const userIdFinal = pagoData.clienteId || pagoData.user_id;

    if (!userIdFinal) {
        throw new Error("No se proporcionó un ID de usuario válido para el pago.");
    }

    // 1. Guardamos el pago en la tabla payments
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert([
        {
          user_id: userIdFinal,
          amount: pagoData.montoFinal || pagoData.amount, // Lo mismo para el monto
          payment_date: pagoData.fechaPago || pagoData.payment_date || new Date().toISOString(), 
          payment_method: pagoData.metodoPago || pagoData.payment_method,
          status: pagoData.status || 'COMPLETED',
          notes: pagoData.notes || null
        }
      ])
      .select().single();

    if (paymentError) throw paymentError;

    // 2. Buscamos la suscripción actual para saber la fecha de vencimiento actual
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, due_date')
      .eq('user_id', userIdFinal)
      .maybeSingle();

    let nuevaFecha = new Date();
    nuevaFecha.setHours(0,0,0,0);

    // LÓGICA DE FECHAS (30 días + 5 de gracia)
    if (sub && sub.due_date) {
        const currentDue = new Date(sub.due_date);
        currentDue.setHours(0,0,0,0);
        const hoy = new Date();
        hoy.setHours(0,0,0,0);
        
        const diffDays = Math.ceil((currentDue.getTime() - hoy.getTime()) / (1000 * 3600 * 24));

        if (diffDays >= -5) {
            // Si está al día o en los 5 días de tolerancia, suma 30 días a su fecha original
            nuevaFecha = new Date(currentDue.getTime() + (30 * 24 * 60 * 60 * 1000));
        } else {
            // Si pasó la tolerancia, el mes nuevo arranca desde hoy
            nuevaFecha = new Date(hoy.getTime() + (30 * 24 * 60 * 60 * 1000));
        }
    } else {
        // Si no tiene suscripción previa, 30 días desde hoy
        nuevaFecha = new Date(nuevaFecha.getTime() + (30 * 24 * 60 * 60 * 1000));
    }

    // 3. Actualizamos o insertamos la suscripción
    if (sub && sub.id) {
        await supabase.from('subscriptions').update({ due_date: nuevaFecha.toISOString(), active: true }).eq('id', sub.id);
    } else {
        // Si no tenemos el plan_id a mano, lo dejamos en nulo o buscamos el del usuario
        await supabase.from('subscriptions').insert([{
            user_id: userIdFinal, plan_id: pagoData.plan_id || null, start_date: new Date().toISOString(), due_date: nuevaFecha.toISOString(), active: true
        }]);
    }

    // 👉 4. CLAVE: Volvemos a poner el booleano condition en TRUE al pagar
    await supabase.from('users').update({ condition: true }).eq('id', userIdFinal);

    return paymentData;
  } catch (error) {
    console.error("❌ Error al registrar pago:", error.message);
    throw error;
  }
};