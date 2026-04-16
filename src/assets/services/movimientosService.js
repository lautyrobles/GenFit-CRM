import { supabase } from "./supabaseClient";

/* =========================================
   📜 OBTENER HISTORIAL DE MOVIMIENTOS
   ========================================= */
export const obtenerMovimientos = async () => {
  try {
    // 1. Traemos los últimos 100 logs
    const { data: logs, error: logsError } = await supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (logsError) throw logsError;

    // 2. Extraemos los IDs de usuario únicos que hay en esos logs
    const userIds = [...new Set(logs.map(log => log.user_id).filter(id => id != null))];

    let usersData = [];

    // 3. Si hay usuarios, los buscamos todos de una sola vez
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role')
        .in('id', userIds);
        
      if (!usersError && users) {
        usersData = users;
      }
    }

    // 4. Cruzamos los datos manualmente (Mapeo)
    const dataConUsuarios = logs.map(log => {
      const usuarioDelLog = usersData.find(u => u.id === log.user_id);
      
      return {
        id: log.id,
        created_at: log.created_at,
        module: log.module,
        action: log.action,
        details: log.details || log.detail, // Por si acaso
        users: usuarioDelLog || null // Si no lo encuentra, queda null y tu front dirá "Usuario eliminado"
      };
    });

    return dataConUsuarios;
  } catch (error) {
    console.error("❌ Error al obtener movimientos:", error.message);
    throw error;
  }
};

/* =========================================
   ✍️ REGISTRAR UN MOVIMIENTO
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