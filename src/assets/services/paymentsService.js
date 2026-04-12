import { supabase } from "./supabaseClient";

/**
 * Obtiene el historial de pagos filtrado por Gimnasio
 */
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

/**
 * Registra un pago, actualiza/crea suscripción y habilita al usuario.
 * Todo en un solo flujo de servicio.
 */
export const registrarPago = async (pagoData, gymId) => {
  try {
    // 1. Normalización de IDs (Acepta tanto camelCase como snake_case)
    const userIdFinal = pagoData.clienteId || pagoData.user_id;
    const monto = pagoData.montoFinal || pagoData.amount;
    const fechaPago = pagoData.fechaPago || pagoData.payment_date || new Date().toISOString();
    
    if (!userIdFinal) throw new Error("No se proporcionó un ID de usuario válido.");
    if (!gymId) throw new Error("Gym ID es obligatorio para registrar el pago.");

    // 2. Insertar el registro en la tabla PAYMENTS
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert([{
          user_id: userIdFinal,
          amount: Number(monto),
          payment_date: fechaPago, 
          payment_method: pagoData.metodoPago || pagoData.payment_method,
          status: pagoData.status || 'COMPLETED',
          notes: pagoData.notes || null,
          gym_id: gymId
      }])
      .select()
      .single();

    if (paymentError) throw paymentError;

    // 3. Lógica de Suscripción: Buscar si ya existe una para el usuario
    const { data: sub, error: subFetchError } = await supabase
      .from('subscriptions')
      .select('id, due_date')
      .eq('user_id', userIdFinal)
      .maybeSingle();

    if (subFetchError) throw subFetchError;

    // 4. Cálculo de Nueva Fecha de Vencimiento
    let nuevaFecha = new Date();
    const hoy = new Date();

    if (sub && sub.due_date) {
        const currentDue = new Date(sub.due_date);
        
        // Calculamos la diferencia de días entre hoy y el vencimiento actual
        const diffTime = currentDue.getTime() - hoy.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

        // Si falta poco para vencer o ya venció hace poco (margen de 5 días), acumulamos 30 días
        // Si venció hace mucho, arrancamos 30 días desde hoy
        if (diffDays >= -5) {
            nuevaFecha = new Date(currentDue.getTime() + (30 * 24 * 60 * 60 * 1000));
        } else {
            nuevaFecha = new Date(hoy.getTime() + (30 * 24 * 60 * 60 * 1000));
        }
    } else {
        // Si no tiene suscripción previa, 30 días desde hoy
        nuevaFecha = new Date(hoy.getTime() + (30 * 24 * 60 * 60 * 1000));
    }

    const nuevaFechaISO = nuevaFecha.toISOString().split('T')[0];

    // 5. Actualizar o Crear Suscripción
    if (sub?.id) {
        const { error: updateSubError } = await supabase
          .from('subscriptions')
          .update({ 
            due_date: nuevaFechaISO, 
            active: true,
            amount_paid: Number(monto)
          })
          .eq('id', sub.id);
        
        if (updateSubError) throw updateSubError;
    } else {
        const { error: insertSubError } = await supabase
          .from('subscriptions')
          .insert([{
              user_id: userIdFinal, 
              plan_id: pagoData.plan_id || null, 
              start_date: hoy.toISOString(), 
              due_date: nuevaFechaISO, 
              active: true, 
              gym_id: gymId
          }]);
        
        if (insertSubError) throw insertSubError;
    }

    // 6. Habilitar al usuario en la tabla USERS
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ enabled: true })
      .eq('id', userIdFinal);

    if (userUpdateError) throw userUpdateError;

    return paymentData;

  } catch (error) {
    console.error("❌ Error en Service registrarPago:", error.message);
    throw error;
  }
};