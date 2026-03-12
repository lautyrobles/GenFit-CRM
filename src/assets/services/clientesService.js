import { supabase } from "./supabaseClient";
import { registerUser } from "./authService"; 

/* ===================================================
    🔹 OBTENER TODOS LOS CLIENTES
   =================================================== */
export const obtenerClientes = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*, plans(*), subscriptions(*)') 
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
    🔹 BUSCAR POR DNI
   =================================================== */
export const obtenerClientePorDocumento = async (dni) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        plans (*),
        subscriptions (*) 
      `) 
      .eq('dni', dni)
      .maybeSingle();

    if (error) throw error;

    // Si no tiene suscripción activa en la tabla, evitamos el undefined
    if (data && !data.subscriptions) {
      data.subscriptions = [];
    }

    return data;
  } catch (error) {
    console.error("❌ Error al buscar por documento:", error.message);
    return null;
  }
};

/* ===================================================
    🔹 CREAR CLIENTE (El que faltaba el export)
   =================================================== */
export const crearCliente = async (cliente) => {
  try {
    const nuevoUsuario = await registerUser(
        cliente.first_name,
        cliente.last_name,
        cliente.email,
        String(cliente.dni), 
        String(cliente.dni), 
        'CLIENT',            
        cliente.dni          
    );

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
      return data; 
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
      .select('*, plans(*), subscriptions(*)');

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("❌ Error actualizar cliente:", error.message);
    throw error;
  }
};