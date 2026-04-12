import { supabase } from './supabaseClient';

export const obtenerClientes = async () => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*, plans(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error obteniendo clientes:", error);
    throw error;
  }
};

export const crearCliente = async (clienteData) => {
  try {
    // Aseguramos que se envíe el password con el valor del DNI
    const datosGuardar = {
      ...clienteData,
      password: clienteData.password || clienteData.dni,
    };

    const { data, error } = await supabase
      .from('clientes')
      .insert([datosGuardar])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error al crear cliente:", error);
    throw error;
  }
};

export const obtenerClientePorDocumento = async (documento) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*, plans(name)')
      .eq('dni', documento)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error obteniendo cliente por documento:", error);
    throw error;
  }
};

export const actualizarCliente = async (id, clienteData) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .update(clienteData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error al actualizar cliente:", error);
    throw error;
  }
};

export const eliminarCliente = async (id) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error al eliminar cliente:", error);
    throw error;
  }
};