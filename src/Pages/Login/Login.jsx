import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // 👈 Importante para redirigir
import styles from "./Login.module.css";
import { useAuth } from "../../context/AuthContext";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate(); // 👈 Hook para navegar
  const [loading, setLoading] = useState(false);

  // Supabase usa EMAIL, no "usuario" genérico
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Enviamos 'email' como 'usuario' porque así lo espera tu AuthContext
      const ok = await login({ 
        usuario: formData.email, 
        password: formData.password 
      });

      if (ok) {
        // ✅ Login exitoso -> Vamos al Dashboard
        navigate("/"); 
      } else {
        setError("Credenciales incorrectas o error de conexión.");
      }
    } catch (err) {
      // Aquí capturamos errores como "Tu cuenta es de alumno..."
      setError(err.message || "Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.loginContainer}>
        <h2 className={styles.title}>Ingresar</h2>
        <p className={styles.subtitle}>Accedé al panel de FitSEO CRM</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Correo Electrónico</label>
            <input
              type="email" 
              name="email"
              id="email"
              placeholder="admin@fitseo.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              name="password"
              id="password"
              placeholder="Contraseña"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={`${styles.submitBtn} ${
              loading ? styles.loadingBtn : ""
            }`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.buttonSpinner}></span>
                Ingresando...
              </>
            ) : (
              "Ingresar"
            )}
          </button>
        </form>

        <p className={styles.footerText}>
          Acceso restringido al personal autorizado
        </p>
      </div>
    </div>
  );
};

export default Login;