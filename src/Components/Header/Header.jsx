import React, { useState } from 'react'
import styles from './Header.module.css'
import { useAuth } from '../../context/AuthContext'
import { Bell, Calendar, X, UserCheck, CreditCard } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const Header = () => {
  const { user } = useAuth()
  const location = useLocation()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Títulos dinámicos según la ruta actual
  const getSectionTitle = (path) => {
    switch(path) {
      case '/': return 'Dashboard';
      case '/clientes': return 'Gestión de Clientes';
      case '/pagos': return 'Pagos y Facturación';
      case '/planes': return 'Planes de Entrenamiento';
      case '/movimientos': return 'Caja Diaria';
      case '/configuracion': return 'Permisos y Acceso';
      default: return 'Panel';
    }
  }

  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);

  return (
    <>
      <header className={styles.header}>
        {/* Lado Izquierdo: Título y Fecha */}
        <div className={styles.leftSection}>
          <div className={styles.sectionBadge}>
            <span className={styles.dot}></span>
            <h1 className={styles.sectionTitle}>{getSectionTitle(location.pathname)}</h1>
          </div>
          <div className={styles.dateDisplay}>
            <Calendar size={14} />
            <span>{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        </div>

        {/* Lado Derecho: Usuario y Notificaciones */}
        <div className={styles.rightSection}>
          <div className={styles.userGreeting}>
            <span className={styles.welcomeText}>Hola,</span>
            <span className={styles.userName}>{user?.name || 'Admin'}</span>
          </div>

          <button className={styles.notifBtn} onClick={toggleDrawer} title="Notificaciones">
            <Bell size={22} />
            <span className={styles.notifIndicator}></span>
          </button>
        </div>
      </header>

      {/* Overlay y Drawer Lateral */}
      <div 
        className={`${styles.drawerOverlay} ${isDrawerOpen ? styles.overlayVisible : ''}`} 
        onClick={toggleDrawer}
      >
        <aside 
          className={`${styles.drawer} ${isDrawerOpen ? styles.drawerOpen : ''}`} 
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.drawerHeader}>
            <div className={styles.drawerTitle}>
              <Bell size={20} />
              <h3>Notificaciones</h3>
            </div>
            <button className={styles.closeBtn} onClick={toggleDrawer}>
              <X size={24} />
            </button>
          </div>

          <div className={styles.drawerContent}>
            <span className={styles.groupLabel}>Actividad Reciente</span>
            
            {/* Ítem de Asistencia */}
            <div className={styles.notifItem}>
              <div className={`${styles.iconBox} ${styles.asistencia}`}>
                <UserCheck size={18} />
              </div>
              <div className={styles.notifText}>
                <p><strong>Lautaro Robles</strong> dio el presente</p>
                <span>Hace 2 min</span>
              </div>
            </div>

            {/* Ítem de Pago */}
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
      </div>
    </>
  )
}

export default Header