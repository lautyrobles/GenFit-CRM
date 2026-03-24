import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, UserCheck, UserPlus, RefreshCw } from 'lucide-react'; // Cambiamos Activity por UserPlus
import styles from '../Header/Header.module.css';
import { getRecentActivity } from '../../assets/services/notificationService';

const Notificaciones = ({ isOpen, onClose }) => {
  const [actividad, setActividad] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotificaciones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecentActivity();
      
      // 🎯 FILTRO CLAVE:
      // 1. Mantenemos todas las ASISTENCIAS.
      // 2. De los logs de SISTEMA, solo dejamos los de "CREACIÓN" de "Clientes".
      const datosFiltrados = data.filter(item => {
        if (item.tipo === 'ASISTENCIA') return true;
        
        // Si es de sistema, verificamos que el título/acción sea la que queremos
        // Basado en el mapeo de tu notificationService:
        return item.titulo === 'CREACIÓN' || item.titulo === 'Nuevo Socio Registrado';
      });

      setActividad(datosFiltrados);
    } catch (error) {
      console.error("Error cargando notificaciones:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotificaciones();
    }
  }, [isOpen, fetchNotificaciones]);

  const formatRelativeTime = (date) => {
    const now = new Date();
    const diffInMins = Math.floor((now - date) / 60000);

    if (diffInMins < 1) return 'Ahora mismo';
    if (diffInMins < 60) return `Hace ${diffInMins} min`;
    if (diffInMins < 1440) return `Hace ${Math.floor(diffInMins / 60)} hs`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <div 
        className={`${styles.drawerOverlay} ${isOpen ? styles.overlayVisible : ''}`} 
        onClick={onClose}
      />

      <aside className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitle}>
            <Bell size={20} />
            <h3>Notificaciones</h3>
          </div>
          <div className={styles.drawerActions}>
            <button 
              className={styles.refreshBtn} 
              onClick={fetchNotificaciones} 
              disabled={loading}
            >
              <RefreshCw size={18} className={loading ? styles.spinning : ''} />
            </button>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={24} />
            </button>
          </div>
        </div>

        <div className={styles.drawerContent}>
          <span className={styles.groupLabel}>Actividad Reciente</span>
          
          {loading && actividad.length === 0 && (
            <div className={styles.statusMsg}>Actualizando actividad...</div>
          )}

          {!loading && actividad.length === 0 && (
            <div className={styles.statusMsg}>No hay actividad relevante.</div>
          )}

          {actividad.map((item) => (
            <div key={item.id} className={styles.notifItem}>
              {/* Cambiamos el estilo del icono según el tipo */}
              <div className={`${styles.iconBox} ${item.tipo === 'ASISTENCIA' ? styles.asistencia : styles.nuevoUsuario}`}>
                {item.tipo === 'ASISTENCIA' ? <UserCheck size={18} /> : <UserPlus size={18} />}
              </div>
              <div className={styles.notifText}>
                <p><strong>{item.tipo === 'SISTEMA' ? 'Nuevo Socio Registrado' : item.titulo}</strong></p>
                <p className={styles.subtext}>{item.subtitulo}</p>
                <span>{formatRelativeTime(item.fecha)}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};

export default Notificaciones;