import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { tienePermiso } from "../config/permissions";

const ProtectedRoute = ({ permisoRequerido }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (permisoRequerido && !tienePermiso(user.role, permisoRequerido)) {
    return <Navigate to="/" replace />; // Redirige al inicio si no tiene permiso
  }

  return <Outlet />;
};

export default ProtectedRoute;