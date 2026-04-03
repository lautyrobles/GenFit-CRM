import { supabase } from './supabaseClient';

export const obtenerAlertasMedicas = async (userId) => {
  const { data, error } = await supabase
    .from('medical_alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data;
};

export const crearAlertaMedica = async (alerta, gymId) => {
  const { data, error } = await supabase
    .from('medical_alerts')
    .insert([{ ...alerta, gym_id: gymId }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const actualizarAlertaMedica = async (alertaId, cambios) => {
  const { data, error } = await supabase.from('medical_alerts').update(cambios).eq('id', alertaId).select().single();
  if (error) throw error;
  return data;
};

export const eliminarAlertaMedica = async (alertaId) => {
  const { error } = await supabase.from('medical_alerts').delete().eq('id', alertaId);
  return !error;
};