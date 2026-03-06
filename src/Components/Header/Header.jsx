import React, { useState } from 'react'
import styles from './Header.module.css'
import { useAuth } from '../../context/AuthContext'
import { Bell, Calendar } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import Notificaciones from '../Notifications/Notifications' // 👈 Importamos el nuevo componente

const Header = () => {
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
      '/asistencia': 'Control de Asistencia', // 👈 Agregamos la nueva ruta
      '/nutricion': 'Módulo de Nutrición'     // 👈 Agregamos la nueva ruta
    }
    return titles[path] || 'Panel';
  }

  return (
    <header className={styles.header}>
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

      {/* Componente Modular de Notificaciones */}
      <Notificaciones 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />
    </header>
  )
}

export default Header