import { supabase } from "./supabaseClient";

/**
 * Obtiene la rutina completa de un usuario específico
 */
export const obtenerRutinaPorUsuario = async (userId) => {
  const { data, error } = await supabase
    .from('routines')
    .select(`
      id, name, is_active, user_id,
      routine_days (
        id, day_name, order_index,
        muscle_blocks (
          id, muscle_name, order_index,
          exercises (id, name, sets, reps, video_url)
        )
      )
    `)
    .eq('user_id', userId)
    .maybeSingle();
    
  if (error) throw error;
  return data;
};

/**
 * Elimina la rutina de un usuario (para sobrescribir o dar de baja)
 */
export const eliminarRutinaPorUsuario = async (userId) => {
  const { error } = await supabase.from('routines').delete().eq('user_id', userId);
  if (error) throw error;
  return true;
};

/**
 * Obtiene todas las rutinas pendientes de validación de UN GIMNASIO
 */
export const obtenerTodasLasPendientes = async (gymId) => {
  if (!gymId) return [];
  
  const { data, error } = await supabase
    .from('routines')
    .select(`
      id, name, is_active, user_id,
      users (first_name, last_name),
      routine_days (
        id, day_name, order_index,
        muscle_blocks (
          id, muscle_name, order_index,
          exercises (id, name, sets, reps, video_url)
        )
      )
    `)
    .eq('gym_id', gymId)
    .eq('is_active', false)
    .order('id', { ascending: true }); // 👈 Cambiado: created_at por id

  if (error) throw error;
  return data;
};