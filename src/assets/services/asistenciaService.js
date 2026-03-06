import { supabase } from "./supabaseClient";

/**
 * Registra una asistencia manual desde el CRM
 */
export const registrarAsistenciaManual = async (userId, granted = true, msg = "Entrada manual por Coach") => {
  const { data, error } = await supabase
    .from('access_logs')
    .insert([
      { 
        user_id: userId, 
        access_granted: granted, 
        message: msg,
        check_in_time: new Date().toISOString()
      }
    ]);
  if (error) throw error;
  return data;
};

/**
 * Obtiene el número de personas únicas que ingresaron en las últimas 3 horas.
 * Usamos 'count' para que sea liviano y no traiga todos los datos.
 */
export const obtenerUsuariosActivosAhora = async () => {
  const tresHorasAtras = new Date();
  tresHorasAtras.setHours(tresHorasAtras.getHours() - 3);

  const { count, error } = await supabase
    .from('access_logs')
    .select('user_id', { count: 'exact', head: true }) // head: true hace que solo devuelva el número
    .gte('check_in_time', tresHorasAtras.toISOString())
    .eq('access_granted', true); // Solo contamos a los que sí pudieron entrar

  if (error) {
    console.error("Error al contar usuarios activos:", error);
    return 0;
  }

  return count || 0;
};

/**
 * Busca un socio por DNI e incluye su suscripción activa para ver si debe.
 */
export const buscarSocioParaAsistencia = async (dni) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id, 
        first_name, 
        last_name, 
        dni, 
        enabled,
        plan_id,
        plans (name),
        subscriptions (
          active, 
          due_date
        )
      `)
      .eq('dni', String(dni).trim()) // Aseguramos que sea string y sin espacios
      .eq('role', 'CLIENT')
      .maybeSingle(); // Usamos maybeSingle para que no tire error si no encuentra nada

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error en buscarSocioParaAsistencia:", error.message);
    throw error;
  }
};

/**
 * Trae los ingresos del día actual para mostrar en el historial.
 */
export const obtenerHistorialHoy = async () => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('access_logs')
    .select(`
      id, 
      check_in_time, 
      access_granted, 
      message,
      user_id, 
      users (first_name, last_name, dni)
    `)
    .gte('check_in_time', hoy.toISOString())
    .order('check_in_time', { ascending: false });

  if (error) throw error;
  return data;
};

export const obtenerAsistenciasPorUsuario = async (userId) => {
  const { data, error } = await supabase
    .from('access_logs')
    .select('check_in_time')
    .eq('user_id', userId)
    .eq('access_granted', true);

  if (error) throw error;
  return data.map(log => new Date(log.check_in_time).toISOString().split('T')[0]);
};