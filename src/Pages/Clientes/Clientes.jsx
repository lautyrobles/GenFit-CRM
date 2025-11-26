import React, { useState, useEffect, useMemo } from "react"
import styles from "./Clientes.module.css"

// 📦 Servicios (Ahora usando Supabase por dentro)
import {
  obtenerClientes,
  obtenerClientePorDocumento,
} from "../../assets/services/clientesService"
import { obtenerPagosPorCliente } from "../../assets/services/pagosService"

// 🧩 Componentes
import RutinaNutricion from "./RutinaNutricion"

const Clientes = () => {
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

  /* ===================================================
     📆 Asistencia simulada (Se conectará a access_logs luego)
     =================================================== */
  const asistencia30dias = useMemo(
    () =>
      Array.from({ length: 30 }, () =>
        Math.random() > 0.3 // 70% asistencia aprox
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

      // 1. Búsqueda por DNI
      if (filtroActivo === "dni" && /^\d+$/.test(busqueda)) {
        // Supabase buscará en la columna 'dni'
        const data = await obtenerClientePorDocumento(busqueda)
        // Normalizamos respuesta a array
        resultados = Array.isArray(data) ? data : data ? [data] : []
      
      // 2. Búsqueda por Nombre (Filtrado en cliente por ahora)
      } else if (filtroActivo === "nombre") {
        const clientes = await obtenerClientes() // Trae todos los users con rol client
        const termino = busqueda.toLowerCase().trim()

        resultados = clientes.filter((c) => {
          // ⚠️ CAMBIO CLAVE: first_name / last_name en lugar de name/lastName
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

        // Lógica para coincidencias exactas
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

      // Resultado único encontrado
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
     💳 Cargar pagos cuando cambia el cliente
     =================================================== */
  useEffect(() => {
    const fetchPagos = async () => {
      // Usamos DNI porque es tu clave de negocio, aunque Supabase prefiere ID
      if (!cliente?.dni) return

      setPagosLoading(true)
      setPagosError("")

      try {
        const data = await obtenerPagosPorCliente(cliente.dni)
        setPagos(Array.isArray(data) ? data : [])
      } catch (err) {
        console.warn("⚠️ Sin historial de pagos (aún no implementado tabla pagos):", err.message)
        // No mostramos error rojo, solo array vacío
        setPagos([]) 
      } finally {
        setPagosLoading(false)
      }
    }

    fetchPagos()
  }, [cliente])

  /* ===================================================
     🧩 Iniciales del avatar (Adaptado a first_name)
     =================================================== */
  const getInitials = (nombre = "", apellido = "") => {
    const n = (nombre || "").trim().charAt(0).toUpperCase()
    const a = (apellido || "").trim().charAt(0).toUpperCase()
    return n + a || "CL"
  }

  /* ===================================================
     🔔 Badges del footer
     =================================================== */
  const footerBadges = useMemo(() => {
    if (!cliente) return []

    const badges = []

    // Estado del usuario
    const estado = cliente.enabled ? "Activo" : "Inactivo" // Usamos boolean 'enabled' de Supabase
    if (estado === "Activo") {
      badges.push({ label: "Cliente activo", variant: "success" })
    } else {
      badges.push({ label: "Cliente inactivo", variant: "danger" })
    }

    // Plan (Nota: Esto requerirá un JOIN en el futuro)
    // Por ahora mostramos si tiene o no
    if (cliente.plan_name) {
       badges.push({ label: `Plan: ${cliente.plan_name}`, variant: "info" })
    } else {
       badges.push({ label: "Sin plan visual", variant: "warning" })
    }

    // Contacto
    const tieneEmail = !!cliente.email
    const tieneTelefono = !!cliente.phone // Asumiendo que agregaremos phone luego
    if (tieneEmail) {
      badges.push({ label: "Email verificado", variant: "success" })
    } else {
      badges.push({ label: "Sin contacto", variant: "danger" })
    }

    // Asistencia
    if (asistenciaResumen) {
      badges.push({
        label: asistenciaResumen.label,
        variant: asistenciaResumen.variant,
      })
    }

    // ID interno
    if (cliente.dni) {
      badges.push({ label: `DNI: ${cliente.dni}`, variant: "neutral" })
    }

    return badges
  }, [cliente, asistenciaResumen])

  /* ===================================================
     🔹 Render principal
     =================================================== */
  return (
    <section className={styles.clientesContainer}>
      {/* 🔍 Buscador */}
      <div className={styles.gestionContainer}>
        <h2 className={styles.title}>Buscar usuario</h2>

        {mensajeTemporal && (
          <p className={styles.warningText}>{mensajeTemporal}</p>
        )}

        <div className={styles.filtrosContainer}>
          <input
            type="text"
            placeholder={`Buscar cliente por ${filtroActivo}...`}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`${styles.inputBuscar} ${
              inputInvalido ? styles.inputError : ""
            }`}
          />

          <button
            className={`${styles.btnFiltro} ${
              filtroActivo === "nombre" ? styles.btnActivo : ""
            }`}
            onClick={() => setFiltroActivo("nombre")}
          >
            Nombre / Apellido
          </button>

          <button
            className={`${styles.btnFiltro} ${
              filtroActivo === "dni" ? styles.btnActivo : ""
            }`}
            onClick={() => setFiltroActivo("dni")}
          >
            DNI
          </button>

          <button onClick={handleBuscar} className={styles.btnBuscar}>
            Buscar
          </button>
          <button onClick={handleLimpiar} className={styles.btnLimpiar}>
            Limpiar
          </button>
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
                  </div>
                </div>

                {/* 🔔 Footer Badges */}
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
                  📆 ASISTENCIA (Placeholder)
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
                  💳 PAGOS (Placeholder)
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
    </section>
  )
}

export default Clientes