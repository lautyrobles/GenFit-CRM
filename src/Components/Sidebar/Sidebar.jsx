import React from 'react'
import styles from './Sidebar.module.css'
import { 
  Home, Users, CreditCard, Gift, HelpCircle, 
  Activity, LogOut, CheckCircle, ClipboardList, Apple 
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import userIcon from '/src/assets/user-icon.png'
import { useAuth } from '../../context/AuthContext'

const Sidebar = () => {
  const { user, logout } = useAuth()

  if (!user) return null

  const role = user.roles?.[0] || user.role
  const canViewPagos = ["SUPER_ADMIN", "ADMIN", "ENCARGADO"].includes(role)
  const canViewPlanes = ["SUPER_ADMIN", "ADMIN", "ENCARGADO"].includes(role)
  const canViewPermisos = ["SUPER_ADMIN", "ADMIN"].includes(role)
  const canViewMovimientos = ["SUPER_ADMIN", "ADMIN"].includes(role)

  const mostrarRol = () => {
    switch (role) {
      case "SUPER_ADMIN": return "Super Admin"
      case "ADMIN": return "Admin"
      case "ENCARGADO": return "Encargado"
      default: return "Usuario"
    }
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.topSection}>
        <h1 className={styles.logo}>
          GenFIT <span>CRM</span>
        </h1>

        <nav className={styles.nav}>
          {/* GRUPO 1: GENERAL */}
          <div className={styles.navGroup}>
            <span className={styles.groupLabel}>General</span>
            <NavLink to="/" end className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <Home size={18} /> <span>Inicio</span>
            </NavLink>
            <NavLink to="/clientes" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <Users size={18} /> <span>Clientes</span>
            </NavLink>
          </div>

          {/* GRUPO 2: GESTIÓN COMERCIAL */}
          {(canViewPagos || canViewPlanes) && (
            <div className={styles.navGroup}>
              <span className={styles.groupLabel}>Gestión</span>
              {canViewPagos && (
                <NavLink to="/pagos" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                  <CreditCard size={18} /> <span>Pagos</span>
                </NavLink>
              )}
              {canViewPlanes && (
                <NavLink to="/planes" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                  <Gift size={18} /> <span>Planes</span>
                </NavLink>
              )}
            </div>
          )}

          {/* GRUPO 3: SERVICIOS AL CLIENTE (NUEVO) */}
          <div className={styles.navGroup}>
            <span className={styles.groupLabel}>Servicios</span>
            <NavLink to="/asistencia" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <CheckCircle size={18} /> <span>Asistencia</span>
            </NavLink>
            <NavLink to="/rutinas" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <ClipboardList size={18} /> <span>Rutinas</span>
            </NavLink>
            <NavLink to="/nutricion" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <Apple size={18} /> <span>Nutrición</span>
            </NavLink>
          </div>

          {/* GRUPO 4: ADMINISTRACIÓN */}
          {(canViewMovimientos || canViewPermisos) && (
            <div className={styles.navGroup}>
              <span className={styles.groupLabel}>Admin</span>
              {canViewMovimientos && (
                <NavLink to="/movimientos" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                  <Activity size={18} /> <span>Movimientos</span>
                </NavLink>
              )}
              {canViewPermisos && (
                <NavLink to="/configuracion" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
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
          <NavLink to="/soporte" className={styles.supportAction}>
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
              <h4 className={styles.userName}>{user.name}</h4>
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