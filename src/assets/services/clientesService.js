import { supabase } from './supabaseClient';

/* =========================================
    📋 OBTENER TODOS LOS CLIENTES
   ========================================= */
export const obtenerClientes = async (gymId = null) => {
  try {
    let query = supabase
      .from('users')
      .select('*, plans(id, name, price)')
      .eq('role', 'CLIENT')
      .order('created_at', { ascending: false });

    if (gymId) query = query.eq('gym_id', gymId);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

/* =========================================
    ➕ CREAR CLIENTE
    IMPORTANTE: el cliente nace con enabled = false y condition = false.
    Solo se activa al registrar el primer pago.
   ========================================= */
export const crearCliente = async (clienteData) => {
  try {
    // Primero, crear el usuario en Supabase Auth con la contraseña = DNI
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: clienteData.email,
      password: clienteData.dni, // La contraseña es el DNI para la app móvil
      options: {
        data: {
          first_name: clienteData.first_name,
          last_name: clienteData.last_name,
          role: 'CLIENT',
          gym_id: clienteData.gym_id || null,
          dni: clienteData.dni
        }
      }
    });

    // Si el usuario ya existe en Auth o hay error de auth, intentamos de todas formas
    // insertar en la tabla users (puede que ya esté en Auth pero no en la tabla)
    if (authError && !authError.message.includes('already registered')) {
      console.warn('Auth signUp warning:', authError.message);
    }

    const userId = authData?.user?.id;

    // Insertar en la tabla pública users
    // enabled = false: el cliente no puede acceder hasta pagar
    // condition = false: cuota no al día
    const datosGuardar = {
      id: userId || undefined, // Si Auth devolvió ID, usarlo
      first_name: clienteData.first_name,
      last_name: clienteData.last_name,
      email: clienteData.email,
      phone: clienteData.phone || null,
      dni: clienteData.dni,
      plan_id: clienteData.plan_id || null,
      gym_id: clienteData.gym_id || null,
      role: 'CLIENT',
      enabled: false,      // Inactivo hasta el primer pago
      condition: false,    // Cuota no al día
      password: clienteData.dni // Campo legacy si existe en la tabla
    };

    const { data, error } = await supabase
      .from('users')
      .insert([datosGuardar])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

/* =========================================
    🔍 BUSCAR POR DNI
   ========================================= */
export const obtenerClientePorDocumento = async (documento) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*, plans(id, name, price)')
      .eq('dni', documento)
      .eq('role', 'CLIENT')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

/* =========================================
    ✏️ ACTUALIZAR CLIENTE
   ========================================= */
export const actualizarCliente = async (id, clienteData) => {
  try {
    // Excluimos campos que no deben actualizarse aquí
    const { password, enabled, condition, ...datosActualizar } = clienteData;

    const { data, error } = await supabase
      .from('users')
      .update(datosActualizar)
      .eq('id', id)
      .select('*, plans(id, name, price)')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

/* =========================================
    🔄 CAMBIAR ESTADO HABILITADO (manual)
   ========================================= */
export const toggleHabilitadoCliente = async (id, enabled) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ enabled })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

/* =========================================
    🗑️ ELIMINAR CLIENTE (soft delete)
   ========================================= */
export const eliminarCliente = async (id) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ enabled: false })
      .eq('id', id);

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};