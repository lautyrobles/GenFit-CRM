import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loadingInitial } = useAuth();

  if (loadingInitial) return null; // O un Loader

  const role = user?.role?.replace("ROLE_", "").toUpperCase();

  // Si no está logueado o su rol no está en la lista permitida
  if (!user || !allowedRoles.includes(role)) {
    console.warn(`🚫 Acceso denegado para el rol: ${role}`);
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;