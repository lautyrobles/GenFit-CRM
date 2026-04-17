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

    let allUsersData = [];

    // 3. Buscamos esos IDs en las dos tablas (Staff y Clientes)
    if (userIds.length > 0) {
      // 3A. Buscamos en la tabla STAFF (Operadores del CRM)
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, first_name, last_name, email, role')
        .in('id', userIds);
        
      if (staffData) {
        allUsersData = [...allUsersData, ...staffData];
      }

      // 3B. Buscamos en la tabla USERS (Clientes - Ajustado a tu estructura real)
      const { data: usersData } = await supabase
        .from('users')
        .select('id, username, email')
        .in('id', userIds);

      if (usersData) {
        // Formateamos para que Movimientos.jsx lo lea igual que al staff
        const formattedUsers = usersData.map(u => ({
          id: u.id,
          first_name: u.username || 'Cliente',
          last_name: '',
          email: u.email,
          role: 'CLIENT'
        }));
        allUsersData = [...allUsersData, ...formattedUsers];
      }
    }

    // 4. Cruzamos los datos manualmente (Mapeo)
    const dataConUsuarios = logs.map(log => {
      const usuarioDelLog = allUsersData.find(u => u.id === log.user_id);
      
      return {
        id: log.id,
        created_at: log.created_at,
        module: log.module,
        action: log.action,
        details: log.details || log.detail,
        users: usuarioDelLog || null 
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