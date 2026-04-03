import { supabase } from "./supabaseClient";
import { registerUser } from "./authService"; 

export const obtenerClientes = async (gymId) => {
  if (!gymId) return [];
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*, plans(*), subscriptions(*)') 
      .eq('role', 'CLIENT')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al obtener clientes:", error.message);
    throw error;
  }
};

export const obtenerClientePorDocumento = async (dni, gymId) => {
  if (!gymId || !dni) return null;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*, plans (*), subscriptions (*)') 
      .eq('dni', dni)
      .eq('gym_id', gymId)
      .maybeSingle();

    if (error) throw error;
    if (data && !data.subscriptions) data.subscriptions = [];
    return data;
  } catch (error) {
    console.error("❌ Error al buscar por documento:", error.message);
    return null;
  }
};

export const crearCliente = async (cliente, gymId) => {
  if (!gymId) throw new Error("Gimnasio no especificado");
  try {
    const nuevoUsuario = await registerUser(
        cliente.first_name,
        cliente.last_name,
        cliente.email,
        String(cliente.dni), 
        String(cliente.dni), 
        'CLIENT',            
        cliente.dni,
        gymId
    );

    if (nuevoUsuario && nuevoUsuario.id) {
      const { data, error } = await supabase
        .from('users')
        .update({ 
          phone: cliente.phone, 
          plan_id: cliente.plan_id,
          enabled: true
        })
        .eq('id', nuevoUsuario.id)
        .select()
        .single();

      if (error) throw error;

      const hoy = new Date();
      const due_date = new Date(hoy.getTime() + (30 * 24 * 60 * 60 * 1000));

      await supabase.from('subscriptions').insert([{
         user_id: nuevoUsuario.id, 
         plan_id: cliente.plan_id || null, 
         start_date: hoy.toISOString(), 
         due_date: due_date.toISOString(), 
         active: true,
         gym_id: gymId
      }]);

      return data; 
    }
  } catch (error) {
    console.error("❌ Error crear cliente:", error.message);
    throw error;
  }
};

export const actualizarCliente = async (id, datosSucios) => {
  try {
    const COLUMNAS_PERMITIDAS = ['dni', 'first_name', 'last_name', 'email', 'phone', 'plan_id', 'enabled', 'role'];
    const datosLimpios = Object.keys(datosSucios)
      .filter(key => COLUMNAS_PERMITIDAS.includes(key))
      .reduce((obj, key) => {
        obj[key] = datosSucios[key];
        return obj;
      }, {});

    const { data, error } = await supabase
      .from('users')
      .update(datosLimpios)
      .eq('id', id)
      .select(); 

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("❌ Error actualizar cliente:", error.message);
    throw error;
  }
};