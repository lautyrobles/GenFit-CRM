import { supabase } from "./supabaseClient";
import { registerUser } from "./authService"; // 👈 IMPORTANTE: Usamos la lógica segura de creación

/* ===================================================
    🔹 OBTENER TODOS LOS CLIENTES
   =================================================== */
export const obtenerClientes = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'CLIENT')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al obtener clientes:", error.message);
    throw error;
  }
};

/* ===================================================
    🔹 CREAR UN NUEVO CLIENTE (Conectado a Auth)
   =================================================== */
export const crearCliente = async (cliente) => {
  try {
    // 1. Creamos el usuario en Auth y la base (con los campos básicos)
    const nuevoUsuario = await registerUser(
        cliente.first_name,
        cliente.last_name,
        cliente.email,
        String(cliente.dni), // username
        String(cliente.dni), // password
        'CLIENT',            // role
        cliente.dni          // dni
    );

    // 2. 🚨 SOLUCIÓN: Actualizamos el registro recién creado con el teléfono y el plan
    // Esto asegura que los campos que 'registerUser' no maneja, se guarden igual.
    if (nuevoUsuario && nuevoUsuario.id) {
      const { data, error } = await supabase
        .from('users')
        .update({ 
          phone: cliente.phone, 
          plan_id: cliente.plan_id 
        })
        .eq('id', nuevoUsuario.id)
        .select()
        .single();

      if (error) throw error;
      return data; // Retornamos el usuario con teléfono y plan
    }

    return nuevoUsuario;
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
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    return null;
  }
};