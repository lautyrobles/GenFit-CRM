// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { login as loginAPI } from "../assets/services/authService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  /* ===================================================
     🔄 Cargar sesión guardada (Persistencia)
     =================================================== */
  useEffect(() => {
    // Revisamos si hay sesión en LocalStorage
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("fitseoUser");

    if (!token || !storedUser) return;

    try {
      const parsed = JSON.parse(storedUser);

      // Normalizamos a mayúsculas por seguridad
      const currentRole = parsed.role ? parsed.role.toUpperCase() : "";

      // ❌ SEGURIDAD: Si es un CLIENTE (Alumno), no lo dejamos entrar al CRM
      if (currentRole === "CLIENT" || currentRole === "USER") {
        console.warn("⛔ Acceso denegado: Los clientes usan la App móvil.");
        logout();
        return;
      }

      setUser({ ...parsed, role: currentRole });
    } catch (err) {
      console.error("❌ Error recuperando sesión:", err);
      logout();
    }
  }, []);

  /* ===================================================
     🔐 LOGIN
     =================================================== */
  const login = async ({ usuario, password }) => {
    console.log("🔐 Intentando login con:", usuario);

    try {
      // Llamamos a nuestro servicio (authService.js) que conecta con Supabase
      // Nota: 'usuario' debe ser el email
      const data = await loginAPI(usuario, password);

      if (!data) return false;

      // Normalizar rol
      const normalizedRole = data.role ? data.role.toUpperCase() : "";

      // ❌ Bloquear acceso si es Cliente
      if (normalizedRole === "CLIENT") {
        console.warn("⛔ Usuario bloqueado (Es Cliente)");
        // Opcional: Mostrar alerta visual aquí o dejar que el componente lo maneje
        throw new Error("Tu cuenta es de alumno. Descarga la App para ingresar.");
      }

      // Preparamos el usuario para el estado global
      const fixedUser = { ...data, role: normalizedRole };

      setUser(fixedUser);
      console.log("✅ Login Exitoso:", fixedUser.email);
      return true;

    } catch (err) {
      console.error("❌ Error en AuthContext:", err.message);
      // Retornamos false o lanzamos el error según prefieras manejarlo en el UI
      throw err; 
    }
  };

  /* ===================================================
     🔓 LOGOUT
     =================================================== */
  const logout = () => {
    console.log("🔒 Cerrando sesión...");
    localStorage.removeItem("token");
    localStorage.removeItem("fitseoUser");
    setUser(null);
    window.location.href = "/"; // Recarga completa para limpiar estados de memoria
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);