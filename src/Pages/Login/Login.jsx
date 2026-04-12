// src/Pages/Login/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";
import { useAuth } from "../../context/AuthContext";
import { Lock, Mail, Loader2 } from "lucide-react";
// 1. Importamos el servicio de movimientos
import { registrarMovimiento } from "../../assets/services/movimientosService";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Intentamos el login a través del contexto
      const loggedUser = await login({ 
        usuario: formData.email, 
        password: formData.password 
      });

      if (loggedUser) {
        // 2. REGISTRAMOS EL MOVIMIENTO EN EL LOG
        // El loggedUser ya trae el ID y el nombre del objeto que retorna el context/supabase
        await registrarMovimiento(
          loggedUser.id, 
          'Sistema', 
          'LOGIN', 
          `Sesión iniciada correctamente desde el panel administrativo.`
        );

        // Si el login es exitoso, navegamos al home
        navigate("/"); 
      }
    } catch (err) {
      // Si el error es por credenciales, lo mostramos
      setError(err.message || "Credenciales incorrectas o error de conexión.");
      
      // OPCIONAL: Podrías registrar intentos fallidos si tuvieras el ID, 
      // pero como falló el login, el ID suele ser desconocido.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.loginContainer}>
        <header className={styles.header}>
          <h1 className={styles.logo}>GenFit <span>CRM</span></h1>
          <h2 className={styles.title}>¡Bienvenido de nuevo!</h2>
          <p className={styles.subtitle}>Ingresá tus credenciales para acceder</p>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
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

          <div className={styles.inputGroup}>
            <label htmlFor="password">Contraseña</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={18} />
              <input
                type="password"
                name="password"
                id="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className={styles.spinner} size={18} />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              "Ingresar al panel"
            )}
          </button>
        </form>

        <footer className={styles.footer}>
          <p>Acceso exclusivo para el personal autorizado</p>
        </footer>
      </div>
    </div>
  );
};

export default Login;