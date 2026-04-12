// src/Components/Sidebar/Sidebar.jsx

import React from 'react'
import styles from './Sidebar.module.css'
import { 
  Home, Users, CreditCard, Gift, HelpCircle, 
  Activity, LogOut, CheckCircle, ClipboardList, Apple, Archive, X
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import userIcon from '/src/assets/user-icon.png'
import { useAuth } from '../../context/AuthContext'

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth()

  if (!user) return null

  const role = (user.roles?.[0] || user.role || "").replace("ROLE_", "").toUpperCase();

  const canViewPagos = ["SUPER_ADMIN", "ADMIN", "ENCARGADO", "SUPERVISOR"].includes(role)
  const canViewPlanes = ["SUPER_ADMIN", "ADMIN", "ENCARGADO", "SUPERVISOR"].includes(role)
  const canViewCaja = ["SUPER_ADMIN", "ADMIN", "ENCARGADO", "SUPERVISOR"].includes(role)
  
  const canViewPermisos = ["SUPER_ADMIN", "ADMIN"].includes(role)
  const canViewMovimientos = ["SUPER_ADMIN", "ADMIN"].includes(role)

  const nombreCompleto = user?.first_name && user?.last_name 
    ? `${user.first_name} ${user.last_name}` 
    : user?.name || "Usuario GenFIT";

  const mostrarRol = () => {
    switch (role) {
      case "SUPER_ADMIN": return "Super Admin"
      case "ADMIN": return "Admin"
      case "SUPERVISOR": return "Supervisor" 
      default: return "Usuario"
    }
  }

  // Función para cerrar el sidebar al clickear un link (solo relevante en móviles)
  const handleNavLinkClick = () => {
    if (window.innerWidth <= 1024 && onClose) {
      onClose();
    }
  }

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <div className={styles.topSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1 className={styles.logo}>
            GenFIT <span>CRM</span>
          </h1>
          {/* Botón X visible solo en móviles cuando el sidebar está abierto */}
          <button className={styles.closeBtnMobile} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navGroup}>
            <span className={styles.groupLabel}>General</span>
            <NavLink 
              to="/" 
              end 
              onClick={handleNavLinkClick}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <Home size={18} /> <span>Inicio</span>
            </NavLink>
            <NavLink 
              to="/clientes" 
              onClick={handleNavLinkClick}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <Users size={18} /> <span>Clientes</span>
            </NavLink>
          </div>

          {(canViewPagos || canViewPlanes || canViewCaja) && (
            <div className={styles.navGroup}>
              <span className={styles.groupLabel}>Gestión</span>
              {canViewPagos && (
                <NavLink 
                  to="/pagos" 
                  onClick={handleNavLinkClick}
                  className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                  <CreditCard size={18} /> <span>Pagos</span>
                </NavLink>
              )}
              {canViewPlanes && (
                <NavLink 
                  to="/planes" 
                  onClick={handleNavLinkClick}
                  className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                  <Gift size={18} /> <span>Planes</span>
                </NavLink>
              )}
              {canViewCaja && (
                <NavLink 
                  to="/cierre-caja" 
                  onClick={handleNavLinkClick}
                  className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                  <Archive size={18} /> <span>Caja Diaria</span>
                </NavLink>
              )}
            </div>
          )}

          <div className={styles.navGroup}>
            <span className={styles.groupLabel}>Servicios</span>
            <NavLink 
              to="/asistencia" 
              onClick={handleNavLinkClick}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <CheckCircle size={18} /> <span>Asistencia</span>
            </NavLink>
            <NavLink 
              to="/rutinas" 
              onClick={handleNavLinkClick}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <ClipboardList size={18} /> <span>Rutinas</span>
            </NavLink>
            <div className={styles.navItemDisabled}>
              <div className={styles.navItemMain}>
                <Apple size={18} /> <span>Nutrición</span>
              </div>
              <span className={styles.badgePronto}>PRONTO</span>
            </div>
          </div>

          {(canViewMovimientos || canViewPermisos) && (
            <div className={styles.navGroup}>
              <span className={styles.groupLabel}>Admin</span>
              {canViewMovimientos && (
                <NavLink 
                  to="/movimientos" 
                  onClick={handleNavLinkClick}
                  className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                  <Activity size={18} /> <span>Movimientos</span>
                </NavLink>
              )}
              {canViewPermisos && (
                <NavLink 
                  to="/configuracion" 
                  onClick={handleNavLinkClick}
                  className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                  <HelpCircle size={18} /> <span>Permisos</span>
                </NavLink>
              )}
            </div>
          )}
        </nav>
      </div>

      <div className={styles.bottomSection}>
        <div className={styles.supportCard}>
          <div className={styles.supportContent}>
            <HelpCircle size={20} className={styles.supportIcon} />
            <div className={styles.supportText}>
              <p className={styles.supportTitle}>¿Necesitás ayuda?</p>
              <p className={styles.supportSub}>Estamos para asistirte</p>
            </div>
          </div>
          <NavLink to="/soporte" onClick={handleNavLinkClick} className={styles.supportAction}>
            Soporte Técnico
          </NavLink>
        </div>

        <div className={styles.userProfile}>
          <div className={styles.userAccount}>
            <div className={styles.avatarContainer}>
              <img src={userIcon} alt="Profile" className={styles.avatar} />
              <div className={styles.activeIndicator}></div>
            </div>
            <div className={styles.userDetails}>
              <h4 className={styles.userName}>{nombreCompleto}</h4>
              <span className={styles.userRole}>{mostrarRol()}</span>
            </div>
          </div>
          <button onClick={logout} className={styles.logoutAction} title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar