import { supabase } from "./supabaseClient";

/**
 * Registra una nueva entidad (Gimnasio) en el ecosistema global.
 */
export const crearNuevoGimnasio = async (gymData) => {
  try {
    const { data, error } = await supabase
      .from('gyms')
      .insert([
        {
          name: gymData.name,
          address: gymData.address || null,
          enabled: true
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ Error Supabase al crear Gym:", error.message);
      throw error;
    }
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene la lista de todos los gimnasios registrados.
 * Solo accesible para usuarios con el rol SUPER_ADMIN vía RLS.
 */
export const obtenerTodosLosGimnasios = async () => {
  try {
    const { data, error } = await supabase
      .from('gyms')
      .select('id, name, created_at, enabled') 
      .order('name', { ascending: true });

    if (error) {
      console.error("❌ Error Supabase al listar Gyms:", error.message, error.hint);
      throw error;
    }
    return data || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Permite editar información básica de una franquicia.
 */
export const actualizarGimnasio = async (gymId, updateData) => {
  try {
    const { data, error } = await supabase
      .from('gyms')
      .update(updateData)
      .eq('id', gymId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al actualizar Gym:", error.message);
    throw error;
  }
};

export const toggleStatusSuperAdmin = async (userId, nuevoEstado) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ enabled: nuevoEstado })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al cambiar estado del SuperAdmin:", error.message);
    throw error;
  }
};

/**
 * Da de baja lógica a un gimnasio (impide que sus usuarios entren al CRM).
 */
export const toggleEstadoGimnasio = async (gymId, nuevoEstado) => {
  try {
    const { data, error } = await supabase
      .from('gyms')
      .update({ enabled: nuevoEstado })
      .eq('id', gymId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al cambiar estado del Gym:", error.message);
    throw error;
  }
};

export const obtenerTodosLosSuperAdmins = async () => {
  try {
    // 🎯 Agregado el campo 'enabled' para que el Front pueda ver si están bloqueados
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, username, created_at, enabled')
      .eq('role', 'SUPER_ADMIN')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al obtener SuperAdmins:", error.message);
    throw error;
  }
};

export const eliminarSuperAdmin = async (userId) => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("❌ Error al eliminar SuperAdmin:", error.message);
    throw error;
  }
};

export const actualizarSuperAdmin = async (userId, updateData) => {
  try {
    // 🎯 Se elimina la inyección de password por seguridad (las contraseñas no van en texto plano)
    const dataToUpdate = {
      first_name: updateData.first_name,
      last_name: updateData.last_name,
      dni: updateData.dni,
      username: updateData.username,
      email: updateData.email
    };

    const { data, error } = await supabase
      .from('users')
      .update(dataToUpdate)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al actualizar SuperAdmin:", error.message);
    throw error;
  }
};