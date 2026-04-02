// src/Components/Sidebar/Sidebar.jsx

import React from 'react'
import styles from './Sidebar.module.css'
// 👉 Usamos 'Archive' de lucide-react para mantener todo uniforme
import { 
  Home, Users, CreditCard, Gift, HelpCircle, 
  Activity, LogOut, CheckCircle, ClipboardList, Apple, Archive
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import userIcon from '/src/assets/user-icon.png'
import { useAuth } from '../../context/AuthContext'

const Sidebar = () => {
  const { user, logout } = useAuth()

  if (!user) return null

  // Normalizamos el rol para que no falle por mayúsculas o prefijos
  const role = (user.roles?.[0] || user.role || "").replace("ROLE_", "").toUpperCase();

  // AÑADIMOS "SUPERVISOR" a las condiciones de vista
  const canViewPagos = ["SUPER_ADMIN", "ADMIN", "ENCARGADO", "SUPERVISOR"].includes(role)
  const canViewPlanes = ["SUPER_ADMIN", "ADMIN", "ENCARGADO", "SUPERVISOR"].includes(role)
  // 👉 Nueva condición para la caja
  const canViewCaja = ["SUPER_ADMIN", "ADMIN", "ENCARGADO", "SUPERVISOR"].includes(role)
  
  // Estos se mantienen solo para Admins
  const canViewPermisos = ["SUPER_ADMIN", "ADMIN"].includes(role)
  const canViewMovimientos = ["SUPER_ADMIN", "ADMIN"].includes(role)

  // Concatenamos nombre y apellido si existen por separado, sino usamos user.name
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

          {/* GRUPO 2: GESTIÓN COMERCIAL - AHORA VISIBLE PARA SUPERVISOR */}
          {(canViewPagos || canViewPlanes || canViewCaja) && (
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
              
              {/* 👉 NUEVO BOTÓN: CIERRE DE CAJA */}
              {canViewCaja && (
                <NavLink to="/cierre-caja" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                  <Archive size={18} /> <span>Caja Diaria</span>
                </NavLink>
              )}
            </div>
          )}

          {/* GRUPO 3: SERVICIOS AL CLIENTE */}
          <div className={styles.navGroup}>
            <span className={styles.groupLabel}>Servicios</span>
            <NavLink to="/asistencia" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <CheckCircle size={18} /> <span>Asistencia</span>
            </NavLink>
            
            {/* 🛠️ RUTINAS */}
            <NavLink to="/rutinas" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <ClipboardList size={18} /> <span>Rutinas</span>
            </NavLink>
            
            {/* 🍎 NUTRICIÓN */}
            <div className={styles.navItemDisabled}>
              <div className={styles.navItemMain}>
                <Apple size={18} /> <span>Nutrición</span>
              </div>
              <span className={styles.badgePronto}>PRONTO</span>
            </div>
          </div>

          {/* GRUPO 4: ADMINISTRACIÓN - Sigue oculto para Supervisor */}
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

        {/* 👤 PERFIL DE USUARIO ACTUALIZADO */}
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