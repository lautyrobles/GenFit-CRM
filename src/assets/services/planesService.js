import { supabase } from "./supabaseClient";

/* =========================================
   🟢 OBTENER TODOS LOS PLANES
========================================= */
export const obtenerPlanes = async () => {
  try {
    console.log("📡 Obteniendo planes desde Supabase...");
    
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('price', { ascending: true }); // Ordenamos por precio

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al obtener planes:", error.message);
    throw error;
  }
};

/* =========================================
   🟡 CREAR UN PLAN
========================================= */
export const crearPlan = async (plan) => {
  try {
    const { data, error } = await supabase
      .from('plans')
      .insert([plan])
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al crear plan:", error.message);
    throw error;
  }
};

/* =========================================
   🟠 ACTUALIZAR PLAN
========================================= */
export const actualizarPlan = async (id, plan) => {
  try {
    const { data, error } = await supabase
      .from('plans')
      .update(plan)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al actualizar plan:", error.message);
    throw error;
  }
};

/* =========================================
   🟣 CAMBIAR ESTADO
========================================= */
export const cambiarEstadoPlan = async (id, active) => {
  try {
    const { data, error } = await supabase
      .from('plans')
      .update({ active: active })
      .eq('id', id)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al cambiar estado:", error.message);
    throw error;
  }
};