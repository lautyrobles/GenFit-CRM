import { supabase } from "./supabaseClient";

/* =========================================
   💰 OBTENER TODOS LOS PAGOS (Historial)
   ========================================= */
export const obtenerPagos = async () => {
  try {
    // Hacemos JOIN con la tabla 'users' para saber quién pagó
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
          email
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
          payment_date: pagoData.payment_date,
          payment_method: pagoData.payment_method, // EFECTIVO, TRANSFERENCIA, ETC
          status: pagoData.status || 'COMPLETED',
          notes: pagoData.notes
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al registrar pago:", error.message);
    throw error;
  }
};

/* =========================================
   📊 OBTENER MÉTRICAS (Opcional - Backend)
   ========================================= */
// Podríamos hacer una RPC function en Supabase, 
// pero por ahora las calcularemos en el frontend para no complicar la DB.