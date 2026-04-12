import { supabase } from './supabaseClient';

export const MASTER_PASSWORD = 'GenFit_2026_Secure!';

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

export const verifyCodeAPI = async (email, token) => {
  try {
    const safeEmail = email.trim().toLowerCase();
    const safeToken = token.replace(/\D/g, ''); 
    const { data, error } = await supabase
      .from('codigos_temporales')
      .select('*')
      .eq('email', safeEmail)
      .eq('codigo', safeToken)
      .single(); 
    if (error || !data) throw new Error("El código es incorrecto o no existe.");
    await supabase.from('codigos_temporales').delete().eq('id', data.id);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: safeEmail,
      password: MASTER_PASSWORD
    });
    if (authError) throw new Error("Error interno al iniciar la sesión segura.");
    const { data: staffData } = await supabase.from('staff').select('*').eq('email', safeEmail).single();
    return {
      id: authData.user.id,
      email: authData.user.email,
      token: authData.session.access_token,
      metadata: authData.user.user_metadata,
      role: staffData?.role || authData.user.user_metadata?.role || 'STAFF',
      gym_id: staffData?.gym_id || authData.user.user_metadata?.gym_id || null,
      first_name: staffData?.first_name || '',
      last_name: staffData?.last_name || '',
      dni: staffData?.dni || ''
    };
  } catch (e) {
    console.error("❌ Error verificando código:", e.message);
    throw e;
  }
};

export const logout = async () => {
  try {
    await supabase.auth.signOut();
    localStorage.removeItem("fitseoUser");
    localStorage.removeItem("lastActivity");
    window.location.href = "/login";
  } catch (e) {}
};

export const login = verifyCodeAPI;