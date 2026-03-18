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
    🔹 CREAR CLIENTE (Actualizado con Lógica de Activo)
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
      // 👉 1. Actualizamos teléfono, plan y ponemos CONDITION en TRUE (Activo)
      const { data, error } = await supabase
        .from('users')
        .update({ 
          phone: cliente.phone, 
          plan_id: cliente.plan_id,
          condition: true 
        })
        .eq('id', nuevoUsuario.id)
        .select()
        .single();

      if (error) throw error;

      // 👉 2. Creamos sus primeros 30 días de suscripción
      const hoy = new Date();
      const due_date = new Date(hoy.getTime() + (30 * 24 * 60 * 60 * 1000));

      await supabase.from('subscriptions').insert([{
         user_id: nuevoUsuario.id, 
         plan_id: cliente.plan_id || null, 
         start_date: hoy.toISOString(), 
         due_date: due_date.toISOString(), 
         active: true
      }]);

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