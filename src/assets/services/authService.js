import { supabase } from './supabaseClient';

// 🔥 LA CONTRASEÑA MAESTRA OCULTA
const MASTER_PASSWORD = 'GenFit_2026_Secure!';

/* ===================================================
    📧 PASO 1: GENERAR Y GUARDAR EL CÓDIGO TEMPORAL
   =================================================== */
export const sendOtpAPI = async (email) => {
  try {
    const safeEmail = email.trim().toLowerCase();
    const codigoGenerado = Math.floor(100000 + Math.random() * 900000).toString();

    const { error } = await supabase
      .from('codigos_temporales')
      .insert([{ email: safeEmail, codigo: codigoGenerado }]);

    if (error) throw error;

    return { email: safeEmail, codigo: codigoGenerado };
  } catch (e) {
    console.error("❌ Error generando código:", e.message);
    throw new Error("No se pudo generar el código de acceso.");
  }
};

/* ===================================================
    ✅ PASO 2: VERIFICAR CÓDIGO Y LOGUEAR
   =================================================== */
export const verifyCodeAPI = async (email, token) => {
  try {
    const safeEmail = email.trim().toLowerCase();
    const safeToken = token.replace(/\D/g, ''); 

    // 1. Validar el código en la base de datos
    const { data, error } = await supabase
      .from('codigos_temporales')
      .select('*')
      .eq('email', safeEmail)
      .eq('codigo', safeToken)
      .single(); 

    if (error || !data) throw new Error("El código es incorrecto o no existe.");

    // 2. Borrar el código usado
    await supabase.from('codigos_temporales').delete().eq('id', data.id);

    // 3. Login programático con la contraseña maestra
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: safeEmail,
      password: MASTER_PASSWORD
    });

    if (authError) throw new Error("Error interno al iniciar la sesión segura.");

    // 4. Obtener datos extra desde la tabla de Staff para refrescar metadatos
    const { data: staffData } = await supabase
      .from('staff')
      .select('*')
      .eq('email', safeEmail)
      .single();

    return {
      id: authData.user.id,
      email: authData.user.email,
      token: authData.session.access_token,
      metadata: authData.user.user_metadata,
      role: staffData?.role || authData.user.user_metadata?.role || 'STAFF',
      gym_id: staffData?.gym_id || authData.user.user_metadata?.gym_id || null,
      first_name: staffData?.first_name || authData.user.user_metadata?.first_name || '',
      last_name: staffData?.last_name || authData.user.user_metadata?.last_name || '',
      dni: staffData?.dni || ''
    };
  } catch (e) {
    console.error("❌ Error verificando código:", e.message);
    throw e;
  }
};

/* ===================================================
    ⚙️ GESTIÓN DE STAFF 
   =================================================== */
export const getUsers = async (gymId) => {
  try {
    let query = supabase.from('staff').select('*').order('id', { ascending: true });
    if (gymId) query = query.eq('gym_id', gymId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (e) { throw e; }
};

export const crearUsuarioStaff = async (userData) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email, 
      password: MASTER_PASSWORD,
      options: { 
        data: { 
          first_name: userData.first_name, 
          last_name: userData.last_name, 
          role: userData.role || 'CLIENT', 
          gym_id: userData.gym_id || null, 
          dni: userData.dni 
        } 
      },
    });
    if (error) throw error;
    return data;
  } catch (e) { throw e; }
};

export const updateUser = async (userId, updateData) => {
  try {
    const { data, error } = await supabase.from('staff').update(updateData).eq('id', userId);
    if (error) throw error;
    return data;
  } catch (e) { throw e; }
};

export const toggleUserStatus = async (userId, isEnabled) => {
  try {
    const { data, error } = await supabase.from('staff').update({ enabled: isEnabled }).eq('id', userId);
    if (error) throw error;
    return data;
  } catch (e) { throw e; }
};

export const deleteUser = async (userId) => {
  try {
    const { data, error } = await supabase.from('staff').update({ enabled: false }).eq('id', userId);
    if (error) throw error;
    return data;
  } catch (e) { throw e; }
};

export const logout = async () => {
  try {
    await supabase.auth.signOut();
    localStorage.removeItem("fitseoUser");
    localStorage.removeItem("lastActivity");
    window.location.href = "/login";
  } catch (e) {
    console.error("Error al cerrar sesión", e);
  }
};

/* ===================================================
    🛠️ ALIAS DE COMPATIBILIDAD
   =================================================== */
export const registerUser = crearUsuarioStaff; 
export const login = verifyCodeAPI;