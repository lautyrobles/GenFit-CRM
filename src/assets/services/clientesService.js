import { supabase } from "./supabaseClient";

/* ===================================================
   🔹 OBTENER TODOS LOS CLIENTES
   =================================================== */
export const obtenerClientes = async () => {
  try {
    console.log("📡 Obteniendo clientes desde Supabase...");
    
    // Filtramos por rol CLIENT para no traer admins
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'CLIENT');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al obtener clientes:", error.message);
    throw error;
  }
};

/* ===================================================
   🔹 CREAR UN NUEVO CLIENTE
   =================================================== */
export const crearCliente = async (cliente) => {
  try {
    // ⚠️ ASIGNACIÓN AUTOMÁTICA DE PASSWORD
    // Creamos una copia del cliente y le asignamos el DNI como contraseña
    const clienteConPass = {
      ...cliente,
      password: String(cliente.dni) // Convertimos a string por seguridad
    };

    const { data, error } = await supabase
      .from('users')
      .insert([clienteConPass])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("❌ Error crear cliente:", error.message);
    throw error;
  }
};

/* ===================================================
   🔹 ACTUALIZAR CLIENTE
   =================================================== */
export const actualizarCliente = async (id, datos) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(datos)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error actualizar cliente:", error.message);
    throw error;
  }
};

/* ===================================================
   🔹 BUSCAR POR DNI (Auxiliar)
   =================================================== */
export const obtenerClientePorDocumento = async (dni) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('dni', dni)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignoramos error "no encontrado"
    return data;
  } catch (error) {
    console.error("❌ Error buscar DNI:", error.message);
    return null;
  }
};