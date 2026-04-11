import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";
import { useAuth } from "../../context/AuthContext";
import { Mail, Loader2, Info, ShieldCheck, ArrowLeft } from "lucide-react"; 
import { registrarMovimiento } from "../../assets/services/movimientosService";

const Login = () => {
  // Asegurate de que tu AuthContext tenga la lógica para enviar y verificar el OTP
  const { sendOtp, verifyCode } = useAuth(); 
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); 
  const [formData, setFormData] = useState({ email: "", otp: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- PASO 1: Enviar correo con código ---
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Llamamos a la función que dispara el supabase.auth.signInWithOtp()
      await sendOtp({ email: formData.email });
      
      // Si el correo se envía correctamente, pasamos a pedir el código
      setStep(2); 
    } catch (err) {
      setError(err.message || "Hubo un error al enviar el código. Verificá tu correo.");
    } finally {
      setLoading(false);
    }
  };

  // --- PASO 2: Verificar el código ---
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Llamamos a la función que usa supabase.auth.verifyOtp()
      const loggedUser = await verifyCode({ 
        email: formData.email, 
        token: formData.otp 
      });

      if (loggedUser) {
        await registrarMovimiento(
          loggedUser.id, 
          'Sistema', 
          'LOGIN', 
          `Sesión iniciada correctamente (Acceso sin contraseña).`
        );
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
            {step === 1 ? "Ingresá tu correo para recibir un código de acceso" : "Ingresá el código que enviamos a tu correo"}
          </p>
        </header>

        {/* CARTEL DE INFORMACIÓN (PASO 1) */}
        {step === 1 && (
          <div className={styles.infoBanner}>
            <Info className={styles.infoIcon} size={20} />
            <p>
              Por seguridad, utilizamos un sistema de <strong>acceso sin contraseña</strong>. Te enviaremos un código de un solo uso a tu correo electrónico.
            </p>
          </div>
        )}

        {/* FORMULARIO PASO 1: SOLO CORREO */}
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
                  <span>Enviando código...</span>
                </>
              ) : (
                "Recibir código de acceso"
              )}
            </button>
          </form>
        )}

        {/* FORMULARIO PASO 2: CÓDIGO OTP */}
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
                  placeholder="123456"
                  maxLength="6"
                  className={styles.otpInput}
                  value={formData.otp}
                  onChange={handleChange}
                  required
                  autoComplete="one-time-code"
                />
              </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.buttonGroup}>
              <button 
                type="button" 
                className={styles.backBtn} 
                onClick={() => setStep(1)}
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
                ) : (
                  "Verificar e Ingresar"
                )}
              </button>
            </div>
          </form>
        )}

        <footer className={styles.footer}>
          <p>Acceso exclusivo para el personal autorizado</p>
        </footer>
      </div>
    </div>
  );
};
 
export default Login;