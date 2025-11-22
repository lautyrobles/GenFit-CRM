// src/Pages/Clientes/Clientes.jsx
import React, { useState, useEffect, useMemo } from "react"
import styles from "./Clientes.module.css"

// 📦 Servicios
import {
  obtenerClientes,
  obtenerClientePorDocumento,
} from "../../assets/services/clientesService"
import { obtenerPagosPorCliente } from "../../assets/services/pagosService"

// 🧩 Tabs accesibles
import { Tab } from "@headlessui/react"

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

  // 💳 Pagos del cliente (estructura lista para futuro endpoint)
  const [pagos, setPagos] = useState([])
  const [pagosLoading, setPagosLoading] = useState(false)
  const [pagosError, setPagosError] = useState("")

  // 🏋️ Form Rutina (a futuro se conecta al endpoint)
  const [rutinaForm, setRutinaForm] = useState({
    objetivo: "",
    frecuenciaSemanal: "",
    nivel: "",
    duracionSesion: "",
    notas: "",
  })

  // 🥗 Form Nutrición (a futuro se conecta al endpoint)
  const [dietaForm, setDietaForm] = useState({
    objetivo: "",
    caloriasDiarias: "",
    tipoDieta: "",
    restricciones: "",
    notas: "",
  })

  /* ===================================================
     📆 Asistencia simulada (ejemplo visual)
     =================================================== */
  const asistencia30dias = useMemo(
    () =>
      Array.from({ length: 30 }, () =>
        Math.random() > 0.3 // 70% asistencia aprox
      ),
    [cliente?.document]
  )

  /* ===================================================
     📊 Resumen de asistencia (para mini-cards footer)
     =================================================== */
  const asistenciaResumen = useMemo(() => {
    if (!asistencia30dias || asistencia30dias.length === 0) return null

    const total = asistencia30dias.length
    const presentes = asistencia30dias.filter(Boolean).length
    const ratio = (presentes / total) * 100

    if (ratio >= 80) {
      return { label: "Asistencia alta", variant: "success" }
    }
    if (ratio >= 50) {
      return { label: "Asistencia media", variant: "warning" }
    }
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
          const nombre = c.name?.toLowerCase().trim() || ""
          const apellido = c.lastName?.toLowerCase().trim() || ""
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
          const nombre = c.name?.toLowerCase().trim() || ""
          const apellido = c.lastName?.toLowerCase().trim() || ""
          const nombreCompleto = `${nombre} ${apellido}`.trim()
          return nombreCompleto === termino
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

  /* ===================================================
     🔹 Limpiar búsqueda
     =================================================== */
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

  /* ===================================================
     🔹 Enter para buscar
     =================================================== */
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleBuscar()
    }
  }

  /* ===================================================
     🔹 Seleccionar cliente desde el modal
     =================================================== */
  const handleSeleccionarCliente = (c) => {
    setCliente(c)
    setMostrarModal(false)
  }

  /* ===================================================
     💳 Cargar pagos cuando cambia el cliente
     =================================================== */
  useEffect(() => {
    const fetchPagos = async () => {
      if (!cliente?.document) return

      setPagosLoading(true)
      setPagosError("")

      try {
        const data = await obtenerPagosPorCliente(cliente.document)
        // Hoy te devuelve 204 ⇒ dejamos array vacío.
        setPagos(Array.isArray(data) ? data : [])
      } catch (err) {
        console.warn("⚠️ No se pudieron obtener pagos:", err.message)
        setPagosError("No se pudieron cargar los pagos del cliente.")
      } finally {
        setPagosLoading(false)
      }
    }

    fetchPagos()
  }, [cliente])

  /* ===================================================
     🏋️ Handlers Rutina / 🥗 Dieta (mock por ahora)
     =================================================== */
  const handleRutinaChange = (e) => {
    const { name, value } = e.target
    setRutinaForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleDietaChange = (e) => {
    const { name, value } = e.target
    setDietaForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleGuardarRutina = () => {
    console.log("💾 Guardar rutina (mock):", {
      clienteId: cliente?.id || cliente?.document,
      ...rutinaForm,
    })
    alert("Rutina guardada localmente (mock). Luego la conectamos al backend.")
  }

  const handleGuardarDieta = () => {
    console.log("💾 Guardar dieta (mock):", {
      clienteId: cliente?.id || cliente?.document,
      ...dietaForm,
    })
    alert("Dieta guardada localmente (mock). Luego la conectamos al backend.")
  }

  /* ===================================================
     🧩 Iniciales del avatar
     =================================================== */
  const getInitials = (nombre = "", apellido = "") => {
    const n = (nombre || "").trim().charAt(0).toUpperCase()
    const a = (apellido || "").trim().charAt(0).toUpperCase()
    return (n + a) || "CL"
  }

  /* ===================================================
     🔔 Badges del footer (mini-cards)
     =================================================== */
  const footerBadges = useMemo(() => {
    if (!cliente) return []

    const badges = []

    // Estado del usuario
    const estado = cliente.status || "Activo"
    if (estado === "Activo") {
      badges.push({
        label: "Cliente activo",
        variant: "success",
      })
    } else {
      badges.push({
        label: "Cliente inactivo",
        variant: "danger",
      })
    }

    // Plan
    if (cliente.namePlan) {
      badges.push({
        label: `Plan: ${cliente.namePlan}`,
        variant: "info",
      })
    } else {
      badges.push({
        label: "Sin plan asignado",
        variant: "warning",
      })
    }

    // Contacto (mail + teléfono)
    const tieneEmail = !!cliente.email
    const tieneTelefono = !!cliente.phoneNumber
    if (tieneEmail && tieneTelefono) {
      badges.push({
        label: "Contacto completo",
        variant: "success",
      })
    } else if (tieneEmail || tieneTelefono) {
      badges.push({
        label: "Contacto parcial",
        variant: "warning",
      })
    } else {
      badges.push({
        label: "Sin datos de contacto",
        variant: "danger",
      })
    }

    // Asistencia
    if (asistenciaResumen) {
      badges.push({
        label: asistenciaResumen.label,
        variant: asistenciaResumen.variant,
      })
    }

    // Pagos (estructura para cuando haya API real)
    if (pagosLoading) {
      badges.push({
        label: "Cargando pagos...",
        variant: "info",
      })
    } else if (pagosError) {
      badges.push({
        label: "Error al cargar pagos",
        variant: "danger",
      })
    } else if (pagos.length > 0) {
      badges.push({
        label: `Pagos registrados (${pagos.length})`,
        variant: "success",
      })
    } else {
      badges.push({
        label: "Sin registros de pago",
        variant: "warning",
      })
    }

    // ID interno
    if (cliente.id || cliente._id || cliente.document) {
      badges.push({
        label: `ID: ${cliente.id || cliente._id || cliente.document}`,
        variant: "neutral",
      })
    }

    // Última actualización (si existe)
    if (cliente.updatedAt) {
      const fecha = new Date(cliente.updatedAt).toLocaleString("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      badges.push({
        label: `Actualizado: ${fecha}`,
        variant: "neutral",
      })
    }

    return badges
  }, [cliente, pagos, pagosLoading, pagosError, asistenciaResumen])

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
          <p>Buscando cliente...</p>
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
                      {getInitials(cliente?.name, cliente?.lastName)}
                    </div>

                    <div>
                      <h3>
                        {cliente?.name || "Sin nombre"}{" "}
                        {cliente?.lastName || ""}
                      </h3>
                      <p className={styles.infoSubtitle}>
                        DNI {cliente?.document || "-"}
                      </p>
                    </div>
                  </div>

                  <div className={styles.infoTags}>
                    <span
                      className={
                        (cliente?.status || "Activo") === "Activo"
                          ? styles.badgeEstadoActivo
                          : styles.badgeEstadoInactivo
                      }
                    >
                      {cliente?.status || "Activo"}
                    </span>

                    <span className={styles.planPill}>
                      {cliente?.namePlan || "Sin plan asignado"}
                    </span>
                  </div>
                </header>

                <div className={styles.infoBody}>
                  <div className={styles.infoColumn}>
                    <h4>Datos personales</h4>
                    <p>
                      <span>Dirección:</span>{" "}
                      {cliente?.address || "No registrada"}
                    </p>
                    <p>
                      <span>Teléfono:</span> {cliente?.phoneNumber || "-"}
                    </p>
                  </div>

                  <div className={styles.infoColumn}>
                    <h4>Contacto & fiscal</h4>
                    <p>
                      <span>Email:</span> {cliente?.email || "-"}
                    </p>
                    <p>
                      <span>CUIT:</span> {cliente?.cuit || "No registrado"}
                    </p>
                  </div>
                </div>

                {/* 🔔 Mini-cards de estado del cliente */}
                <footer className={styles.infoFooter}>
                  {footerBadges.map((badge, index) => {
                    let variantClass = styles.footerBadgeNeutral

                    if (badge.variant === "success") {
                      variantClass = styles.footerBadgeSuccess
                    } else if (badge.variant === "warning") {
                      variantClass = styles.footerBadgeWarning
                    } else if (badge.variant === "danger") {
                      variantClass = styles.footerBadgeDanger
                    } else if (badge.variant === "info") {
                      variantClass = styles.footerBadgeInfo
                    }

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
                  <h3>Asistencia (últimos 30 días)</h3>
                  <span className={styles.badgeSecondary}>Vista rápida</span>
                </div>

                <div className={styles.weekDays}>
                  {["L", "M", "X", "J", "V", "S", "D"].map((d, idx) => (
                    <div key={idx} className={styles.weekDay}>
                      {d}
                    </div>
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
                        } ${
                          dayOfWeek === 6 ? styles.calendarSunday : ""
                        }`}
                        title={`Día ${idx + 1}: ${
                          dia ? "Asistió" : "No asistió"
                        }`}
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
                  <span className={styles.badgeSecondary}>
                    Últimos movimientos
                  </span>
                </div>

                {pagosLoading ? (
                  <p className={styles.placeholderText}>Cargando pagos...</p>
                ) : pagosError ? (
                  <p className={styles.placeholderText}>{pagosError}</p>
                ) : pagos.length > 0 ? (
                  <ul className={styles.listaPagos}>
                    {pagos.map((pago, index) => (
                      <li key={index}>
                        <div>
                          <span className={styles.fechaPago}>
                            {pago.fechaPago || "Sin fecha"}
                          </span>
                          <span className={styles.medioPago}>
                            {pago.metodoPago || "Método no especificado"}
                          </span>
                        </div>
                        <span className={styles.montoPago}>
                          ${pago.monto || 0}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.placeholderText}>
                    💳 Sin registros de pago disponibles
                  </p>
                )}
              </div>

              {/* =========================
                  🏋️ RUTINA + 🥗 NUTRICIÓN (TABS)
                 ========================= */}
              <div className={`${styles.card} ${styles.rutinaNutricionCard}`}>
                <div className={styles.sectionHeaderRow}>
                  <h3>Rutina & Nutrición</h3>
                  <span className={styles.badgeSecondary}>
                    Editable por Admin / Encargado
                  </span>
                </div>

                <Tab.Group>
                  <Tab.List className={styles.tabList}>
                    <Tab
                      className={({ selected }) =>
                        `${styles.tabItem} ${
                          selected ? styles.tabItemActive : ""
                        }`
                      }
                    >
                      Rutina
                    </Tab>
                    <Tab
                      className={({ selected }) =>
                        `${styles.tabItem} ${
                          selected ? styles.tabItemActive : ""
                        }`
                      }
                    >
                      Nutrición
                    </Tab>
                  </Tab.List>

                  <Tab.Panels className={styles.tabPanels}>
                    {/* 🏋️ TAB RUTINA */}
                    <Tab.Panel>
                      <div className={styles.formGrid}>
                        <div className={styles.formField}>
                          <label htmlFor="objetivoRutina">Objetivo</label>
                          <input
                            id="objetivoRutina"
                            name="objetivo"
                            value={rutinaForm.objetivo}
                            onChange={handleRutinaChange}
                            placeholder="Hipertrofia, fuerza, rendimiento..."
                          />
                        </div>

                        <div className={styles.formField}>
                          <label htmlFor="frecuenciaSemanal">
                            Frecuencia semanal
                          </label>
                          <select
                            id="frecuenciaSemanal"
                            name="frecuenciaSemanal"
                            value={rutinaForm.frecuenciaSemanal}
                            onChange={handleRutinaChange}
                          >
                            <option value="">Seleccionar...</option>
                            <option value="2">2 veces/semana</option>
                            <option value="3">3 veces/semana</option>
                            <option value="4">4 veces/semana</option>
                            <option value="5">5 veces/semana</option>
                            <option value="6">6 veces/semana</option>
                          </select>
                        </div>

                        <div className={styles.formField}>
                          <label htmlFor="nivel">Nivel</label>
                          <select
                            id="nivel"
                            name="nivel"
                            value={rutinaForm.nivel}
                            onChange={handleRutinaChange}
                          >
                            <option value="">Seleccionar...</option>
                            <option value="principiante">Principiante</option>
                            <option value="intermedio">Intermedio</option>
                            <option value="avanzado">Avanzado</option>
                          </select>
                        </div>

                        <div className={styles.formField}>
                          <label htmlFor="duracionSesion">
                            Duración por sesión (min)
                          </label>
                          <input
                            id="duracionSesion"
                            name="duracionSesion"
                            type="number"
                            min="0"
                            value={rutinaForm.duracionSesion}
                            onChange={handleRutinaChange}
                            placeholder="Ej: 60"
                          />
                        </div>

                        <div
                          className={`${styles.formField} ${styles.formFieldFull}`}
                        >
                          <label htmlFor="notasRutina">
                            Detalle de la rutina / notas
                          </label>
                          <textarea
                            id="notasRutina"
                            name="notas"
                            rows={3}
                            value={rutinaForm.notas}
                            onChange={handleRutinaChange}
                            placeholder="Listado de ejercicios, series, reps, etc."
                          />
                        </div>

                        <div className={styles.formActions}>
                          <button
                            type="button"
                            className={styles.btnPrimaryOutline}
                            onClick={() =>
                              setRutinaForm({
                                objetivo: "",
                                frecuenciaSemanal: "",
                                nivel: "",
                                duracionSesion: "",
                                notas: "",
                              })
                            }
                          >
                            Limpiar
                          </button>
                          <button
                            type="button"
                            className={styles.btnPrimary}
                            onClick={handleGuardarRutina}
                          >
                            Guardar rutina
                          </button>
                        </div>
                      </div>
                    </Tab.Panel>

                    {/* 🥗 TAB NUTRICIÓN */}
                    <Tab.Panel>
                      <div className={styles.formGrid}>
                        <div className={styles.formField}>
                          <label htmlFor="objetivoDieta">Objetivo</label>
                          <input
                            id="objetivoDieta"
                            name="objetivo"
                            value={dietaForm.objetivo}
                            onChange={handleDietaChange}
                            placeholder="Pérdida de grasa, mantenimiento, volumen..."
                          />
                        </div>

                        <div className={styles.formField}>
                          <label htmlFor="caloriasDiarias">
                            Calorías diarias (aprox.)
                          </label>
                          <input
                            id="caloriasDiarias"
                            name="caloriasDiarias"
                            type="number"
                            min="0"
                            value={dietaForm.caloriasDiarias}
                            onChange={handleDietaChange}
                            placeholder="Ej: 2200"
                          />
                        </div>

                        <div className={styles.formField}>
                          <label htmlFor="tipoDieta">Tipo de dieta</label>
                          <input
                            id="tipoDieta"
                            name="tipoDieta"
                            value={dietaForm.tipoDieta}
                            onChange={handleDietaChange}
                            placeholder="Equilibrada, low-carb, high-protein..."
                          />
                        </div>

                        <div className={styles.formField}>
                          <label htmlFor="restricciones">
                            Restricciones / alergias
                          </label>
                          <input
                            id="restricciones"
                            name="restricciones"
                            value={dietaForm.restricciones}
                            onChange={handleDietaChange}
                            placeholder="Sin gluten, sin lácteos, etc."
                          />
                        </div>

                        <div
                          className={`${styles.formField} ${styles.formFieldFull}`}
                        >
                          <label htmlFor="notasDieta">
                            Detalle de la dieta / notas
                          </label>
                          <textarea
                            id="notasDieta"
                            name="notas"
                            rows={3}
                            value={dietaForm.notas}
                            onChange={handleDietaChange}
                            placeholder="Distribución de comidas, horarios, etc."
                          />
                        </div>

                        <div className={styles.formActions}>
                          <button
                            type="button"
                            className={styles.btnPrimaryOutline}
                            onClick={() =>
                              setDietaForm({
                                objetivo: "",
                                caloriasDiarias: "",
                                tipoDieta: "",
                                restricciones: "",
                                notas: "",
                              })
                            }
                          >
                            Limpiar
                          </button>
                          <button
                            type="button"
                            className={styles.btnPrimary}
                            onClick={handleGuardarDieta}
                          >
                            Guardar dieta
                          </button>
                        </div>
                      </div>
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>
              </div>
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
                  <th>Teléfono</th>
                  <th>Plan</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {clientesCoincidentes.map((c) => (
                  <tr key={c.document}>
                    <td>{c.document}</td>
                    <td>{c.name}</td>
                    <td>{c.lastName}</td>
                    <td>{c.email}</td>
                    <td>{c.phoneNumber}</td>
                    <td>{c.namePlan || "-"}</td>
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
