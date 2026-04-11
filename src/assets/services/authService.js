import { supabase } from "./supabaseClient";

/* ===================================================
    📧 PASO 1: ENVIAR CÓDIGO (OTP)
   =================================================== */
export const sendOtpAPI = async (email) => {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        // shouldCreateUser: false evita que cualquiera ponga un mail random y se cree una cuenta.
        // Solo enviará el código si el usuario ya fue creado previamente por un Admin.
        shouldCreateUser: false, 
      }
    });

    if (error) throw error;
    return data;
  } catch (e) {
    console.error("❌ Error enviando OTP:", e.message);
    throw new Error("No se pudo enviar el código. Verificá que el correo esté registrado.");
  }
};

/* ===================================================
    ✅ PASO 2: VERIFICAR CÓDIGO Y TRAER DATOS
   =================================================== */
export const verifyCodeAPI = async (email, token) => {
  try {
    const cleanEmail = email.trim();
    const cleanToken = token.trim();

    // 2. Verificamos el código contra Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'email', // <--- DEVOLVEMOS ESTO A 'email'
    });

    if (authError) throw new Error("El código es incorrecto o ha expirado.");

    // ... (el resto del código queda exactamente igual)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError) throw new Error("Perfil de usuario no encontrado en la base de datos.");

    if (!userData.enabled) {
      await supabase.auth.signOut();
      throw new Error("Tu cuenta ha sido deshabilitada. Contacta al administrador.");
    }

    return {
      ...userData,
      token: authData.session.access_token,
      email: authData.user.email,
      gym_id: userData.gym_id 
    };

  } catch (e) {
    console.error("❌ Error verificando código:", e.message);
    throw e;
  }
};

/* ===================================================
    🛠️ CREACIÓN DE STAFF UNIVERSAL (Jerarquía Multi-Tenant)
   =================================================== */
export const crearUsuarioStaff = async (datosNuevoUsuario, creadorId, creadorRol, creadorGymId) => {
  try {
    // Como ya no pedís contraseña en la interfaz, generamos una aleatoria segura 
    // solo para cumplir con el requisito obligatorio de Supabase Auth.
    // El usuario nunca la necesitará porque entrará con OTP (código al mail).
    const dummyPassword = Math.random().toString(36).slice(-10) + "A1!@";

    // 1. Registro en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: datosNuevoUsuario.email,
      password: dummyPassword, 
    });

    if (authError) throw new Error(`Error Auth: ${authError.message}`);

    // 2. Lógica de asignación de Gimnasio según la jerarquía
    let gymIdAsignado = null;

    if (datosNuevoUsuario.role === 'SUPER_ADMIN') {
      // Los SuperAdmins no tienen un gimnasio fijo, son globales
      gymIdAsignado = null;
    } else if (creadorRol === 'SUPER_ADMIN' && datosNuevoUsuario.role === 'ADMIN') {
      // Un SuperAdmin crea un Admin y le asigna una sucursal específica
      if (!datosNuevoUsuario.gym_id) throw new Error("Debes seleccionar un gimnasio para este Administrador.");
      gymIdAsignado = datosNuevoUsuario.gym_id;
    } else if (creadorRol === 'ADMIN' && datosNuevoUsuario.role === 'SUPERVISOR') {
      // Un Admin crea un Supervisor y hereda automáticamente su propio gym_id
      gymIdAsignado = creadorGymId;
    } else {
      throw new Error("No tienes permisos para crear este tipo de usuario.");
    }

    // 3. Guardamos en tu tabla 'users'
    const nuevoPerfil = {
      id: authData.user.id,
      first_name: datosNuevoUsuario.first_name,
      last_name: datosNuevoUsuario.last_name,
      email: datosNuevoUsuario.email,
      dni: datosNuevoUsuario.dni || null,
      role: datosNuevoUsuario.role,
      gym_id: gymIdAsignado,
      enabled: true
    };

    const { data, error: dbError } = await supabase
      .from('users')
      .insert([nuevoPerfil])
      .select()
      .single();

    if (dbError) throw new Error(`Error en Base de Datos: ${dbError.message}`);

    return data;
  } catch (error) {
    console.error("❌ Error en crearUsuarioStaff:", error);
    throw error;
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
    
    localStorage.removeItem("fitseoUser"); 
    window.location.href = "/login"; 
    
    return true;
  } catch (error) {
    console.error("❌ Error al cerrar sesión:", error.message);
    return false;
  }
};