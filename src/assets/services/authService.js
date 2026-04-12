import { supabase } from "./supabaseClient";

/* ===================================================
   🔐 LOGIN (Email + Password)
   =================================================== */
export const login = async (email, password) => {
  try {
    // 1. Login contra Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (authError) throw new Error("Email o contraseña incorrectos.");

    // 2. Obtener datos del perfil (Rol, Nombre)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    // Si el usuario existe en Auth pero no en la tabla users, es un error de consistencia
    if (userError) throw new Error("Perfil de usuario no encontrado en base de datos.");

    return {
      ...userData,
      token: authData.session.access_token,
      email: authData.user.email
    };

  } catch (e) {
    console.error("❌ Error login:", e.message);
    throw e;
  }
};

/* ===================================================
   🆕 REGISTER USER (Para el Admin creando usuarios)
   =================================================== */
export const registerUser = async (name, lastName, email, username, password, role, dni) => {
  try {
    // 1. Crear en Supabase Auth (Usa el DNI como password internamente)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password, // Aquí llegará el DNI como string
    });

    if (authError) throw authError;

    // 2. Crear en tabla pública 'users'
    const nuevoPerfil = {
      id: authData.user.id,
      email,
      username: username || dni,
      first_name: name,
      last_name: lastName,
      role: role || 'CLIENT',
      dni: dni,
      password: password, // 👈 Se guarda el DNI aquí para satisfacer el NOT NULL de tu DB
      enabled: true,
    };

    const { data, error: dbError } = await supabase
      .from('users')
      .insert([nuevoPerfil])
      .select()
      .single();

    if (dbError) throw dbError;
    return data;

  } catch (e) {
    console.error("❌ Error register:", e.message);
    throw e;
  }
};

// ... Mantén getUsers, updateUser, toggleUserStatus y deleteUser iguales a los anteriores ...
export const getUsers = async () => {
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const updateUser = async (id, data) => {
  const { data: updated, error } = await supabase.from('users').update(data).eq('id', id).select();
  if (error) throw error;
  return updated;
};

export const toggleUserStatus = async (id, enabled) => {
  const { data, error } = await supabase.from('users').update({ enabled }).eq('id', id).select();
  if (error) throw error;
  return data;
};

export const deleteUser = async (id) => {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw error;
  return true;
};