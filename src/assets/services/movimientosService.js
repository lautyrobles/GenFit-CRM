import { supabase } from "./supabaseClient";

/* =========================================
   📜 OBTENER HISTORIAL DE MOVIMIENTOS
   ========================================= */
export const obtenerMovimientos = async () => {
  try {
    // Traemos el log y los datos del usuario que lo hizo (JOIN)
    const { data, error } = await supabase
      .from('system_logs')
      .select(`
        id,
        created_at,
        module,
        action,
        details,
        users (
          first_name,
          last_name,
          email,
          role
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100); // Limitamos a los últimos 100 por rendimiento

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al obtener movimientos:", error.message);
    throw error;
  }
};

/* =========================================
   ✍️ REGISTRAR UN MOVIMIENTO (Para usar en otros componentes)
   Uso: registrarMovimiento(user.id, 'Clientes', 'CREACIÓN', 'Creó al cliente Juan')
   ========================================= */
export const registrarMovimiento = async (userId, module, action, details) => {
  try {
    const { error } = await supabase
      .from('system_logs')
      .insert([{ user_id: userId, module, action, details }]);

    if (error) console.error("⚠️ No se pudo guardar el log:", error.message);
  } catch (err) {
    console.error("⚠️ Error interno logging:", err);
  }
};