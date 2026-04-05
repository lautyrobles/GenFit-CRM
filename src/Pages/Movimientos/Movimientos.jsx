import React, { useState, useMemo, useEffect } from 'react'
import styles from './Movimientos.module.css'
import { useAuth } from '../../context/AuthContext'
import Loader from '../../Components/Loader/Loader'
import { obtenerMovimientos } from '../../assets/services/movimientosService'
import { Activity, Filter, Trash2, ShieldAlert, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const Movimientos = () => {
  // 🎯 Extraemos selectedGymId para el "Modo Dios" del SuperAdmin
  const { user, selectedGymId } = useAuth()
  
  // Normalizamos el rol para consistencia
  const role = user?.role?.replace("ROLE_", "").toUpperCase() || "";
  
  // 🛡️ Solo Admin y SuperAdmin pueden ver esta página (Refuerzo de seguridad interna)
  const isAllowed = role === 'SUPER_ADMIN' || role === 'ADMIN'

  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  
  // --- FILTROS ---
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [moduleFilter, setModuleFilter] = useState('ALL')
  const [selectedDate, setSelectedDate] = useState('')

  // --- PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    // Si no tiene permisos o no hay un gimnasio seleccionado, no cargamos nada
    if (!isAllowed || !selectedGymId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        // 🎯 Usamos selectedGymId que viene del selector del Header
        const data = await obtenerMovimientos(selectedGymId);
        
        const movimientosFormateados = data.map(log => ({
          id: log.id,
          datetime: log.created_at,
          userName: log.users ? `${log.users.first_name} ${log.users.last_name}` : 'Usuario eliminado',
          userEmail: log.users ? log.users.email : '-',
          role: log.users ? log.users.role?.replace("ROLE_", "").toUpperCase() : 'UNKNOWN',
          module: log.module,
          action: log.action, 
          detail: log.details 
        }))
        setMovimientos(movimientosFormateados)
      } catch (error) {
        console.error("❌ Error cargando logs de auditoría:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAllowed, selectedGymId]) // 🔄 Se refresca al cambiar de gimnasio en el Header

  const formatDateTime = (isoString) => {
    if (!isoString) return '-'
    const date = new Date(isoString)
    return date.toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const getRoleLabel = (r) => {
    const cleanRole = r?.replace("ROLE_", "").toUpperCase();
    switch (cleanRole) {
      case 'SUPER_ADMIN': return 'Super Admin'
      case 'ADMIN': return 'Administrador'
      case 'SUPERVISOR': return 'Supervisor'
      case 'TRAINER': return 'Coach'
      case 'STAFF': return 'Staff'
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
      case 'Configuración': return styles.badgePermisos
      case 'Sistema': return styles.badgeDefault
      default: return styles.badgeDefault
    }
  }

  const getActionBadgeClass = (action) => {
    const act = action?.toUpperCase();
    if (act?.includes('CREACIÓN') || act?.includes('ALTA')) return styles.actionCreate;
    if (act?.includes('ELIMINACIÓN') || act?.includes('BORRADO')) return styles.actionDelete;
    if (act?.includes('ACTUALIZACIÓN') || act?.includes('EDICIÓN')) return styles.actionUpdate;
    if (act?.includes('LOGIN')) return styles.actionLogin; // Opcional si tienes este estilo
    return styles.actionDefault;
  }

  const movimientosFiltrados = useMemo(() => {
    const filtrados = movimientos.filter((mov) => {
      if (roleFilter !== 'ALL') {
        const movRole = mov.role?.replace("ROLE_", "").toUpperCase();
        if (roleFilter === 'ADMIN' && movRole !== 'ADMIN' && movRole !== 'SUPER_ADMIN') return false
        if (roleFilter !== 'ADMIN' && movRole !== roleFilter) return false
      }
      if (moduleFilter !== 'ALL' && mov.module !== moduleFilter) return false
      if (selectedDate) {
        const movDate = new Date(mov.datetime)
        const localDateString = `${movDate.getFullYear()}-${String(movDate.getMonth() + 1).padStart(2, '0')}-${String(movDate.getDate()).padStart(2, '0')}`
        if (localDateString !== selectedDate) return false
      }
      return true
    })
    return filtrados;
  }, [movimientos, roleFilter, moduleFilter, selectedDate])

  // Reset de página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, moduleFilter, selectedDate, selectedGymId]);

  const totalPages = Math.ceil(movimientosFiltrados.length / itemsPerPage);
  const currentItems = movimientosFiltrados.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleClearFilters = () => {
    setRoleFilter('ALL'); 
    setModuleFilter('ALL'); 
    setSelectedDate('');
  }

  // UI de acceso denegado
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
      <div className={styles.topSection}>
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

        <div className={styles.filtersWrapper}>
          <div className={styles.filtersHeader}>
            <h4 className={styles.filterTitle}><Filter size={16}/> Filtros de Búsqueda</h4>
          </div>
          <div className={styles.filtersGrid}>
            <div className={styles.filterGroup}>
              <label>Usuario (Rol)</label>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="ALL">Todos los usuarios</option>
                <option value="ADMIN">Administradores</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="TRAINER">Coach</option>
              </select>
            </div>
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
            <div className={styles.filterGroup}>
              <label>Día Exacto</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
            <div className={styles.filterGroupAction}>
              <button type="button" className={styles.btnClear} onClick={handleClearFilters}>
                <Trash2 size={16} /> Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

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
                {currentItems.map((mov) => (
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
                    <td><span className={styles.rolePill}>{getRoleLabel(mov.role)}</span></td>
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

        {!loading && movimientosFiltrados.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Mostrando <strong>{currentItems.length}</strong> de <strong>{movimientosFiltrados.length}</strong> registros
            </div>
            <div className={styles.paginationControls}>
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(prev => prev - 1)}
                className={styles.pageBtn}
              >
                <ChevronLeft size={18} />
              </button>
              <span className={styles.pageNum}>
                Página <strong>{currentPage}</strong> de {totalPages}
              </span>
              <button 
                disabled={currentPage === totalPages || totalPages === 0} 
                onClick={() => setCurrentPage(prev => prev + 1)}
                className={styles.pageBtn}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default Movimientos;