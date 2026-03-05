import { supabase } from "./supabaseClient";

/* =========================================
    💰 OBTENER TODOS LOS PAGOS (Historial)
   ========================================= */
export const obtenerPagos = async () => {
  try {
    // 💡 CAMBIO CLAVE: Entramos a users y luego a plans(name)
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
    const { data, error } = await supabase
      .from('payments')
      .insert([
        {
          user_id: pagoData.user_id,
          amount: pagoData.amount,
          // Forzamos la fecha de pago a la enviada o a la actual si no viene
          payment_date: pagoData.payment_date || new Date().toISOString(), 
          payment_method: pagoData.payment_method,
          status: pagoData.status || 'COMPLETED',
          notes: pagoData.notes
        }
      ]);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al registrar pago:", error.message);
    throw error;
  }
};