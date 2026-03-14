// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { login as loginAPI } from "../assets/services/authService";

const AuthContext = createContext();
const INACTIVITY_LIMIT = 15 * 60 * 1000; 

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  // Usamos una referencia para evitar que el intervalo dispare re-renders innecesarios
  const logoutTimerRef = useRef(null);

  const logout = useCallback(() => {
    console.log("🔒 Sesión finalizada.");
    localStorage.removeItem("fitseoUser");
    localStorage.removeItem("lastActivity");
    setUser(null);
    // Solo redirigir si no estamos ya en login para evitar bucles de redirección
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }, []);

  // Función para actualizar la actividad sin disparar re-renders
  const updateActivity = useCallback(() => {
    localStorage.setItem("lastActivity", new Date().getTime().toString());
  }, []);

  const checkInactivity = useCallback(() => {
    const lastActivity = localStorage.getItem("lastActivity");
    const storedUser = localStorage.getItem("fitseoUser");

    if (lastActivity && storedUser) {
      const now = new Date().getTime();
      if (now - parseInt(lastActivity) > INACTIVITY_LIMIT) {
        logout();
      }
    }
  }, [logout]);

  /* ===================================================
     🔄 1. CARGA INICIAL (Solo se ejecuta una vez)
     =================================================== */
  useEffect(() => {
    const initAuth = () => {
      const storedUser = localStorage.getItem("fitseoUser");
      const lastActivity = localStorage.getItem("lastActivity");

      if (storedUser && lastActivity) {
        const now = new Date().getTime();
        // Verificar si expiró mientras estaba cerrado
        if (now - parseInt(lastActivity) > INACTIVITY_LIMIT) {
          logout();
        } else {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            updateActivity();
          } catch (e) {
            logout();
          }
        }
      }
      setLoadingInitial(false);
    };

    initAuth();
  }, [logout, updateActivity]); // Estas funciones son estables gracias a useCallback

  /* ===================================================
     🖱️ 2. LISTENERS DE ACTIVIDAD
     =================================================== */
  useEffect(() => {
    if (!user) return;

    const handleUserActivity = () => updateActivity();

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach(event => window.addEventListener(event, handleUserActivity));
    
    // Intervalo para checkear inactividad
    const interval = setInterval(checkInactivity, 30000); // Check cada 30 seg

    return () => {
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
      clearInterval(interval);
    };
  }, [user, updateActivity, checkInactivity]);

  /* ===================================================
     🔐 LOGIN
     =================================================== */
  const login = async ({ usuario, password }) => {
    try {
      const data = await loginAPI(usuario, password);
      if (!data) return null;

      const normalizedRole = data.role ? data.role.toUpperCase() : "";
      if (normalizedRole === "CLIENTE") {
        throw new Error("Acceso denegado: Los clientes deben usar la App móvil.");
      }

      const fixedUser = { ...data, role: normalizedRole };
      
      localStorage.setItem("fitseoUser", JSON.stringify(fixedUser));
      updateActivity(); // Registrar tiempo inicial

      setUser(fixedUser);
      return fixedUser;
    } catch (err) {
      throw err; 
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loadingInitial }}>
      {!loadingInitial && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);