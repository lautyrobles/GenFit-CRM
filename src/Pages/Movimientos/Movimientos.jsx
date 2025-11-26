import React, { useState, useMemo, useEffect } from 'react'
import styles from './Movimientos.module.css'
import { useAuth } from '../../context/AuthContext'
import { obtenerMovimientos } from '../../assets/services/movimientosService' // 👈 Importamos servicio

const Movimientos = () => {
  const { user } = useAuth()
  
  // Normalizamos el rol actual
  const role = user?.role || 'CLIENT'

  // Solo SUPER_ADMIN y ADMIN pueden ver este módulo
  const isAllowed = role === 'SUPER_ADMIN' || role === 'ADMIN'

  // ===========================
  // 🔹 Estado de filtros y Datos
  // ===========================
  const [movimientos, setMovimientos] = useState([]) // 👈 Ya no es mock
  const [loading, setLoading] = useState(true)
  
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [moduleFilter, setModuleFilter] = useState('ALL')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // ===========================
  // 🔹 Cargar Datos (Fetch)
  // ===========================
  useEffect(() => {
    if (!isAllowed) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await obtenerMovimientos()
        
        // Mapeamos la data de Supabase a la estructura que usa tu tabla
        const movimientosFormateados = data.map(log => ({
          id: log.id,
          datetime: log.created_at,
          // Manejo seguro por si el usuario fue borrado (users sería null)
          userName: log.users ? `${log.users.first_name} ${log.users.last_name}` : 'Usuario eliminado',
          userEmail: log.users ? log.users.email : '-',
          role: log.users ? log.users.role : 'UNKNOWN',
          module: log.module,
          action: log.action,
          detail: log.details
        }))

        setMovimientos(movimientosFormateados)
      } catch (error) {
        console.error("Error cargando logs:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAllowed])

  // ===========================
  // 🔹 Helpers
  // ===========================
  const formatDateTime = (isoString) => {
    if (!isoString) return '-'
    const date = new Date(isoString)
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleLabel = (r) => {
    switch (r) {
      case 'SUPER_ADMIN': return 'Super Admin'
      case 'ADMIN': return 'Admin'
      case 'SUPERVISOR': return 'Encargado'
      case 'TRAINER': return 'Entrenador'
      case 'CLIENT': return 'Cliente'
      default: return r
    }
  }

  const getModuleBadgeClass = (module) => {
    switch (module) {
      case 'Clientes': return styles.badgeClientes
      case 'Pagos': return styles.badgePagos
      case 'Planes': return styles.badgePlanes
      case 'Rutinas': return styles.badgeRutinas
      case 'Nutrición': return styles.badgeNutricion
      case 'Permisos': return styles.badgePermisos
      default: return styles.badgeDefault
    }
  }

  // ===========================
  // 🔹 Filtrado de movimientos (Lógica existente)
  // ===========================
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((mov) => {
      const termino = search.toLowerCase().trim()

      // Filtro de búsqueda por nombre/email/detalle
      if (termino) {
        const matchTexto =
          mov.userName.toLowerCase().includes(termino) ||
          mov.userEmail.toLowerCase().includes(termino) ||
          (mov.detail && mov.detail.toLowerCase().includes(termino))

        if (!matchTexto) return false
      }

      // Filtro por rol
      if (roleFilter !== 'ALL' && mov.role !== roleFilter) return false

      // Filtro por módulo
      if (moduleFilter !== 'ALL' && mov.module !== moduleFilter) return false

      // Filtro por tipo de acción
      if (actionFilter !== 'ALL' && mov.action !== actionFilter) return false

      // Filtro por rango de fechas
      if (dateFrom) {
        const from = new Date(dateFrom)
        const movDate = new Date(mov.datetime)
        if (movDate < from) return false
      }

      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        const movDate = new Date(mov.datetime)
        if (movDate > to) return false
      }

      return true
    })
  }, [movimientos, search, roleFilter, moduleFilter, actionFilter, dateFrom, dateTo])

  // ===========================
  // 🔹 Limpiar filtros
  // ===========================
  const handleClearFilters = () => {
    setSearch('')
    setRoleFilter('ALL')
    setModuleFilter('ALL')
    setActionFilter('ALL')
    setDateFrom('')
    setDateTo('')
  }

  // ===========================
  // 🔒 Vista no autorizada
  // ===========================
  if (!isAllowed) {
    return (
      <section className={styles.movimientosContainer}>
        <h2 className={styles.title}>Movimientos</h2>
        <div className={styles.notAllowedBox}>
          <p>⛔ No tenés permisos para ver el historial de movimientos.</p>
          <span>Solo los Super Admin y Admin pueden acceder a esta sección.</span>
        </div>
      </section>
    )
  }

  // ===========================
  // ✅ Vista principal
  // ===========================
  return (
    <section className={styles.movimientosContainer}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Movimientos</h2>
          <p className={styles.subtitle}>
            Auditoría de actividad del sistema.
          </p>
        </div>

        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Total Registros</span>
            <strong className={styles.summaryValue}>{movimientos.length}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Visibles</span>
            <strong className={styles.summaryValue}>{movimientosFiltrados.length}</strong>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filtersContainer}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label>Buscar</label>
            <input
              type="text"
              placeholder="Nombre, email o detalle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Rol</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">Todos</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPERVISOR">Encargado</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Módulo</label>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
            >
              <option value="ALL">Todos</option>
              <option value="Clientes">Clientes</option>
              <option value="Pagos">Pagos</option>
              <option value="Planes">Planes</option>
              <option value="Rutinas">Rutinas</option>
              <option value="Nutrición">Nutrición</option>
              <option value="Permisos">Permisos</option>
              <option value="Sistema">Sistema</option>
            </select>
          </div>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label>Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Acción</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="ALL">Todas</option>
              <option value="LOGIN">Login</option>
              <option value="CREACIÓN">Creación</option>
              <option value="ACTUALIZACIÓN">Actualización</option>
              <option value="ELIMINACIÓN">Eliminación</option>
              <option value="REGISTRO_PAGO">Registro de pago</option>
            </select>
          </div>

          <div className={styles.actionsGroup}>
            <button
              type="button"
              className={styles.btnClear}
              onClick={handleClearFilters}
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div className={styles.tableWrapper}>
        {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
                Cargando historial de movimientos...
            </div>
        ) : movimientosFiltrados.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No hay movimientos que coincidan con los filtros seleccionados.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Módulo</th>
                <th>Acción</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {movimientosFiltrados.map((mov) => (
                <tr key={mov.id}>
                  <td>{formatDateTime(mov.datetime)}</td>
                  <td>
                    <div className={styles.userCell}>
                      <span className={styles.userName}>{mov.userName}</span>
                      <span className={styles.userEmail}>{mov.userEmail}</span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.rolePill}>
                      {getRoleLabel(mov.role)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.moduleBadge} ${getModuleBadgeClass(
                        mov.module
                      )}`}
                    >
                      {mov.module}
                    </span>
                  </td>
                  <td>
                    <span className={styles.actionTag}>{mov.action}</span>
                  </td>
                  <td className={styles.detailCell}>{mov.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

export default Movimientos