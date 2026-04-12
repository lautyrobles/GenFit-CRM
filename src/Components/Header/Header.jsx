import React, { useState } from 'react'
import styles from './Header.module.css'
import { useAuth } from '../../context/AuthContext'
import { Bell, Calendar, Menu } from 'lucide-react' // 👈 Añadimos Menu
import { useLocation } from 'react-router-dom'
import Notificaciones from '../Notifications/Notifications'

const Header = ({ onOpenSidebar }) => { // 👈 Recibimos la función para abrir el sidebar
  const { user } = useAuth()
  const location = useLocation()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const getSectionTitle = (path) => {
    const titles = {
      '/': 'Dashboard',
      '/clientes': 'Gestión de Clientes',
      '/pagos': 'Pagos y Facturación',
      '/planes': 'Planes de Entrenamiento',
      '/movimientos': 'Caja Diaria',
      '/configuracion': 'Permisos y Acceso',
      '/asistencia': 'Control de Asistencia',
      '/nutricion': 'Módulo de Nutrición'
    }
    return titles[path] || 'Panel';
  }

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <div className={styles.sectionBadge}>
          {/* 🍔 BOTÓN HAMBURGUESA: Solo visible en pantallas pequeñas vía CSS */}
          <button className={styles.menuBtn} onClick={onOpenSidebar} title="Abrir menú">
            <Menu size={24} />
          </button>
          
          <span className={styles.dot}></span>
          <h1 className={styles.sectionTitle}>{getSectionTitle(location.pathname)}</h1>
        </div>
        <div className={styles.dateDisplay}>
          <Calendar size={14} />
          <span>{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.userGreeting}>
          <span className={styles.welcomeText}>Hola,</span>
          <span className={styles.userName}>{user?.name || 'Admin'}</span>
        </div>

        <button className={styles.notifBtn} onClick={() => setIsDrawerOpen(true)} title="Notificaciones">
          <Bell size={22} />
          <span className={styles.notifIndicator}></span>
        </button>
      </div>

      <Notificaciones 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />
    </header>
  )
}

export default Header