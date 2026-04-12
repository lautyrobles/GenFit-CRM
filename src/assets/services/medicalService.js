import { supabase } from './supabaseClient';

/**
 * Obtiene todas las alertas médicas de un usuario específico
 */
export const obtenerAlertasMedicas = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('medical_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error al obtener alertas médicas:', error.message);
    return [];
  }
};

/**
 * Crea una nueva alerta médica para un usuario
 */
export const crearAlertaMedica = async (alerta) => {
  try {
    const { data, error } = await supabase
      .from('medical_alerts')
      .insert([
        {
          user_id: alerta.user_id,
          name: alerta.name,
          observation: alerta.observation,
          severity: alerta.severity
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error al crear alerta médica:', error.message);
    throw error;
  }
};

/**
 * Actualiza una alerta médica existente
 */
export const actualizarAlertaMedica = async (alertaId, cambios) => {
  try {
    const { data, error } = await supabase
      .from('medical_alerts')
      .update(cambios)
      .eq('id', alertaId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error al actualizar alerta médica:', error.message);
    throw error;
  }
};

/**
 * Elimina una alerta médica
 */
export const eliminarAlertaMedica = async (alertaId) => {
  try {
    const { error } = await supabase
      .from('medical_alerts')
      .delete()
      .eq('id', alertaId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar alerta médica:', error.message);
    return false;
  }
};