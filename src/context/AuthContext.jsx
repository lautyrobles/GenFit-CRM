// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { login as loginAPI } from "../assets/services/authService";
// 1. Importamos el servicio de movimientos
import { registrarMovimiento } from "../assets/services/movimientosService";

const AuthContext = createContext();
const INACTIVITY_LIMIT = 15 * 60 * 1000; 

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  // Referencia para acceder al estado actual del usuario dentro de funciones estables (useCallback)
  // Esto es clave para que el logout sepa qué ID registrar sin depender del ciclo de renderizado
  const userRef = useRef(null);

  // Sincronizamos la referencia cada vez que el usuario cambia
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /* ===================================================
      🔐 LOGOUT (Manual y Automático)
     =================================================== */
  const logout = useCallback(async (reason = "manual") => {
    console.log(`🔒 Sesión finalizada (${reason}).`);
    
    // 2. Registramos el movimiento antes de limpiar los estados
    if (userRef.current) {
      const detalle = reason === "inactivity" 
        ? "Sesión cerrada automáticamente por inactividad (15 min)."
        : "El usuario cerró sesión de forma manual.";
        
      await registrarMovimiento(userRef.current.id, 'Sistema', 'LOGOUT', detalle);
    }

    localStorage.removeItem("fitseoUser");
    localStorage.removeItem("lastActivity");
    setUser(null);
    userRef.current = null;

    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }, []);

  const updateActivity = useCallback(() => {
    localStorage.setItem("lastActivity", new Date().getTime().toString());
  }, []);

  const checkInactivity = useCallback(() => {
    const lastActivity = localStorage.getItem("lastActivity");
    const storedUser = localStorage.getItem("fitseoUser");

    if (lastActivity && storedUser) {
      const now = new Date().getTime();
      if (now - parseInt(lastActivity) > INACTIVITY_LIMIT) {
        logout("inactivity"); // 👈 Pasamos la razón para el log
      }
    }
  }, [logout]);

  /* ===================================================
      🔄 CARGA INICIAL
     =================================================== */
  useEffect(() => {
    const initAuth = () => {
      const storedUser = localStorage.getItem("fitseoUser");
      const lastActivity = localStorage.getItem("lastActivity");

      if (storedUser && lastActivity) {
        const now = new Date().getTime();
        if (now - parseInt(lastActivity) > INACTIVITY_LIMIT) {
          logout("inactivity");
        } else {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            userRef.current = parsedUser;
            updateActivity();
          } catch (e) {
            logout();
          }
        }
      }
      setLoadingInitial(false);
    };

    initAuth();
  }, [logout, updateActivity]);

  /* ===================================================
      🖱️ LISTENERS DE ACTIVIDAD
     =================================================== */
  useEffect(() => {
    if (!user) return;

    const handleUserActivity = () => updateActivity();
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach(event => window.addEventListener(event, handleUserActivity));
    
    const interval = setInterval(checkInactivity, 30000); 

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
      if (normalizedRole === "CLIENT") {
        throw new Error("Acceso denegado: Los clientes deben usar la App móvil.");
      }

      const fixedUser = { ...data, role: normalizedRole };
      
      localStorage.setItem("fitseoUser", JSON.stringify(fixedUser));
      updateActivity(); 

      setUser(fixedUser);
      userRef.current = fixedUser;
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