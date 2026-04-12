import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";
import { useAuth } from "../../context/AuthContext";
import { Mail, Loader2, Info, ShieldCheck, ArrowLeft } from "lucide-react"; 
import { registrarMovimiento } from "../../assets/services/movimientosService";
import emailjs from '@emailjs/browser'; 

const Login = () => {
  const { sendOtp, verifyCode } = useAuth(); 
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); 
  const [formData, setFormData] = useState({ email: "", otp: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    if (e.target.name === "otp") {
      const val = e.target.value.replace(/\D/g, "");
      setFormData({ ...formData, otp: val });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  /* ===================================================
      📧 PASO 1: Generar código (Supabase) y enviarlo (EmailJS)
     =================================================== */
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Generamos y guardamos el código en la BD temporal
      const { email: safeEmail, codigo } = await sendOtp({ email: formData.email });
      
      // 2. Disparamos el correo real usando EmailJS
      await emailjs.send(
        'service_nbmafca',   // Ej: 'service_123xyz'
        'template_rykza0d',  // Ej: 'template_abc890'
        {
          to_email: safeEmail,     // Manda el mail al usuario
          codigo: codigo           // Inserta el número generado
        },
        'hEwd5jYf6MDsKm5NR'    // Tu Public Key de la cuenta
      );

      setStep(2); 
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo generar el código o enviar el correo.");
    } finally {
      setLoading(false);
    }
  };

  /* ===================================================
      ✅ PASO 2: Verificar contra la tabla temporal
     =================================================== */
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const loggedUser = await verifyCode({ 
        email: formData.email, 
        token: formData.otp 
      });

      if (loggedUser) {
        try {
          await registrarMovimiento(
            loggedUser.id, 
            'Sistema', 
            'LOGIN', 
            `Sesión iniciada correctamente.`,
            loggedUser.gym_id
          );
        } catch (movErr) {
          console.error("Aviso: No se pudo registrar el movimiento", movErr);
        }
        
        navigate("/"); 
      }
    } catch (err) {
      setError(err.message || "El código es incorrecto o ha expirado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.loginContainer}>
        <header className={styles.header}>
          <h1 className={styles.logo}>GenFit <span>CRM</span></h1>
          <h2 className={styles.title}>
            {step === 1 ? "Acceso al panel" : "Verificación de seguridad"}
          </h2>
          <p className={styles.subtitle}>
            {step === 1 
              ? "Ingresá tu correo para recibir un código de acceso" 
              : `Enviamos un código a ${formData.email}`}
          </p>
        </header>

        {step === 1 && (
          <div className={styles.infoBanner}>
            <Info className={styles.infoIcon} size={20} />
            <p>
              Por seguridad, utilizamos <strong>acceso sin contraseña</strong>. Te enviaremos un código de un solo uso.
            </p>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleEmailSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="email">Correo Electrónico</label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={18} />
                <input
                  type="email" 
                  name="email"
                  id="email"
                  placeholder="nombre@ejemplo.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className={styles.spinner} size={18} />
                  <span>Enviando...</span>
                </>
              ) : "Recibir código de acceso"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleOtpSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="otp">Código de 6 dígitos</label>
              <div className={styles.inputWrapper}>
                <ShieldCheck className={styles.inputIcon} size={18} />
                <input
                  type="text"
                  name="otp"
                  id="otp"
                  placeholder="000000"
                  maxLength="6"
                  className={styles.otpInput}
                  value={formData.otp}
                  onChange={handleChange}
                  required
                  autoFocus
                  autoComplete="one-time-code"
                />
              </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.buttonGroup}>
              <button 
                type="button" 
                className={styles.backBtn} 
                onClick={() => { setStep(1); setError(""); setFormData({...formData, otp: ""}); }}
                disabled={loading}
              >
                <ArrowLeft size={18} />
              </button>

              <button type="submit" className={styles.submitBtn} disabled={loading} style={{ flex: 1 }}>
                {loading ? (
                  <>
                    <Loader2 className={styles.spinner} size={18} />
                    <span>Verificando...</span>
                  </>
                ) : "Verificar e Ingresar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;