import React from 'react'
import styles from './Sidebar.module.css'
import { Home, Users, CreditCard, Gift, HelpCircle, Activity } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import userIcon from '/src/assets/user-icon.png'
import { useAuth } from '../../context/AuthContext'

const Sidebar = () => {
  const { user, logout } = useAuth()

  if (!user) {
    return (
      <aside className={styles.sidebar}>
        <h1 className={styles.logo}>
          FitSEO <span>CRM</span>
        </h1>
        <div className={styles.minimalMessage}>
          <p>Iniciá sesión para acceder al panel</p>
        </div>
      </aside>
    )
  }

  // =====================================================
  // 🔹 Rol actual del usuario
  // =====================================================
  const role = user.roles?.[0] || user.role

  // =====================================================
  // 🔹 Permisos
  // =====================================================
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
      <h1 className={styles.logo}>
        FitSEO <span>CRM</span>
      </h1>

      <nav className={styles.nav}>
        <ul>
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <Home size={18} />
              <span>Inicio</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/clientes"
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <Users size={18} />
              <span>Clientes</span>
            </NavLink>
          </li>

          {canViewPagos && (
            <li>
              <NavLink
                to="/pagos"
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.active : ''}`
                }
              >
                <CreditCard size={18} />
                <span>Pagos</span>
              </NavLink>
            </li>
          )}

          {canViewPlanes && (
            <li>
              <NavLink
                to="/planes"
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.active : ''}`
                }
              >
                <Gift size={18} />
                <span>Planes</span>
              </NavLink>
            </li>
          )}

          {/* 🆕 MOVIMIENTOS - Solo Admins */}
          {canViewMovimientos && (
            <li>
              <NavLink
                to="/movimientos"
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.active : ''}`
                }
              >
                <Activity size={18} />
                <span>Movimientos</span>
              </NavLink>
            </li>
          )}

          {canViewPermisos && (
            <li>
              <NavLink
                to="/configuracion"
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.active : ''}`
                }
              >
                <HelpCircle size={18} />
                <span>Permisos</span>
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      <div className={styles.proBox}>
        <p>¿Tenés algún problema? ¡Contactanos!</p>
        <NavLink to="/soporte">
          <button>Soporte Técnico</button>
        </NavLink>
      </div>

      <div className={styles.userInfo}>
        <img src={userIcon} alt="Usuario" />
        <div className={styles.userTitle}>
          <h4>
            {user.name} {user.lastName}
          </h4>
          <span>{mostrarRol()}</span>
        </div>
      </div>

      <button onClick={logout} className={styles.logoutBtn}>
        Cerrar sesión
      </button>
    </aside>
  )
}

export default Sidebar
