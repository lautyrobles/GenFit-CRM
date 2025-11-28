import React, { useState, useEffect, useMemo } from "react"
import { useLocation } from "react-router-dom"
import styles from "./Clientes.module.css"

// 📦 Servicios (Tus rutas originales)
import {
  obtenerClientes,
  obtenerClientePorDocumento,
  actualizarCliente, // Importamos servicio de actualización
} from "../../assets/services/clientesService"
import { obtenerPagosPorCliente } from "../../assets/services/pagosService"
import { obtenerPlanes } from "../../assets/services/planesService" // Importamos servicio de planes

// 🧩 Componentes
import RutinaNutricion from "./RutinaNutricion"

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const Clientes = () => {
  const location = useLocation()
  const [busqueda, setBusqueda] = useState("")
  const [filtroActivo, setFiltroActivo] = useState("nombre")
  const [cliente, setCliente] = useState(null)
  const [clientesCoincidentes, setClientesCoincidentes] = useState([])
  const [mostrarModal, setMostrarModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [busquedaRealizada, setBusquedaRealizada] = useState(false)
  const [inputInvalido, setInputInvalido] = useState(false)
  const [mensajeTemporal, setMensajeTemporal] = useState("")

  // 💳 Pagos
  const [pagos, setPagos] = useState([])
  const [pagosLoading, setPagosLoading] = useState(false)
  const [pagosError, setPagosError] = useState("")

  // ✏️ Estados para Edición (Modal Popup)
  const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false)
  const [saving, setSaving] = useState(false)
  const [planes, setPlanes] = useState([])
  const [formEdicion, setFormEdicion] = useState({
    dni: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    plan_id: "",
  })

  /* ===================================================
      🚀 EFECTO PARA CARGA DESDE TABLA
     =================================================== */
  useEffect(() => {
    if (location.state && location.state.clienteSeleccionado) {
      const clienteRecibido = location.state.clienteSeleccionado
      
      setCliente(clienteRecibido)
      setBusquedaRealizada(true)
      
      if (clienteRecibido.dni) {
        setBusqueda(clienteRecibido.dni.toString())
        setFiltroActivo("dni")
      } else {
        setBusqueda(`${clienteRecibido.first_name} ${clienteRecibido.last_name}`)
        setFiltroActivo("nombre")
      }
      
      window.history.replaceState({}, document.title)
    }
  }, [location])

  // Cargar planes al montar (para el select del modal de edición)
  useEffect(() => {
    const loadPlanes = async () => {
      try {
        const data = await obtenerPlanes()
        setPlanes(data || [])
      } catch (err) {
        console.error("Error cargando planes", err)
      }
    }
    loadPlanes()
  }, [])

  /* ===================================================
      📆 Asistencia simulada
     =================================================== */
  const asistencia30dias = useMemo(
    () =>
      Array.from({ length: 30 }, () =>
        Math.random() > 0.3
      ),
    [cliente?.dni]
  )

  /* ===================================================
      📊 Resumen de asistencia
     =================================================== */
  const asistenciaResumen = useMemo(() => {
    if (!asistencia30dias || asistencia30dias.length === 0) return null

    const total = asistencia30dias.length
    const presentes = asistencia30dias.filter(Boolean).length
    const ratio = (presentes / total) * 100

    if (ratio >= 80) return { label: "Asistencia alta", variant: "success" }
    if (ratio >= 50) return { label: "Asistencia media", variant: "warning" }
    return { label: "Asistencia baja", variant: "danger" }
  }, [asistencia30dias])

  /* ===================================================
      🔹 Buscar cliente
     =================================================== */
  const handleBuscar = async () => {
    if (!busqueda.trim()) {
      setInputInvalido(true)
      setMensajeTemporal("Ingrese un valor por favor")
      setTimeout(() => {
        setInputInvalido(false)
        setMensajeTemporal("")
      }, 2500)
      return
    }

    setLoading(true)
    setError("")
    setCliente(null)
    setClientesCoincidentes([])
    setBusquedaRealizada(true)

    try {
      let resultados = []

      if (filtroActivo === "dni" && /^\d+$/.test(busqueda)) {
        const data = await obtenerClientePorDocumento(busqueda)
        resultados = Array.isArray(data) ? data : data ? [data] : []
      } else if (filtroActivo === "nombre") {
        const clientes = await obtenerClientes()
        const termino = busqueda.toLowerCase().trim()

        resultados = clientes.filter((c) => {
          const nombre = c.first_name?.toLowerCase().trim() || ""
          const apellido = c.last_name?.toLowerCase().trim() || ""
          const nombreCompleto = `${nombre} ${apellido}`.trim()
          const nombreReverso = `${apellido} ${nombre}`.trim()

          return (
            nombre.includes(termino) ||
            apellido.includes(termino) ||
            nombreCompleto.includes(termino) ||
            nombreReverso.includes(termino)
          )
        })

        const mismoNombreCompleto = clientes.filter((c) => {
          const nombre = c.first_name?.toLowerCase().trim() || ""
          const apellido = c.last_name?.toLowerCase().trim() || ""
          return `${nombre} ${apellido}`.trim() === termino
        })

        if (mismoNombreCompleto.length > 1) {
          setClientesCoincidentes(mismoNombreCompleto)
          setMostrarModal(true)
          setCliente(null)
          setLoading(false)
          return
        }

        if (resultados.length > 1) {
          setClientesCoincidentes(resultados)
          setMostrarModal(true)
          setCliente(null)
          setLoading(false)
          return
        }
      }

      if (resultados.length === 1) {
        setCliente(resultados[0])
        return
      }

      setError("No se encontraron clientes con ese criterio.")
    } catch (err) {
      console.error("❌ Error en la búsqueda:", err)
      setError("Error al buscar el cliente. Intente nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleLimpiar = () => {
    setBusqueda("")
    setFiltroActivo("nombre")
    setCliente(null)
    setError("")
    setBusquedaRealizada(false)
    setClientesCoincidentes([])
    setMostrarModal(false)
    setInputInvalido(false)
    setMensajeTemporal("")
    setPagos([])
    setPagosError("")
    setPagosLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleBuscar()
    }
  }

  const handleSeleccionarCliente = (c) => {
    setCliente(c)
    setMostrarModal(false)
  }

  /* ===================================================
      ✏️ Lógica de Edición (Modal)
     =================================================== */
  const abrirModalEdicion = () => {
    if (!cliente) return
    setFormEdicion({
      dni: cliente.dni || "",
      first_name: cliente.first_name || "",
      last_name: cliente.last_name || "",
      email: cliente.email || "",
      phone: cliente.phone || "",
      plan_id: cliente.plan_id || "",
    })
    setMostrarModalEdicion(true)
  }

  const cerrarModalEdicion = () => {
    setMostrarModalEdicion(false)
  }

  const handleChangeEdicion = (e) => {
    const { name, value } = e.target
    setFormEdicion({
      ...formEdicion,
      [name]: value,
    })
  }

  const handleGuardarEdicion = async (e) => {
    e.preventDefault()
    if (!cliente) return

    try {
      setSaving(true)
      // Actualizar en DB
      await actualizarCliente(cliente.id, {
        ...formEdicion,
        enabled: cliente.enabled, // Mantener estado
        role: cliente.role || 'CLIENT'
      })

      // Actualizar estado local
      const nombrePlan = planes.find(p => p.id === formEdicion.plan_id)?.name
      
      setCliente({
        ...cliente,
        ...formEdicion,
        plan_name: nombrePlan || cliente.plan_name 
      })

      setMostrarModalEdicion(false)
    } catch (err) {
      console.error("Error al actualizar:", err)
    } finally {
      setSaving(false)
    }
  }

  /* ===================================================
      💳 Cargar pagos
     =================================================== */
  useEffect(() => {
    const fetchPagos = async () => {
      if (!cliente?.dni) return

      setPagosLoading(true)
      setPagosError("")

      try {
        const data = await obtenerPagosPorCliente(cliente.dni)
        setPagos(Array.isArray(data) ? data : [])
      } catch (err) {
        console.warn("⚠️ Sin historial de pagos:", err.message)
        setPagos([]) 
      } finally {
        setPagosLoading(false)
      }
    }

    fetchPagos()
  }, [cliente])

  const getInitials = (nombre = "", apellido = "") => {
    const n = (nombre || "").trim().charAt(0).toUpperCase()
    const a = (apellido || "").trim().charAt(0).toUpperCase()
    return n + a || "CL"
  }

  /* ===================================================
      🔔 Badges
     =================================================== */
  const footerBadges = useMemo(() => {
    if (!cliente) return []

    const badges = []

    const estado = cliente.enabled ? "Activo" : "Inactivo"
    if (estado === "Activo") {
      badges.push({ label: "Cliente activo", variant: "success" })
    } else {
      badges.push({ label: "Cliente inactivo", variant: "danger" })
    }

    if (cliente.plan_name) {
       badges.push({ label: `Plan: ${cliente.plan_name}`, variant: "info" })
    } else {
       badges.push({ label: "Sin plan visual", variant: "warning" })
    }

    const tieneEmail = !!cliente.email
    if (tieneEmail) {
      badges.push({ label: "Email verificado", variant: "success" })
    } else {
      badges.push({ label: "Sin contacto", variant: "danger" })
    }

    if (asistenciaResumen) {
      badges.push({
        label: asistenciaResumen.label,
        variant: asistenciaResumen.variant,
      })
    }

    if (cliente.dni) {
      badges.push({ label: `DNI: ${cliente.dni}`, variant: "neutral" })
    }

    return badges
  }, [cliente, asistenciaResumen])

  return (
    <section className={styles.clientesContainer}>
      {/* 🔍 Buscador */}
      <div className={styles.gestionContainer}>
        <div className={styles.gestionHeader}>
          <h2 className={styles.title}>Buscar usuario</h2>
          {mensajeTemporal && (
            <p className={styles.warningText}>{mensajeTemporal}</p>
          )}
        </div>

        <div className={styles.controlsRow}>
          {/* Input con icono integrado */}
          <div className={`${styles.searchWrapper} ${inputInvalido ? styles.inputErrorWrapper : ""}`}>
            <span className={styles.searchIcon}>
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder={`Buscar cliente por ${filtroActivo}...`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.modernInput}
            />
          </div>

          {/* Filtros estilo Tabs/Pills */}
          <div className={styles.filtersGroup}>
            <button
              className={`${styles.filterPill} ${filtroActivo === "nombre" ? styles.pillActive : ""}`}
              onClick={() => setFiltroActivo("nombre")}
            >
              Nombre / Apellido
            </button>
            <button
              className={`${styles.filterPill} ${filtroActivo === "dni" ? styles.pillActive : ""}`}
              onClick={() => setFiltroActivo("dni")}
            >
              DNI
            </button>
          </div>

          {/* Botones de Acción */}
          <div className={styles.actionsGroup}>
            <button onClick={handleBuscar} className={styles.btnActionPrimary}>
              Buscar
            </button>
            <button onClick={handleLimpiar} className={styles.btnActionSecondary}>
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* 🌀 Loader */}
      {loading && (
        <div className={styles.loaderContainer}>
          <div className={styles.loader}></div>
          <p>Buscando cliente en base de datos...</p>
        </div>
      )}

      {/* ⚙️ Detalle cliente */}
      {!loading && busquedaRealizada && (
        <>
          {error ? (
            <div className={styles.centerMessageError}>
              <p>{error}</p>
            </div>
          ) : cliente ? (
            <div className={styles.detailGrid}>
              {/* =========================
                  🧍 INFO PRINCIPAL
                 ========================= */}
              <section className={`${styles.card} ${styles.infoCard}`}>
                <header className={styles.infoHeader}>
                  <div className={styles.infoMain}>
                    <div className={styles.avatar}>
                      {getInitials(cliente?.first_name, cliente?.last_name)}
                    </div>

                    <div>
                      <h3>
                        {cliente?.first_name || "Sin nombre"}{" "}
                        {cliente?.last_name || ""}
                      </h3>
                      <p className={styles.infoSubtitle}>
                        DNI {cliente?.dni || "-"}
                      </p>
                    </div>
                  </div>

                  <div className={styles.infoTags}>
                    <span
                      className={
                        cliente?.enabled
                          ? styles.badgeEstadoActivo
                          : styles.badgeEstadoInactivo
                      }
                    >
                      {cliente?.enabled ? "Activo" : "Inactivo"}
                    </span>
                    {/* ✏️ BOTÓN EDITAR */}
                    <button className={styles.btnEditarPerfil} onClick={abrirModalEdicion}>
                      Editar datos
                    </button>
                  </div>
                </header>

                <div className={styles.infoBody}>
                  <div className={styles.infoColumn}>
                    <h4>Datos personales</h4>
                    <p>
                      <span>ID Sistema:</span> {cliente?.id?.slice(0, 8)}...
                    </p>
                    <p>
                      <span>Altura:</span> {cliente?.height_cm || "-"} cm
                    </p>
                    <p>
                      <span>Peso:</span> {cliente?.weight_kg || "-"} kg
                    </p>
                  </div>

                  <div className={styles.infoColumn}>
                    <h4>Contacto</h4>
                    <p>
                      <span>Email:</span> {cliente?.email || "-"}
                    </p>
                    <p>
                      <span>Teléfono:</span> {cliente?.phone || "-"}
                    </p>
                  </div>
                </div>

                <footer className={styles.infoFooter}>
                  {footerBadges.map((badge, index) => {
                    let variantClass = styles.footerBadgeNeutral
                    if (badge.variant === "success") variantClass = styles.footerBadgeSuccess
                    else if (badge.variant === "warning") variantClass = styles.footerBadgeWarning
                    else if (badge.variant === "danger") variantClass = styles.footerBadgeDanger
                    else if (badge.variant === "info") variantClass = styles.footerBadgeInfo

                    return (
                      <span
                        key={index}
                        className={`${styles.footerBadge} ${variantClass}`}
                      >
                        {badge.label}
                      </span>
                    )
                  })}
                </footer>
              </section>

              {/* =========================
                  📆 ASISTENCIA
                 ========================= */}
              <div className={`${styles.card} ${styles.asistenciaCard}`}>
                <div className={styles.sectionHeaderRow}>
                  <h3>Asistencia (Simulada)</h3>
                  <span className={styles.badgeSecondary}>Vista rápida</span>
                </div>
                <div className={styles.weekDays}>
                  {["L", "M", "X", "J", "V", "S", "D"].map((d, idx) => (
                    <div key={idx} className={styles.weekDay}>{d}</div>
                  ))}
                </div>
                <div className={styles.calendar}>
                  {asistencia30dias.map((dia, idx) => {
                    const dayOfWeek = idx % 7
                    return (
                      <div
                        key={idx}
                        className={`${styles.calendarDay} ${
                          dia ? styles.calendarDayActive : ""
                        } ${dayOfWeek === 6 ? styles.calendarSunday : ""}`}
                      >
                        {idx + 1}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* =========================
                  💳 PAGOS
                 ========================= */}
              <div className={`${styles.card} ${styles.pagosCard}`}>
                <div className={styles.sectionHeaderRow}>
                  <h3>Historial de pagos</h3>
                </div>
                {pagosLoading ? (
                  <p className={styles.placeholderText}>Cargando...</p>
                ) : pagos.length > 0 ? (
                  <ul className={styles.listaPagos}>
                    {pagos.map((p, i) => (
                      <li key={i}>{/* Renderizar pago real aqui */}</li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.placeholderText}>
                    Sin pagos registrados en base de datos.
                  </p>
                )}
              </div>

              {/* =========================
                  🏋️ RUTINA + NUTRICIÓN
                 ========================= */}
              <RutinaNutricion cliente={cliente} styles={styles} />
            </div>
          ) : (
            <div className={styles.centerMessage}>
              <p>No se encontraron resultados para la búsqueda.</p>
            </div>
          )}
        </>
      )}

      {/* 🪟 Modal de selección múltiple */}
      {mostrarModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Se encontraron varios clientes</h3>
            <table className={styles.modalTable}>
              <thead>
                <tr>
                  <th>DNI</th>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  <th>Email</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {clientesCoincidentes.map((c) => (
                  <tr key={c.id}>
                    <td>{c.dni}</td>
                    <td>{c.first_name}</td>
                    <td>{c.last_name}</td>
                    <td>{c.email}</td>
                    <td>
                      <button
                        onClick={() => handleSeleccionarCliente(c)}
                        className={styles.btnSeleccionar}
                      >
                        Seleccionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.modalFooter}>
              <button
                onClick={() => setMostrarModal(false)}
                className={styles.btnCerrarModal}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ MODAL EDICIÓN CLIENTE (Nuevo Popup) */}
      {mostrarModalEdicion && (
        <div className={styles.editModalOverlay} onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModalEdicion();
        }}>
          <div className={styles.editModalContent}>
            <div className={styles.editModalHeader}>
              <h3>Editar Cliente</h3>
              <button className={styles.editModalCloseBtn} onClick={cerrarModalEdicion}>&times;</button>
            </div>

            <form className={styles.editModalForm} onSubmit={handleGuardarEdicion}>
              <div className={styles.editModalBody}>
                <div className={styles.inputGroup}>
                  <label>DNI</label>
                  <input 
                    type="text" 
                    name="dni" 
                    value={formEdicion.dni} 
                    onChange={handleChangeEdicion} 
                  />
                </div>
                
                <div className={styles.row}>
                  <div className={styles.inputGroup}>
                    <label>Nombre</label>
                    <input 
                      type="text" 
                      name="first_name" 
                      value={formEdicion.first_name} 
                      onChange={handleChangeEdicion} 
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Apellido</label>
                    <input 
                      type="text" 
                      name="last_name" 
                      value={formEdicion.last_name} 
                      onChange={handleChangeEdicion} 
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Email</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={formEdicion.email} 
                    onChange={handleChangeEdicion} 
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Teléfono</label>
                  <input 
                    type="text" 
                    name="phone" 
                    value={formEdicion.phone} 
                    onChange={handleChangeEdicion} 
                  />
                </div>
                
                <div className={styles.inputGroup}>
                  <label>Plan</label>
                  <select 
                    name="plan_id" 
                    value={formEdicion.plan_id} 
                    onChange={handleChangeEdicion}
                  >
                    <option value="">Seleccionar plan...</option>
                    {planes.map((plan) => (
                      <option key={plan.id} value={plan.id}>{plan.name} — ${plan.price}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.editModalFooter}>
                <button type="button" className={styles.btnCancelarEdicion} onClick={cerrarModalEdicion}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnGuardarEdicion} disabled={saving}>
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default Clientes