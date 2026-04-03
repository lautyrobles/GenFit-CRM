// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { login as loginAPI } from "../assets/services/authService";
import { registrarMovimiento } from "../assets/services/movimientosService";

const AuthContext = createContext();
const INACTIVITY_LIMIT = 15 * 60 * 1000; 

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  // 🎯 ESTADO PARA MULTI-TENANCY GLOBAL (Selector de Gimnasio)
  const [selectedGymId, setSelectedGymId] = useState(null);

  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
    // Al cargar el usuario, inicializamos el gimnasio seleccionado
    if (user) {
      setSelectedGymId(user.gym_id);
    } else {
      setSelectedGymId(null);
    }
  }, [user]);

  /* ===================================================
      👑 LÓGICA DE SUPERADMIN (Cambio de Sucursal)
     =================================================== */
  
  // Esta función permite al SuperAdmin "saltar" entre datos de diferentes gyms
  const cambiarSucursal = useCallback((gymId) => {
    const role = userRef.current?.role?.replace("ROLE_", "").toUpperCase();
    if (role === "SUPER_ADMIN") {
      console.log(`🌐 Cambiando contexto de datos al Gym: ${gymId}`);
      setSelectedGymId(gymId);
    }
  }, []);

  /* ===================================================
      🔐 LOGOUT (Manual y Automático)
     =================================================== */
  const logout = useCallback(async (reason = "manual") => {
    console.log(`🔒 Sesión finalizada (${reason}).`);
    
    if (userRef.current) {
      const detalle = reason === "inactivity" 
        ? "Sesión cerrada automáticamente por inactividad (15 min)."
        : "El usuario cerró sesión de forma manual.";
        
      try {
        await registrarMovimiento(userRef.current.id, 'Sistema', 'LOGOUT', detalle);
      } catch (e) {
        console.error("Error al registrar logout:", e);
      }
    }

    localStorage.removeItem("fitseoUser");
    localStorage.removeItem("lastActivity");
    setUser(null);
    userRef.current = null;
    setSelectedGymId(null);

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
        logout("inactivity");
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

      const normalizedRole = data.role ? data.role.replace("ROLE_", "").toUpperCase() : "";
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
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loadingInitial, 
      selectedGymId, // 🔑 Exportamos el ID seleccionado
      cambiarSucursal // 🔑 Exportamos la función de cambio
    }}>
      {!loadingInitial && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);