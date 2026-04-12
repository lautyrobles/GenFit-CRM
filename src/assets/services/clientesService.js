import { supabase } from "./supabaseClient";
import { registerUser } from "./authService"; 

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

export const obtenerClientePorDocumento = async (dni) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`*, plans (*), subscriptions (*)`) 
      .eq('dni', dni)
      .maybeSingle();
    if (error) throw error;
    if (data && !data.subscriptions) data.subscriptions = [];
    return data;
  } catch (error) {
    console.error("❌ Error al buscar por documento:", error.message);
    return null;
  }
};

export const crearCliente = async (cliente) => {
  try {
    // 1. Registro en Auth pasando OBJETO
    const authData = await registerUser({
        first_name: cliente.first_name,
        last_name: cliente.last_name,
        email: cliente.email,
        dni: cliente.dni,
        role: 'CLIENT',
        gym_id: cliente.gym_id || null
    });

    const userId = authData?.user?.id || authData?.id;

    if (userId) {
      // 2. Insert/Update en tabla pública
      const { data, error } = await supabase
        .from('users')
        .upsert({
          id: userId,
          first_name: cliente.first_name,
          last_name: cliente.last_name,
          email: cliente.email,
          dni: cliente.dni,
          phone: cliente.phone,
          plan_id: cliente.plan_id,
          role: 'CLIENT',
          gym_id: cliente.gym_id || null,
          enabled: true 
        })
        .select()
        .single();

      if (error) throw error;

      // 3. Suscripción inicial
      const hoy = new Date();
      const due_date = new Date(hoy.getTime() + (30 * 24 * 60 * 60 * 1000));
      await supabase.from('subscriptions').insert([{
         user_id: userId, 
         plan_id: cliente.plan_id || null, 
         start_date: hoy.toISOString(), 
         due_date: due_date.toISOString(), 
         active: true
      }]);

      return data; 
    }
    return authData;
  } catch (error) {
    console.error("❌ Error crear cliente:", error.message);
    throw error;
  }
};

export const actualizarCliente = async (id, datosSucios) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(datosSucios)
      .eq('id', id)
      .select(); 
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("❌ Error actualizar cliente:", error.message);
    throw error;
  }
};