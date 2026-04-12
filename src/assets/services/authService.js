import { createClient } from '@supabase/supabase-client';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* ===================================================
    📧 PASO 1: ENVIAR EL CÓDIGO (OTP)
   =================================================== */
export const sendOtpAPI = async (email) => {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Al estar en 'false', solo enviará correo si el usuario ya existe en Supabase Auth
        shouldCreateUser: false, 
      },
    });

    if (error) {
      // Si el error es que el usuario no existe, personalizamos el mensaje
      if (error.message.includes("signup")) {
        throw new Error("El correo no está registrado en el sistema.");
      }
      throw error;
    }
    return data;
  } catch (e) {
    console.error("❌ Error enviando OTP:", e.message);
    throw e;
  }
};

/* ===================================================
    ✅ PASO 2: VERIFICAR CÓDIGO E INICIAR SESIÓN
   =================================================== */
export const verifyCodeAPI = async (email, token) => {
  try {
    const cleanEmail = email.trim();
    const cleanToken = token.trim();

    // Intentamos primero con type: 'email' (estándar OTP)
    let { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'email', 
    });

    // Si da 403 o error, intentamos con type: 'magiclink'
    // Esto es necesario porque con SMTP externo a veces cambia el contexto del token
    if (error) {
      console.warn("Intento con 'email' falló, reintentando con 'magiclink'...");
      const retry = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'magiclink',
      });
      
      if (retry.error) throw new Error("Código incorrecto, expirado o tipo de token inválido.");
      data = retry.data;
    }

    return {
      id: data.user.id,
      email: data.user.email,
      token: data.session.access_token,
      metadata: data.user.user_metadata
    };
  } catch (e) {
    console.error("❌ Error final de verificación:", e.message);
    throw e;
  }
};