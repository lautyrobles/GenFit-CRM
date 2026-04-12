import { supabase } from "./supabaseClient";

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
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cliente.email.trim().toLowerCase(),
        password: String(cliente.dni), // <--- DNI COMO CONTRASEÑA
        options: {
          data: {
            first_name: cliente.first_name,
            last_name: cliente.last_name,
            role: 'CLIENT',
            dni: cliente.dni,
            gym_id: cliente.gym_id || null
          }
        }
    });

    if (authError) throw authError;
    const userId = authData?.user?.id;

    if (userId) {
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