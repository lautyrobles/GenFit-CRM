import { supabase } from "./supabaseClient";
import { registerUser } from "./authService"; 

/* ===================================================
    🔹 OBTENER TODOS LOS CLIENTES
   =================================================== */
export const obtenerClientes = async () => {
  try {
    // Volvemos a un select simple para asegurar que traiga a TODOS los CLIENT
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
    🔹 BUSCAR POR DNI (Blindado para Pagos)
   =================================================== */
export const obtenerClientePorDocumento = async (dni) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        plans (
          name,
          price
        )
      `) 
      .eq('dni', dni)
      .maybeSingle();

    if (error) throw error;

    // Si el cliente existe pero no tiene plan, devolvemos un objeto limpio 
    // para que el frontend no de error de "undefined"
    if (data && !data.plans) {
      return { ...data, plans: { name: "Sin Plan", price: 0 } };
    }

    return data;
  } catch (error) {
    console.error("❌ Error al buscar por documento:", error.message);
    return null;
  }
};

/* --- EL RESTO DE FUNCIONES (crearCliente, actualizarCliente) SE MANTIENEN IGUAL --- */
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