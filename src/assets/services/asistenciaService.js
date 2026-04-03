import { supabase } from "./supabaseClient";

export const registrarAsistenciaManual = async (userId, gymId, granted = true, msg = "Entrada manual") => {
  const { data, error } = await supabase
    .from('access_logs')
    .insert([{ 
      user_id: userId, 
      gym_id: gymId, // 👈 Este es el campo que valida el RLS
      access_granted: granted, 
      message: msg,
      check_in_time: new Date().toISOString()
    }]);

  if (error) {
    console.error("❌ Error en asistenciaService:", error.message);
    throw error;
  }
  return data;
};

export const obtenerUsuariosActivosAhora = async (gymId) => {
  const tresHorasAtras = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('access_logs')
    .select('user_id', { count: 'exact', head: true })
    .eq('gym_id', gymId)
    .gte('check_in_time', tresHorasAtras)
    .eq('access_granted', true);

  return error ? 0 : (count || 0);
};

export const buscarSocioParaAsistencia = async (dni, gymId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*, plans (name), subscriptions (active, due_date)')
    .eq('dni', String(dni).trim())
    .eq('gym_id', gymId)
    .eq('role', 'CLIENT')
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const obtenerHistorialHoy = async (gymId) => {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('access_logs')
    .select('*, users (first_name, last_name, dni)')
    .eq('gym_id', gymId)
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