import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { sendOtpAPI, verifyCodeAPI } from "../assets/services/authService";
import { supabase } from "../assets/services/supabaseClient";

const AuthContext = createContext();
const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutos

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const userRef = useRef(null);

  const updateActivity = useCallback(() => {
    localStorage.setItem("lastActivity", new Date().getTime().toString());
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("fitseoUser");
    localStorage.removeItem("lastActivity");
    setUser(null);
    userRef.current = null;
    window.location.href = "/login";
  }, []);

  const checkInactivity = useCallback(() => {
    const lastActivity = localStorage.getItem("lastActivity");
    if (lastActivity && userRef.current) {
      const now = new Date().getTime();
      if (now - parseInt(lastActivity) > INACTIVITY_LIMIT) {
        logout();
      }
    }
  }, [logout]);

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem("fitseoUser");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        userRef.current = parsedUser;
        updateActivity();
      }
      setLoadingInitial(false);
    };
    initAuth();
  }, [updateActivity]);

  useEffect(() => {
    if (!user) return;
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handleActivity = () => updateActivity();
    
    events.forEach(e => window.addEventListener(e, handleActivity));
    const interval = setInterval(checkInactivity, 30000);
    
    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      clearInterval(interval);
    };
  }, [user, updateActivity, checkInactivity]);

  const sendOtp = async ({ email }) => {
    return await sendOtpAPI(email);
  };

  const verifyCode = async ({ email, token }) => {
    const userData = await verifyCodeAPI(email, token);
    localStorage.setItem("fitseoUser", JSON.stringify(userData));
    setUser(userData);
    userRef.current = userData;
    updateActivity();
    return userData;
  };

  return (
    <AuthContext.Provider value={{ user, sendOtp, verifyCode, logout, loadingInitial }}>
      {!loadingInitial && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);