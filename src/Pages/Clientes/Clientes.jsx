import React, { useState, useEffect, useMemo, useRef } from "react"
import styles from "./Clientes.module.css"
import { useNavigate, useLocation } from "react-router-dom"

// 📦 Servicios
import { obtenerClientes, obtenerClientePorDocumento, actualizarCliente } from "../../assets/services/clientesService"
import { obtenerPlanes } from "../../assets/services/planesService"
import { obtenerPagos } from "../../assets/services/paymentsService"
import { obtenerAlertasMedicas, eliminarAlertaMedica, crearAlertaMedica, actualizarAlertaMedica } from "../../assets/services/medicalService"

// 🧩 Componentes
import RutinaNutricion from "./RutinaNutricion"
import ClienteAsistencia from "./ClienteAsistencia"
import HistorialPagos from "./HistorialPagos"
import Loader from "../../Components/Loader/Loader"
import CustomersTable from '../../Components/CustomersTable/CustomersTable';
import { Search, User, Mail, Phone, CreditCard, Calendar, Edit3, ArrowLeft, AlertCircle, Plus, MoreVertical, Trash2, Edit2 } from 'lucide-react'
import { useAuth } from "../../context/AuthContext" // 👈 Importante

const Clientes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); // 👈 Obtenemos el gym_id del contexto
  
  const qrProcesado = useRef(false);

  const [busqueda, setBusqueda] = useState("")
  const [filtroActivo, setFiltroActivo] = useState("nombre")
  const [cliente, setCliente] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mensajeTemporal, setMensajeTemporal] = useState("")

  const [pagos, setPagos] = useState([])
  const [pagosLoading, setPagosLoading] = useState(false)
  const [planes, setPlanes] = useState([])

  const [alertas, setAlertas] = useState([])
  const [alertasLoading, setAlertasLoading] = useState(false)
  const [mostrarModalAlerta, setMostrarModalAlerta] = useState(false)
  const [alertaEditandoId, setAlertaEditandoId] = useState(null)
  const [nuevaAlerta, setNuevaAlerta] = useState({ name: "", severity: "Baja", observation: "" })
  const [alertaMenuAbierta, setAlertaMenuAbierta] = useState(null); 
  
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false)
  const [alertaParaEliminar, setAlertaParaEliminar] = useState(null)

  const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formEdicion, setFormEdicion] = useState({
    dni: "", first_name: "", last_name: "", email: "", phone: "", plan_id: "",
  })

  useEffect(() => {
    const incomingClient = location.state?.clienteSeleccionado;
    if (incomingClient && !qrProcesado.current) {
      setCliente(incomingClient);
      qrProcesado.current = true;
      navigate(location.pathname, { replace: true, state: {} });
      window.history.replaceState({}, document.title);
    }
  }, [location, navigate]);

  const handleVolverAlListado = () => {
    window.location.href = "/clientes"; 
  };

  // 🔄 Carga de planes (Filtrado por Gym)
  useEffect(() => {
    if (!user?.gym_id) return;
    const loadPlanes = async () => {
      try {
        const data = await obtenerPlanes(user.gym_id);
        setPlanes(data || []);
      } catch (err) { console.error("Error planes", err) }
    }
    loadPlanes()
  }, [user?.gym_id]);

  // 🔄 Carga de datos extra del cliente seleccionado (Pagos y Alertas)
  useEffect(() => {
    if (!cliente?.id || !user?.gym_id) return;
    const fetchDatosExtras = async () => {
      setPagosLoading(true); setAlertasLoading(true);
      try {
        const [dataPagos, dataAlertas] = await Promise.all([
          obtenerPagos(user.gym_id), // 👈 Pasamos gym_id
          obtenerAlertasMedicas(cliente.id)
        ]);
        const pagosFiltrados = dataPagos.filter(p => (p.users?.id === cliente.id) || (p.user_id === cliente.id));
        setPagos(pagosFiltrados);
        setAlertas(dataAlertas);
      } catch (err) { 
        setPagos([]); setAlertas([]);
      } finally { setPagosLoading(false); setAlertasLoading(false); }
    }
    fetchDatosExtras()
  }, [cliente, user?.gym_id]);

  useEffect(() => {
    const cerrar = () => setAlertaMenuAbierta(null);
    window.addEventListener("click", cerrar);
    return () => window.removeEventListener("click", cerrar);
  }, []);

  // 🔍 Búsqueda (Filtrada por Gym)
  const handleBuscar = async () => {
    if (!busqueda.trim() || !user?.gym_id) return;
    setLoading(true); setCliente(null);
    try {
      let resultados = [];
      if (filtroActivo === "dni") {
        const data = await obtenerClientePorDocumento(busqueda, user.gym_id)
        resultados = data ? [data] : []
      } else {
        const todos = await obtenerClientes(user.gym_id)
        resultados = todos.filter(c => 
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(busqueda.toLowerCase().trim())
        )
      }
      if (resultados.length === 1) setCliente(resultados[0]);
    } catch (err) { console.error(err) } 
    finally { setLoading(false) }
  }

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
      const actualizado = await actualizarCliente(cliente.id, formEdicion);
      setCliente(actualizado);
      setMostrarModalEdicion(false);
      mostrarNotificacion("✅ Datos actualizados");
    } catch (err) { 
      console.error(err);
      mostrarNotificacion("❌ Error al actualizar");
    } finally { setSaving(false); }
  }

  const handleEliminarAlerta = async () => {
    if (!alertaParaEliminar) return;
    setSaving(true);
    try {
      const exito = await eliminarAlertaMedica(alertaParaEliminar);
      if (exito) {
        setAlertas(prev => prev.filter(a => a.id !== alertaParaEliminar));
        mostrarNotificacion("✅ Alerta eliminada");
      }
    } catch (err) { console.error(err); }
    finally {
      setSaving(false);
      setMostrarModalEliminar(false);
      setAlertaParaEliminar(null);
    }
  };

  const handleGuardarAlerta = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (alertaEditandoId) {
        const data = await actualizarAlertaMedica(alertaEditandoId, nuevaAlerta);
        setAlertas(prev => prev.map(a => a.id === alertaEditandoId ? data : a));
        mostrarNotificacion("✅ Alerta actualizada");
      } else {
        // 🎯 Inyectamos gym_id al crear la alerta médica
        const data = await crearAlertaMedica({ user_id: cliente.id, ...nuevaAlerta }, user.gym_id);
        setAlertas(prev => [data, ...prev]);
        mostrarNotificacion("✅ Alerta añadida");
      }
      setMostrarModalAlerta(false);
      setAlertaEditandoId(null);
      setNuevaAlerta({ name: "", severity: "Baja", observation: "" });
    } catch (err) { console.error(err) }
    finally { setSaving(false); }
  };

  const mostrarNotificacion = (msg) => {
    setMensajeTemporal(msg);
    setTimeout(() => setMensajeTemporal(""), 3000);
  }

  const planActual = useMemo(() => {
    if (!cliente?.plan_id || planes.length === 0) return "Sin plan asignado";
    const p = planes.find(p => String(p.id) === String(cliente.plan_id));
    return p ? p.name : "Plan no encontrado";
  }, [cliente, planes]);

  const estadoVisual = useMemo(() => {
    if (!cliente) return { texto: "", clase: "" };
    const estaActivoDB = cliente.enabled === true || cliente.enabled === "true" || cliente.enabled === "TRUE"; 
    return estaActivoDB 
      ? { texto: "Socio Activo", clase: styles.statusActive } 
      : { texto: "Inactivo", clase: styles.statusInactive };
  }, [cliente]);

  return (
    <section className={styles.clientesLayout}>
      {mensajeTemporal && <div className={styles.floatingToast}>{mensajeTemporal}</div>}

      <div className={styles.searchSection}>
        <div className={styles.searchHeader}>
          <h2 className={styles.sectionTitle}>Buscar cliente</h2>
          {cliente && (
            <button className={styles.btnBack} onClick={handleVolverAlListado}>
              <ArrowLeft size={16} /> Volver al listado
            </button>
          )}
        </div>
        
        <div className={styles.searchControls}>
          <div className={styles.inputWrapper}>
            <Search className={styles.searchIcon} size={18} />
            <input 
              type="text" 
              placeholder={`Buscar por ${filtroActivo}...`} 
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
          <button onClick={handleBuscar} className={styles.btnPrimary}>Buscar</button>
        </div>
      </div>

      {loading ? <div className={styles.loaderCenter}><Loader text="Sincronizando socio..." /></div> : (
        <>
          {!cliente && (
            <div className={styles.tableFadeIn}>
              {/* 🎯 Pasamos el gym_id a la tabla de clientes general */}
              <CustomersTable onSelectCliente={(c) => setCliente(c)} gymId={user?.gym_id} />
            </div>
          )}

          {cliente && (
            <div className={styles.dashboardGrid}>
              {/* Card de Información Principal */}
              <div className={`${styles.card} ${styles.infoCard}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.userHead}>
                    <div className={styles.avatarLarge}>{cliente.first_name?.[0]}{cliente.last_name?.[0]}</div>
                    <div className={styles.userNameBox}>
                      <h3>{cliente.first_name} {cliente.last_name}</h3>
                      <span className={estadoVisual.clase}>{estadoVisual.texto}</span>
                    </div>
                  </div>
                  <button className={styles.btnEdit} onClick={abrirModalEdicion}><Edit3 size={16} /> Editar</button>
                </div>
                <div className={styles.divider}></div>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}><User size={16}/><div className={styles.txtL}><label>Documento</label><p>{cliente.dni}</p></div></div>
                  <div className={styles.infoItem}><Mail size={16}/><div className={styles.txtL}><label>Email</label><p>{cliente.email}</p></div></div>
                  <div className={styles.infoItem}><Phone size={16}/><div className={styles.txtL}><label>Teléfono</label><p>{cliente.phone || "-"}</p></div></div>
                  <div className={styles.infoItem}><CreditCard size={16}/><div className={styles.txtL}><label>Plan</label><span className={styles.planBadge}>{planActual}</span></div></div>
                </div>

                <div className={styles.divider} style={{ marginTop: '24px' }}></div>
                <div className={styles.medicalAlertsHeader}>
                  <div className={styles.alertTitle}><AlertCircle size={16} /><h4>Alertas Médicas</h4></div>
                  <button className={styles.btnAddAlert} onClick={() => { setAlertaEditandoId(null); setNuevaAlerta({name:"", severity:"Baja", observation:""}); setMostrarModalAlerta(true); }}>
                    <Plus size={14} /> Añadir
                  </button>
                </div>

                <div className={styles.alertsContainer}>
                  {alertasLoading ? (
                    <p className={styles.noAlertsText}>Cargando alertas...</p>
                  ) : alertas.length > 0 ? (
                    alertas.map((alerta) => (
                      <div key={alerta.id} className={`${styles.miniCardAlert} ${styles["severity" + alerta.severity]}`} title={alerta.observation || "Sin detalles"}>
                        <span className={styles.alertName}>{alerta.name}</span>
                        <div className={styles.alertActionsWrapper}>
                          <button className={styles.btnOptAlert} onClick={(e) => { e.stopPropagation(); setAlertaMenuAbierta(alertaMenuAbierta === alerta.id ? null : alerta.id); }}>
                            <MoreVertical size={14} />
                          </button>
                          {alertaMenuAbierta === alerta.id && (
                            <div className={styles.alertDropdown} onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => { setAlertaEditandoId(alerta.id); setNuevaAlerta({ name: alerta.name, severity: alerta.severity, observation: alerta.observation }); setMostrarModalAlerta(true); setAlertaMenuAbierta(null); }} className={styles.dropItem}><Edit2 size={12} /> Editar</button>
                              <button onClick={() => { setAlertaParaEliminar(alerta.id); setMostrarModalEliminar(true); setAlertaMenuAbierta(null); }} className={styles.dropItemDelete}><Trash2 size={12} /> Eliminar</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className={styles.noAlertsText}>No hay alertas médicas registradas...</p>
                  )}
                </div>
              </div>

              <div className={`${styles.card} ${styles.asistenciaCard}`}>
                <div className={styles.cardHeader}><h3>Asistencia</h3><Calendar size={18}/></div>
                {/* 🎯 Pasamos el socio al componente, el cual debería manejar el filtrado interno */}
                <ClienteAsistencia socio={cliente} />
              </div>

              <div className={`${styles.card} ${styles.pagosCard}`}>
                <div className={styles.cardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CreditCard size={18} color="#7c3aed" />
                    <h3 style={{ margin: 0 }}>Historial de Pagos</h3>
                  </div>
                  <button 
                    className={styles.btnActionTable} 
                    onClick={() => navigate("/pagos", { state: { abrirNuevoPago: true, clienteData: cliente } })}
                    title="Registrar nuevo pago"
                  >
                    <Plus size={16} /> Realizar Pago
                  </button>
                </div>
                <HistorialPagos pagos={pagos} loading={pagosLoading} />
              </div>

              <div className={`${styles.card} ${styles.rutinaCard}`}>
                <RutinaNutricion cliente={cliente} styles={styles} />
              </div>
            </div>
          )}
        </>
      )}

      {/* --- MODALES --- */}

      {mostrarModalAlerta && (
        <div className={styles.modalOverlay} onClick={() => setMostrarModalAlerta(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{alertaEditandoId ? "Editar Alerta" : "Añadir Alerta"}</h3>
              <button className={styles.modalCloseBtn} onClick={() => setMostrarModalAlerta(false)}>&times;</button>
            </div>
            <form className={styles.modalBody} onSubmit={handleGuardarAlerta}>
              <div className={styles.field}><label>Condición</label><input type="text" required value={nuevaAlerta.name} onChange={e => setNuevaAlerta({...nuevaAlerta, name: e.target.value})} className={styles.mainInput} /></div>
              <div className={styles.field}><label>Gravedad</label><select value={nuevaAlerta.severity} onChange={e => setNuevaAlerta({...nuevaAlerta, severity: e.target.value})} className={styles.mainInput}><option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option></select></div>
              <div className={styles.field}><label>Observación</label><textarea rows="3" className={styles.textareaMedical} value={nuevaAlerta.observation} onChange={e => setNuevaAlerta({...nuevaAlerta, observation: e.target.value})} /></div>
              <div className={styles.modalActions}><button type="submit" className={styles.btnSave} disabled={saving}>Guardar</button></div>
            </form>
          </div>
        </div>
      )}

      {mostrarModalEliminar && (
        <div className={styles.modalOverlay} onClick={() => setMostrarModalEliminar(false)}>
          <div className={styles.modalContent} style={{maxWidth: '400px'}} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}><h3>Eliminar Alerta</h3><button className={styles.modalCloseBtn} onClick={() => setMostrarModalEliminar(false)}>&times;</button></div>
            <div className={styles.modalBody}><p>¿Estás seguro de que deseas eliminar esta alerta médica?</p></div>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setMostrarModalEliminar(false)}>Cancelar</button>
              <button className={styles.btnDeleteConfirm} onClick={handleEliminarAlerta} disabled={saving}>{saving ? "Borrando..." : "Eliminar"}</button>
            </div>
          </div>
        </div>
      )}

      {mostrarModalEdicion && (
        <div className={styles.modalOverlay} onClick={() => setMostrarModalEdicion(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Editar Información de Socio</h3>
              <button className={styles.modalCloseBtn} onClick={() => setMostrarModalEdicion(false)}>&times;</button>
            </div>
            <form className={styles.modalBody} onSubmit={handleGuardarEdicion}>
              <div className={styles.field}>
                <label>Documento de Identidad (DNI)</label>
                <input 
                  type="text" 
                  value={formEdicion.dni} 
                  onChange={(e) => setFormEdicion({...formEdicion, dni: e.target.value})} 
                  className={styles.mainInput} 
                  required
                />
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Nombre</label>
                  <input 
                    type="text" 
                    value={formEdicion.first_name} 
                    onChange={(e) => setFormEdicion({...formEdicion, first_name: e.target.value})} 
                    className={styles.mainInput} 
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label>Apellido</label>
                  <input 
                    type="text" 
                    value={formEdicion.last_name} 
                    onChange={(e) => setFormEdicion({...formEdicion, last_name: e.target.value})} 
                    className={styles.mainInput} 
                    required
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label>Correo Electrónico</label>
                <input 
                  type="email" 
                  value={formEdicion.email} 
                  onChange={(e) => setFormEdicion({...formEdicion, email: e.target.value})} 
                  className={styles.mainInput} 
                  required
                />
              </div>

              <div className={styles.field}>
                <label>Teléfono de Contacto</label>
                <input 
                  type="text" 
                  value={formEdicion.phone} 
                  onChange={(e) => setFormEdicion({...formEdicion, phone: e.target.value})} 
                  className={styles.mainInput} 
                />
              </div>

              <div className={styles.field}>
                <label>Plan de Membresía</label>
                <select 
                  value={formEdicion.plan_id} 
                  onChange={(e) => setFormEdicion({...formEdicion, plan_id: e.target.value})} 
                  className={styles.mainInput}
                  required
                >
                  <option value="">Seleccionar un plan...</option>
                  {planes.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.btnCancel} onClick={() => setMostrarModalEdicion(false)}>Cancelar</button>
                <button type="submit" className={styles.btnSave} disabled={saving}>{saving ? "Guardando..." : "Guardar Cambios"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
export default Clientes;