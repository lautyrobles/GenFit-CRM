// src/Components/BranchSelector/BranchSelector.jsx
import React, { useEffect, useState } from 'react';
import styles from './BranchSelector.module.css';
import { useAuth } from '../../context/AuthContext';
import { obtenerTodosLosGimnasios } from '../../assets/services/superAdminService';
import { Globe, ChevronDown } from 'lucide-react';

const BranchSelector = () => {
  const { user, selectedGymId, cambiarSucursal } = useAuth();
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Solo nos interesa si el usuario es SuperAdmin
  const isSuperAdmin = user?.role?.replace("ROLE_", "").toUpperCase() === "SUPER_ADMIN";

  useEffect(() => {
    if (isSuperAdmin) {
      const cargarGyms = async () => {
        try {
          const data = await obtenerTodosLosGimnasios();
          setGyms(data);
        } catch (e) {
          console.error("Error al cargar selector de sucursales:", e);
        } finally {
          setLoading(false);
        }
      };
      cargarGyms();
    }
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return null;

  return (
    <div className={styles.selectorContainer}>
      <div className={styles.iconWrapper}>
        <Globe size={16} />
      </div>
      <select 
        className={styles.select}
        value={selectedGymId || ''} 
        onChange={(e) => cambiarSucursal(e.target.value)}
        disabled={loading}
      >
        <option value="" disabled>Seleccionar Sucursal...</option>
        {gyms.map(gym => (
          <option key={gym.id} value={gym.id}>
            {gym.name} {gym.enabled ? '' : '(Inactivo)'}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className={styles.arrow} />
    </div>
  );
};

export default BranchSelector;