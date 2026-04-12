import React from 'react'
import styles from './Sidebar.module.css'
import { 
  Home, Users, CreditCard, Gift, 
  Activity, LogOut, CheckCircle, ClipboardList, Archive, X, Building2, ShieldCheck
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import userIcon from '/src/assets/user-icon.png'
import { useAuth } from '../../context/AuthContext'

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth()

  if (!user) return null

  // 1. Normalización única para evitar errores de mayúsculas o guiones
  const normalize = (r) => r?.replace("ROLE_", "").replace("_", "").toUpperCase() || "";
  const role = normalize(user.role);

  // 2. Banderas de permisos corregidas
  const isSuperAdmin = role === "SUPERADMIN";
  const isAdminOrHigher = ["SUPERADMIN", "ADMIN"].includes(role);
  const isStaff = ["SUPERADMIN", "ADMIN", "SUPERVISOR", "ENCARGADO", "STAFF"].includes(role);

  const nombreCompleto = user?.first_name && user?.last_name 
    ? `${user.first_name} ${user.last_name}` 
    : user?.name || "Usuario GenFIT";

  const mostrarRol = () => {
    switch (role) {
      case "SUPERADMIN": return "Desarrollador"
      case "ADMIN": return "Dueño / Admin"
      case "SUPERVISOR": return "Supervisor" 
      default: return "Staff Operativo"
    }
  }

  const handleNavLinkClick = () => {
    if (window.innerWidth <= 1024 && onClose) {
      onClose();
    }
  }

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <div className={styles.topSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1 className={styles.logo}>GenFIT <span>CRM</span></h1>
          <button className={styles.closeBtnMobile} onClick={onClose}><X size={24} /></button>
        </div>

        <nav className={styles.nav}>
          {/* 👑 ECOSISTEMA (Solo SuperAdmin) */}
          {isSuperAdmin && (
            <div className={styles.navGroup}>
              <span className={styles.groupLabel}>Ecosistema SaaS</span>
              <NavLink to="/gimnasios" onClick={handleNavLinkClick} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''} ${styles.superItem}`}>
                <Building2 size={18} /> <span>Gimnasios</span>
              </NavLink>
            </div>
          )}

          {/* SECCIÓN GENERAL */}
          <div className={styles.navGroup}>
            <span className={styles.groupLabel}>General</span>
            <NavLink to="/" end onClick={handleNavLinkClick} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <Home size={18} /> <span>Inicio</span>
            </NavLink>
            <NavLink to="/clientes" onClick={handleNavLinkClick} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <Users size={18} /> <span>Socios</span>
            </NavLink>
          </div>

          {/* SECCIÓN GESTIÓN */}
          {isStaff && (
            <div className={styles.navGroup}>
              <span className={styles.groupLabel}>Gestión</span>
              <NavLink to="/pagos" onClick={handleNavLinkClick} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}><CreditCard size={18} /> <span>Pagos</span></NavLink>
              <NavLink to="/planes" onClick={handleNavLinkClick} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}><Gift size={18} /> <span>Planes</span></NavLink>
              <NavLink to="/cierre-caja" onClick={handleNavLinkClick} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}><Archive size={18} /> <span>Caja Diaria</span></NavLink>
            </div>
          )}

          {/* SECCIÓN SERVICIOS */}
          <div className={styles.navGroup}>
            <span className={styles.groupLabel}>Servicios</span>
            <NavLink to="/asistencia" onClick={handleNavLinkClick} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}><CheckCircle size={18} /> <span>Asistencia</span></NavLink>
            <NavLink to="/rutinas" onClick={handleNavLinkClick} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}><ClipboardList size={18} /> <span>Rutinas</span></NavLink>
          </div>

          {/* SECCIÓN ADMINISTRATIVA */}
          {isAdminOrHigher && (
            <div className={styles.navGroup}>
              <span className={styles.groupLabel}>Administración</span>
              <NavLink to="/movimientos" onClick={handleNavLinkClick} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}><Activity size={18} /> <span>Auditoría</span></NavLink>
              <NavLink to="/configuracion" onClick={handleNavLinkClick} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}><ShieldCheck size={18} /> <span>Staff y Permisos</span></NavLink>
            </div>
          )}
        </nav>
      </div>

      <div className={styles.bottomSection}>
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
          <button onClick={logout} className={styles.logoutAction} title="Cerrar sesión"><LogOut size={18} /></button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar;