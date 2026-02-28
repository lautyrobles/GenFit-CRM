import React, { useState, useMemo, useEffect } from 'react'
import styles from './Movimientos.module.css'
import { useAuth } from '../../context/AuthContext'
import Loader from '../../Components/Loader/Loader'
import { obtenerMovimientos } from '../../assets/services/movimientosService'
import { Activity, Filter, Trash2, ShieldAlert, Calendar } from 'lucide-react'

const Movimientos = () => {
  const { user } = useAuth()
  const role = user?.role || 'CLIENT'
  const isAllowed = role === 'SUPER_ADMIN' || role === 'ADMIN'

  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  
  // --- NUEVOS ESTADOS DE FILTRO EXACTOS ---
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [moduleFilter, setModuleFilter] = useState('ALL')
  const [selectedDate, setSelectedDate] = useState('')

  useEffect(() => {
    if (!isAllowed) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await obtenerMovimientos()
        const movimientosFormateados = data.map(log => ({
          id: log.id,
          datetime: log.created_at,
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

  const formatDateTime = (isoString) => {
    if (!isoString) return '-'
    const date = new Date(isoString)
    return date.toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const getRoleLabel = (r) => {
    switch (r) {
      case 'SUPER_ADMIN': return 'Super Admin'
      case 'ADMIN': return 'Administrador'
      case 'SUPERVISOR': return 'Supervisor'
      case 'TRAINER': return 'Coach'
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

  const getActionBadgeClass = (action) => {
    switch (action) {
      case 'CREACIÓN': return styles.actionCreate;
      case 'ELIMINACIÓN': return styles.actionDelete;
      case 'ACTUALIZACIÓN': return styles.actionUpdate;
      default: return styles.actionDefault;
    }
  }

  // ===========================
  // 🔹 Filtrado Exacto
  // ===========================
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((mov) => {
      
      // 1. Filtro por Rol (Incluye SUPER_ADMIN y ADMIN como "Administradores")
      if (roleFilter !== 'ALL') {
        if (roleFilter === 'ADMIN' && mov.role !== 'ADMIN' && mov.role !== 'SUPER_ADMIN') return false
        if (roleFilter !== 'ADMIN' && mov.role !== roleFilter) return false
      }

      // 2. Filtro por Módulo
      if (moduleFilter !== 'ALL' && mov.module !== moduleFilter) return false
      
      // 3. Filtro por Día Exacto (YYYY-MM-DD)
      if (selectedDate) {
        const movDate = new Date(mov.datetime)
        // Convertimos la fecha del log a formato local YYYY-MM-DD para comparar con el input
        const localDateString = `${movDate.getFullYear()}-${String(movDate.getMonth() + 1).padStart(2, '0')}-${String(movDate.getDate()).padStart(2, '0')}`
        
        if (localDateString !== selectedDate) return false
      }

      return true
    })
  }, [movimientos, roleFilter, moduleFilter, selectedDate])

  const handleClearFilters = () => {
    setRoleFilter('ALL'); 
    setModuleFilter('ALL'); 
    setSelectedDate('');
  }

  // Vista no autorizada
  if (!isAllowed) {
    return (
      <section className={styles.movimientosLayout}>
        <div className={styles.header}>
           <div className={styles.headerText}>
              <h2>Auditoría de Sistema</h2>
              <p>Historial de movimientos y control de acceso.</p>
           </div>
        </div>
        <div className={styles.notAllowedBox}>
          <ShieldAlert size={48} className={styles.iconLock} />
          <h3>Acceso Restringido</h3>
          <p>Esta sección requiere privilegios de Administrador para garantizar la seguridad del sistema.</p>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.movimientosLayout}>
      
      {/* BLOQUE SUPERIOR ESTÁTICO */}
      <div className={styles.topSection}>
        
        {/* Header & KPIs */}
        <div className={styles.headerRow}>
          <div className={styles.headerText}>
            <h2>Auditoría y Logs</h2>
            <p>Monitoreo en tiempo real de la actividad del CRM.</p>
          </div>

          <div className={styles.summaryCards}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Total Registros</span>
              <strong className={styles.summaryValue}>{movimientos.length}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Resultados Filtro</span>
              <strong className={styles.summaryValue}>{movimientosFiltrados.length}</strong>
            </div>
          </div>
        </div>

        {/* Panel de Filtros Simplificado */}
        <div className={styles.filtersWrapper}>
          <div className={styles.filtersHeader}>
            <h4 className={styles.filterTitle}><Filter size={16}/> Filtros de Búsqueda</h4>
          </div>
          
          <div className={styles.filtersGrid}>
            
            {/* 1. Rol de Usuario */}
            <div className={styles.filterGroup}>
              <label>Usuario (Rol)</label>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="ALL">Todos los usuarios</option>
                <option value="ADMIN">Administrador</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="TRAINER">Coach</option>
              </select>
            </div>

            {/* 2. Módulo */}
            <div className={styles.filterGroup}>
              <label>Módulo del Sistema</label>
              <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
                <option value="ALL">Todos los módulos</option>
                <option value="Clientes">Clientes</option>
                <option value="Pagos">Pagos</option>
                <option value="Planes">Planes</option>
                <option value="Rutinas">Rutinas</option>
                <option value="Nutrición">Nutrición</option>
                <option value="Permisos">Permisos</option>
                <option value="Sistema">Sistema</option>
              </select>
            </div>

            {/* 3. Día */}
            <div className={styles.filterGroup}>
              <label>Día Exacto</label>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
              />
            </div>
            
            {/* Acción Limpiar */}
            <div className={styles.filterGroupAction}>
              <button type="button" className={styles.btnClear} onClick={handleClearFilters} title="Limpiar filtros">
                <Trash2 size={16} /> Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BLOQUE INFERIOR: Tabla con Scroll Interno */}
      <div className={styles.tableCard}>
        <div className={styles.tableScrollArea}>
          {loading ? (
             <div className={styles.loaderArea}><Loader text="Sincronizando auditoría..." /></div>
          ) : movimientosFiltrados.length === 0 ? (
            <div className={styles.emptyState}>
              <Activity size={48} className={styles.emptyIcon} />
              <p>No hay movimientos que coincidan con los filtros actuales.</p>
            </div>
          ) : (
            <table className={styles.modernTable}>
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Operador</th>
                  <th>Rol</th>
                  <th>Módulo</th>
                  <th>Acción Realizada</th>
                  <th>Detalle Técnico</th>
                </tr>
              </thead>
              <tbody>
                {movimientosFiltrados.map((mov) => (
                  <tr key={mov.id}>
                    <td className={styles.dateCell}>
                      <Calendar size={12} className={styles.dateIcon}/>
                      {formatDateTime(mov.datetime)}
                    </td>
                    <td>
                      <div className={styles.userCell}>
                        <span className={styles.userName}>{mov.userName}</span>
                        <span className={styles.userEmail}>{mov.userEmail}</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.rolePill}>{getRoleLabel(mov.role)}</span>
                    </td>
                    <td>
                      <span className={`${styles.moduleBadge} ${getModuleBadgeClass(mov.module)}`}>
                        {mov.module}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.actionTag} ${getActionBadgeClass(mov.action)}`}>
                        {mov.action}
                      </span>
                    </td>
                    <td className={styles.detailCell}>{mov.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  )
}

export default Movimientos