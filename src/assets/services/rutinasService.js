import { supabase } from "./supabaseClient";

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
    .maybeSingle(); // Trae la rutina actual o null

  if (error) throw error;
  return data;
};

export const eliminarRutinaPorUsuario = async (userId) => {
  if (!userId) throw new Error("ID de usuario no proporcionado");

  const { data, error } = await supabase
    .from('routines')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error("Error en service al eliminar rutina:", error);
    throw error;
  }
  
  return true;
};

export const obtenerTodasLasPendientes = async () => {
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
    .eq('is_active', false)
    .order('id', { ascending: true });

  if (error) throw error;
  return data;
};