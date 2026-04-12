import { supabase } from './supabaseClient';

export const obtenerClientes = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*, plans(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

export const crearCliente = async (clienteData) => {
  try {
    const datosGuardar = {
      ...clienteData,
      password: clienteData.dni,
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

export const obtenerClientePorDocumento = async (documento) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*, plans(name)')
      .eq('dni', documento)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

export const actualizarCliente = async (id, clienteData) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(clienteData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

export const eliminarCliente = async (id) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};