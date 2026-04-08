import { supabase } from "./supabaseClient";
import { crearUsuarioStaff } from "./authService"; // 👈 Actualizado a la función universal

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

/**
 * Crea un nuevo cliente de la app utilizando la lógica centralizada de Staff.
 * @param {Object} cliente - Datos del cliente desde el formulario.
 * @param {Object} adminActual - Objeto del usuario logueado (necesario para heredar gym_id y validar permisos).
 */
export const crearCliente = async (cliente, adminActual) => {
  if (!adminActual?.gym_id) throw new Error("Gimnasio del administrador no especificado");
  
  try {
    // 1. Utilizamos la función universal para crear el usuario en Auth y DB
    // Se usa el DNI como contraseña temporal (luego el usuario podrá cambiarla en la app)
    const nuevoUsuario = await crearUsuarioStaff(
      {
        email: cliente.email,
        password: String(cliente.dni), 
        first_name: cliente.first_name,
        last_name: cliente.last_name,
        dni: cliente.dni,
        role: 'CLIENT' // Forzamos el rol de cliente final
      },
      adminActual.id,
      adminActual.role,
      adminActual.gym_id
    );

    if (nuevoUsuario && nuevoUsuario.id) {
      // 2. Actualizamos los campos adicionales que no maneja la función base de Auth
      const { data, error } = await supabase
        .from('users')
        .update({ 
          phone: cliente.phone, 
          plan_id: cliente.plan_id,
          enabled: true // Permitimos el acceso a la app, el control de entrada es por suscripción
        })
        .eq('id', nuevoUsuario.id)
        .select()
        .single();

      if (error) throw error;

      // Importante: No creamos suscripción aquí. 
      // Se genera en registrarPago (paymentsService.js) para asegurar el cobro.
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