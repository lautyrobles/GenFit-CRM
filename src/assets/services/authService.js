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

    // 2. Obtener datos del perfil completo (Incluyendo gym_id y rol)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError) throw new Error("Perfil de usuario no encontrado en la base de datos.");

    // 3. Verificación de cuenta habilitada
    if (!userData.enabled) {
      await supabase.auth.signOut();
      throw new Error("Tu cuenta ha sido deshabilitada. Contacta al administrador.");
    }

    // Retornamos el objeto completo para el AuthContext
    return {
      ...userData,
      token: authData.session.access_token,
      email: authData.user.email,
      gym_id: userData.gym_id 
    };

  } catch (e) {
    console.error("❌ Error login:", e.message);
    throw e;
  }
};

/* ===================================================
    🆕 REGISTER USER (Admin creando Staff o Clientes)
   =================================================== */
export const registerUser = async (name, lastName, email, username, password, role, dni, gymId) => {
  try {
    // 1. Crear en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    // 2. Crear en tabla pública 'users' inyectando el gymId
    const nuevoPerfil = {
      id: authData.user.id,
      email,
      username: username || dni,
      first_name: name,
      last_name: lastName,
      role: role || 'CLIENT',
      dni: dni,
      // Nota: No es recomendable guardar la contraseña en texto plano en la tabla pública, 
      // pero se incluye si tu esquema de DB lo requiere como NOT NULL.
      password: password, 
      enabled: true,
      gym_id: gymId 
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

/* ===================================================
    👥 GESTIÓN DE USUARIOS (Filtrado por Gimnasio)
   =================================================== */

export const getUsers = async (gymId) => {
  try {
    if (!gymId) throw new Error("Gym ID es requerido para obtener usuarios.");

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('gym_id', gymId) 
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al obtener usuarios:", error.message);
    throw error;
  }
};

export const updateUser = async (id, data) => {
  try {
    const { data: updated, error } = await supabase
      .from('users')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  } catch (error) {
    console.error("❌ Error al actualizar usuario:", error.message);
    throw error;
  }
};

export const toggleUserStatus = async (id, enabled) => {
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
    console.error("❌ Error al cambiar estado:", error.message);
    throw error;
  }
};

export const deleteUser = async (id) => {
  try {
    // Nota: Esto elimina el perfil público. 
    // Para eliminar de Auth (email/pass) se requiere llamar a una función Edge o Admin API.
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("❌ Error al eliminar usuario:", error.message);
    throw error;
  }
};

/* ===================================================
    🚪 LOGOUT
   =================================================== */
export const logout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Limpieza de datos persistentes si los hubiera
    localStorage.removeItem("fitseoUser"); 
    
    // Redirección manual si el router no lo maneja automáticamente
    window.location.href = "/login"; 
    
    return true;
  } catch (error) {
    console.error("❌ Error al cerrar sesión:", error.message);
    return false;
  }
};

export const crearAdministradorNuevoGym = async (adminData, gymId) => {
  try {
    // 1. Registro en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: adminData.email,
      password: adminData.password,
    });

    if (authError) throw authError;

    // 2. Creación del perfil en la tabla pública con el ROL y el GYM_ID del nuevo negocio
    const { data, error: dbError } = await supabase
      .from('users')
      .insert([{
        id: authData.user.id,
        first_name: adminData.nombre,
        last_name: adminData.apellido,
        email: adminData.email,
        username: adminData.username,
        dni: adminData.dni,
        role: 'ADMIN', // El dueño es ADMIN de su parcela
        gym_id: gymId,  // 🎯 Aquí se define su "Base de Datos dedicada"
        enabled: true
      }])
      .select()
      .single();

    if (dbError) throw dbError;
    return data;
  } catch (error) {
    console.error("❌ Error creando administrador global:", error.message);
    throw error;
  }
};