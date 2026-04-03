import { supabase } from "./supabaseClient";

/**
 * Obtiene los últimos 100 movimientos registrados para un gimnasio específico.
 */
export const obtenerMovimientos = async (gymId) => {
  if (!gymId) return [];
  
  try {
    const { data, error } = await supabase
      .from('system_logs')
      .select(`
        id, 
        created_at, 
        module, 
        action, 
        details, 
        users (first_name, last_name, email, role)
      `)
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error en obtenerMovimientos:", error.message);
    throw error;
  }
};

/**
 * Registra una acción administrativa en la bitácora del sistema.
 */
export const registrarMovimiento = async (userId, module, action, details, gymId) => {
  if (!userId || !gymId) {
    console.warn("⚠️ Intento de registro de log sin IDs necesarios (User/Gym).");
    return;
  }

  try {
    const { error } = await supabase
      .from('system_logs')
      .insert([{ 
        user_id: userId, 
        module, 
        action, 
        details, 
        gym_id: gymId 
      }]);

    if (error) console.error("⚠️ No se pudo guardar el log en DB:", error.message);
  } catch (err) {
    console.error("⚠️ Error interno logging:", err);
  }
};