import React, { useState, useEffect, useMemo } from "react"
import { useLocation } from "react-router-dom"
import styles from "./Clientes.module.css"

// 📦 Servicios
import {
  obtenerClientes,
  obtenerClientePorDocumento,
  actualizarCliente,
} from "../../assets/services/clientesService"
import { obtenerPlanes } from "../../assets/services/planesService"

// 🧩 Componentes
import RutinaNutricion from "./RutinaNutricion"
import Loader from "../../Components/Loader/Loader"
import { Search, User, Mail, Phone, CreditCard, Calendar, Edit3, X, CheckCircle, AlertCircle } from 'lucide-react'

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
  const [mensajeTemporal, setMensajeTemporal] = useState("")

  // 💳 Pagos y Planes
  const [pagos, setPagos] = useState([])
  const [pagosLoading, setPagosLoading] = useState(false)
  const [planes, setPlanes] = useState([])

  // ✏️ Estados para Edición
  const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formEdicion, setFormEdicion] = useState({
    dni: "", first_name: "", last_name: "", email: "", phone: "", plan_id: "",
  })

  // 🎨 Helper de Clases de Color
  const getPlanClass = (planName) => {
    if (!planName) return styles.planDefault;
    const name = planName.toLowerCase();
    if (name.includes('estudiantil')) return styles.planEstudiantil;
    if (name.includes('basico') || name.includes('básico')) return styles.planBasico;
    if (name.includes('libre')) return styles.planLibre;
    return styles.planDefault;
  };

  useEffect(() => {
    const loadPlanes = async () => {
      try {
        const data = await obtenerPlanes()
        setPlanes(data || [])
      } catch (err) { console.error("Error cargando planes", err) }
    }
    loadPlanes()
  }, [])

  useEffect(() => {
    if (location.state && location.state.clienteSeleccionado) {
      const c = location.state.clienteSeleccionado
      setCliente(c)
      setBusquedaRealizada(true)
      setBusqueda(c.dni?.toString() || "")
      setFiltroActivo(c.dni ? "dni" : "nombre")
      window.history.replaceState({}, document.title)
    }
  }, [location])

  const planActual = useMemo(() => {
    if (!cliente?.plan_id || planes.length === 0) return "Sin plan asignado";
    const p = planes.find(p => String(p.id) === String(cliente.plan_id));
    return p ? p.name : "Plan no encontrado";
  }, [cliente, planes]);

  const handleBuscar = async () => {
    if (!busqueda.trim()) return;
    setLoading(true); setError(""); setCliente(null); setBusquedaRealizada(true);
    try {
      let resultados = [];
      if (filtroActivo === "dni") {
        const data = await obtenerClientePorDocumento(busqueda);
        resultados = data ? [data] : [];
      } else {
        const todos = await obtenerClientes();
        const termino = busqueda.toLowerCase().trim();
        resultados = todos.filter(c => 
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(termino)
        );
      }
      if (resultados.length > 1) {
        setClientesCoincidentes(resultados);
        setMostrarModal(true);
      } else if (resultados.length === 1) {
        setCliente(resultados[0]);
      } else {
        setError("No se encontraron clientes con ese criterio.");
      }
    } catch (err) { setError("Error en la conexión con el servidor."); } 
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!cliente?.dni) return;
    const fetchPagos = async () => {
      setPagosLoading(true);
      try {
        const data = await obtenerPagosPorCliente(cliente.dni);
        setPagos(data || []);
      } catch (err) { setPagos([]); } 
      finally { setPagosLoading(false); }
    }
    fetchPagos();
  }, [cliente]);

  const abrirModalEdicion = () => {
    if (!cliente) return;
    setFormEdicion({
      dni: cliente.dni || "",
      first_name: cliente.first_name || "",
      last_name: cliente.last_name || "",
      email: cliente.email || "",
      phone: cliente.phone || "",
      plan_id: cliente.plan_id || "",
    });
    setMostrarModalEdicion(true);
  }

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await actualizarCliente(cliente.id, formEdicion);
      setCliente(prev => ({ ...prev, ...formEdicion }));
      setMostrarModalEdicion(false);
      setMensajeTemporal("✅ Datos actualizados");
      setTimeout(() => setMensajeTemporal(""), 3000);
    } catch (err) { setError("Error al actualizar"); } 
    finally { setSaving(false); }
  }

  return (
    <section className={styles.clientesLayout}>
      
      {/* 🔍 BLOQUE BUSCADOR */}
      <div className={styles.searchSection}>
        <div className={styles.searchHeader}>
          <h2 className={styles.sectionTitle}>Buscar cliente</h2>
          {mensajeTemporal && <span className={styles.toastMini}>{mensajeTemporal}</span>}
        </div>

        <div className={styles.searchControls}>
          <div className={styles.inputWrapper}>
            <Search className={styles.searchIcon} size={18} />
            <input
              type="text"
              placeholder={`Buscar cliente por ${filtroActivo}...`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
              className={styles.mainInput}
            />
          </div>

          <div className={styles.filterPills}>
            <button className={`${styles.pill} ${filtroActivo === "nombre" ? styles.pillActive : ""}`} onClick={() => setFiltroActivo("nombre")}>Nombre</button>
            <button className={`${styles.pill} ${filtroActivo === "dni" ? styles.pillActive : ""}`} onClick={() => setFiltroActivo("dni")}>DNI</button>
          </div>

          <div className={styles.buttonGroup}>
            <button onClick={handleBuscar} className={styles.btnPrimary}>Buscar</button>
            <button onClick={() => {setBusqueda(""); setCliente(null); setBusquedaRealizada(false);}} className={styles.btnSecondary}>Limpiar</button>
          </div>
        </div>
      </div>

      {loading && <div className={styles.loaderArea}><Loader text="Consultando base de datos..." /></div>}

      {!loading && busquedaRealizada && cliente && (
        <div className={styles.dashboardGrid}>
          
          {/* 🧍 CARD: INFORMACIÓN PERSONAL */}
          <div className={`${styles.card} ${styles.infoCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.userHead}>
                <div className={styles.avatarLarge}>
                  {cliente.first_name[0]}{cliente.last_name[0]}
                </div>
                <div className={styles.userNameBox}>
                  <h3>{cliente.first_name} {cliente.last_name}</h3>
                  <span className={cliente.enabled ? styles.statusActive : styles.statusInactive}>
                    {cliente.enabled ? "Cuenta Activa" : "Cuenta Inactiva"}
                  </span>
                </div>
              </div>
              <button className={styles.btnEdit} onClick={abrirModalEdicion}>
                <Edit3 size={16} /> Editar Perfil
              </button>
            </div>

            <div className={styles.divider}></div>

            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <User size={16} className={styles.itemIcon} />
                <div>
                  <label>Documento Nacional</label>
                  <p>{cliente.dni}</p>
                </div>
              </div>
              <div className={styles.infoItem}>
                <Mail size={16} className={styles.itemIcon} />
                <div>
                  <label>Correo Electrónico</label>
                  <p>{cliente.email}</p>
                </div>
              </div>
              <div className={styles.infoItem}>
                <Phone size={16} className={styles.itemIcon} />
                <div>
                  <label>Teléfono de Contacto</label>
                  <p>{cliente.phone || "No registrado"}</p>
                </div>
              </div>
              <div className={styles.infoItem}>
                <CreditCard size={16} className={styles.itemIcon} />
                <div>
                  <label>Plan de Suscripción</label>
                  <span className={`${styles.planBadge} ${getPlanClass(planActual)}`}>
                    {planActual}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 📆 CARD: ASISTENCIA (Módulo a futuro) */}
          <div className={`${styles.card} ${styles.asistenciaCard}`}>
            <div className={styles.cardHeader}>
              <h3>Control de Asistencia</h3>
              <Calendar size={18} className={styles.titleIcon} />
            </div>
            <div className={styles.placeholderAsistencia}>
              <p>Módulo en desarrollo para control de accesos por molinete o QR.</p>
            </div>
          </div>

          {/* 💳 CARD: PAGOS */}
          <div className={`${styles.card} ${styles.pagosCard}`}>
            <div className={styles.cardHeader}>
              <h3>Últimos Pagos</h3>
              <CheckCircle size={18} className={styles.titleIcon} />
            </div>
            <div className={styles.paymentsList}>
              {pagosLoading ? <p>Cargando pagos...</p> : pagos.length > 0 ? (
                pagos.slice(0, 5).map((p, i) => (
                  <div key={i} className={styles.paymentItem}>
                    <div className={styles.payInfo}>
                      <strong>{new Date(p.payment_date).toLocaleDateString()}</strong>
                      <small>{p.payment_method}</small>
                    </div>
                    <span className={styles.payAmount}>${p.amount}</span>
                  </div>
                ))
              ) : <div className={styles.noData}>Sin historial de pagos registrado.</div>}
            </div>
          </div>

          {/* 🏋️ RUTINA Y NUTRICIÓN */}
          <div className={styles.fullWidthCard}>
            <RutinaNutricion cliente={cliente} styles={styles} />
          </div>
        </div>
      )}

      {/* ✏️ MODAL EDICIÓN POPUP */}
      {mostrarModalEdicion && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setMostrarModalEdicion(false)}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Editar Información del Socio</h3>
              <button className={styles.closeBtn} onClick={() => setMostrarModalEdicion(false)}><X size={24}/></button>
            </div>
            <form className={styles.modalForm} onSubmit={handleGuardarEdicion}>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label>Nombre</label>
                  <input type="text" value={formEdicion.first_name} onChange={(e) => setFormEdicion({...formEdicion, first_name: e.target.value})} />
                </div>
                <div className={styles.field}>
                  <label>Apellido</label>
                  <input type="text" value={formEdicion.last_name} onChange={(e) => setFormEdicion({...formEdicion, last_name: e.target.value})} />
                </div>
              </div>
              <div className={styles.field}>
                <label>Email</label>
                <input type="email" value={formEdicion.email} onChange={(e) => setFormEdicion({...formEdicion, email: e.target.value})} />
              </div>
              <div className={styles.field}>
                <label>Teléfono</label>
                <input type="text" value={formEdicion.phone} onChange={(e) => setFormEdicion({...formEdicion, phone: e.target.value})} />
              </div>
              <div className={styles.field}>
                <label>Asignar Plan</label>
                <select value={formEdicion.plan_id} onChange={(e) => setFormEdicion({...formEdicion, plan_id: e.target.value})}>
                  {planes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnCancel} onClick={() => setMostrarModalEdicion(false)}>Descartar</button>
                <button type="submit" className={styles.btnSave} disabled={saving}>{saving ? "Guardando..." : "Guardar Cambios"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🪟 MODAL SELECCIÓN MÚLTIPLE */}
      {mostrarModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContentSmall}>
            <div className={styles.modalHeader}>
              <h3>Resultados de Búsqueda</h3>
              <button className={styles.closeBtn} onClick={() => setMostrarModal(false)}><X size={24}/></button>
            </div>
            <div className={styles.resultsList}>
              {clientesCoincidentes.map((c) => (
                <div key={c.id} className={styles.resultItem}>
                  <div className={styles.resultInfo}>
                    <strong>{c.first_name} {c.last_name}</strong>
                    <small>DNI: {c.dni}</small>
                  </div>
                  <button onClick={() => {setCliente(c); setMostrarModal(false);}} className={styles.btnSelect}>Ver Perfil</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Clientes