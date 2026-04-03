// src/Components/Header/Header.jsx
import React, { useState } from 'react'
import styles from './Header.module.css'
import { useAuth } from '../../context/AuthContext'
import { Bell, Calendar, Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import Notificaciones from '../Notifications/Notifications'
import BranchSelector from '../BranchSelector/BranchSelector'

const Header = ({ onOpenSidebar }) => {
  const { user } = useAuth()
  const location = useLocation()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Extraemos el rol normalizado para la validación visual
  const isSuperAdmin = user?.role?.replace("ROLE_", "").toUpperCase() === "SUPER_ADMIN";

  const getSectionTitle = (path) => {
    const titles = {
      '/': 'Dashboard',
      '/clientes': 'Gestión de Socios',
      '/pagos': 'Pagos y Facturación',
      '/planes': 'Planes y Membresías',
      '/cierre-caja': 'Caja Diaria',
      '/configuracion': 'Staff y Permisos',
      '/asistencia': 'Control de Asistencia',
      '/rutinas': 'Rutinas de Entrenamiento',
      '/gestion-gimnasios': 'Ecosistema SaaS',
      '/movimientos': 'Auditoría de Movimientos'
    }
    return titles[path] || 'Panel de Control';
  }

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        {/* Contenedor que agrupa Título + Selector */}
        <div className={styles.titleGroup}>
          <div className={styles.sectionBadge}>
            <button className={styles.menuBtn} onClick={onOpenSidebar} title="Abrir menú">
              <Menu size={24} />
            </button>
            
            <span className={styles.dot}></span>
            <h1 className={styles.sectionTitle}>{getSectionTitle(location.pathname)}</h1>
          </div>

          {/* 👑 Selector Global: Solo visible para SuperAdmins */}
          {isSuperAdmin && (
            <div className={styles.globalControl}>
              <BranchSelector />
            </div>
          )}
        </div>

        <div className={styles.dateDisplay}>
          <Calendar size={14} />
          <span style={{ textTransform: 'capitalize' }}>
            {new Date().toLocaleDateString('es-ES', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </span>
        </div>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.userGreeting}>
          <span className={styles.welcomeText}>Hola,</span>
          <span className={styles.userName}>
            {user?.first_name || user?.name || 'Admin'}
          </span>
        </div>

        <button 
          className={styles.notifBtn} 
          onClick={() => setIsDrawerOpen(true)} 
          title="Notificaciones"
        >
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