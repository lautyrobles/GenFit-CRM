import { supabase } from './supabaseClient';
import { MASTER_PASSWORD } from './authService';

export const getUsers = async (gymId) => {
  try {
    let query = supabase.from('staff').select('*').order('id', { ascending: true });
    if (gymId) query = query.eq('gym_id', gymId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (e) {
    throw e;
  }
};

export const registerUser = async (userData) => {
  try {
    if (!userData.email) throw new Error("El email es obligatorio");

    const { data, error } = await supabase.auth.signUp({
      email: userData.email.trim().toLowerCase(),
      password: userData.password || MASTER_PASSWORD,
      options: {
        data: {
          // Nombres estandarizados para que el Trigger SQL los reconozca
          first_name: userData.nombre || userData.first_name,
          last_name: userData.apellido || userData.last_name,
          role: userData.role,
          gym_id: userData.gym_id || null,
          dni: userData.dni,
          username: userData.nombreUsuario || userData.username
        }
      },
    });

    if (error) throw error;
    return data;
  } catch (e) {
    console.error("❌ Error en registerUser (Staff):", e.message);
    throw e;
  }
};

export const updateUser = async (userId, updateData) => {
  try {
    const { data, error } = await supabase
      .from('staff')
      .update(updateData)
      .eq('id', userId)
      .select();
    
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (e) {
    throw e;
  }
};

export const toggleUserStatus = async (userId, isEnabled) => {
  try {
    const { data, error } = await supabase
      .from('staff')
      .update({ enabled: isEnabled })
      .eq('id', userId)
      .select();
    
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (e) {
    throw e;
  }
};

export const deleteUser = async (userId) => {
  try {
    // Si usas borrado físico (DELETE) en lugar de lógico (enabled: false):
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', userId);
      
    if (error) throw error;
    return true;
  } catch (e) {
    throw e;
  }
};