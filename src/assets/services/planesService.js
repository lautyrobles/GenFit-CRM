import { supabase } from "./supabaseClient";

/**
 * Obtiene los planes filtrados por el gimnasio del usuario
 */
export const obtenerPlanes = async (gymId) => {
  try {
    // Si por alguna razón no llega el gymId, no devolvemos nada para evitar mezclar datos
    if (!gymId) return [];

    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("gym_id", gymId) // 👈 Filtro fundamental
      .order("price", { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error al obtener planes:", error.message);
    throw error;
  }
};

/**
 * Crea un nuevo plan asignándole el gym_id correspondiente
 */
export const crearPlan = async (planData, gymId) => {
  try {
    const { data, error } = await supabase
      .from("plans")
      .insert([
        { 
          ...planData, 
          gym_id: gymId // 👈 Seteamos el gimnasio al crear
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error al crear plan:", error.message);
    throw error;
  }
};

/**
 * Actualiza un plan existente
 */
export const actualizarPlan = async (id, planData) => {
  try {
    const { data, error } = await supabase
      .from("plans")
      .update(planData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error al actualizar plan:", error.message);
    throw error;
  }
};

/**
 * Cambia el estado (activo/inactivo) de un plan
 */
export const cambiarEstadoPlan = async (id, active) => {
  try {
    const { data, error } = await supabase
      .from("plans")
      .update({ active })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error al cambiar estado del plan:", error.message);
    throw error;
  }
};