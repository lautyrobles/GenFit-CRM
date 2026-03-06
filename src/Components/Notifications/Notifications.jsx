import React from 'react';
import { Bell, X, UserCheck, CreditCard } from 'lucide-react';
import styles from '../Header/Header.module.css';

const Notificaciones = ({ isOpen, onClose }) => {
  return (
    <>
      {/* El Overlay ahora usa opacity para no cargar el procesador */}
      <div 
        className={`${styles.drawerOverlay} ${isOpen ? styles.overlayVisible : ''}`} 
        onClick={onClose}
      />

      {/* El Aside siempre existe, solo se desplaza por GPU */}
      <aside className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitle}>
            <Bell size={20} />
            <h3>Notificaciones</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.drawerContent}>
          <span className={styles.groupLabel}>Actividad Reciente</span>
          
          <div className={styles.notifItem}>
            <div className={`${styles.iconBox} ${styles.asistencia}`}>
              <UserCheck size={18} />
            </div>
            <div className={styles.notifText}>
              <p><strong>Lautaro Robles</strong> dio el presente</p>
              <span>Hace 2 min</span>
            </div>
          </div>

          <div className={styles.notifItem}>
            <div className={`${styles.iconBox} ${styles.pago}`}>
              <CreditCard size={18} />
            </div>
            <div className={styles.notifText}>
              <p>Pago recibido de <strong>Javier Milei</strong></p>
              <span>$15,000 • Plan Estudiantil</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Notificaciones;