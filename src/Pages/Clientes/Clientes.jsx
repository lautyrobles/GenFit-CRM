import React, { useState, useEffect, useMemo, useRef } from "react"
import styles from "./Clientes.module.css"
import { useNavigate, useLocation } from "react-router-dom"
import { obtenerClientes, obtenerClientePorDocumento, actualizarCliente } from "../../assets/services/clientesService"
import { obtenerPlanes } from "../../assets/services/planesService"
import { obtenerPagos } from "../../assets/services/paymentsService"
import { obtenerAlertasMedicas, eliminarAlertaMedica, crearAlertaMedica, actualizarAlertaMedica } from "../../assets/services/medicalService"
import Loader from "../../Components/Loader/Loader"
import CustomersTable from '../../Components/CustomersTable/CustomersTable';
import { Search, User, Mail, Phone, CreditCard, Calendar, Edit3, ArrowLeft, AlertCircle, Plus, MoreVertical, Trash2, Edit2 } from 'lucide-react'
import { useAuth } from "../../context/AuthContext" 

const Clientes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); 
  const qrProcesado = useRef(false);

  // --- 👑 LÓGICA DE SUPERADMIN ---
  const isSuperAdmin = user?.role?.replace("_", "").toUpperCase() === "SUPERADMIN";

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
  const [formEdicion, setFormEdicion] = useState({ dni: "", first_name: "", last_name: "", email: "", phone: "", plan_id: "" })

  useEffect(() => {
    const incomingClient = location.state?.clienteSeleccionado;
    if (incomingClient && !qrProcesado.current) {
      setCliente(incomingClient);
      qrProcesado.current = true;
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Carga de Planes (Permitir null para SuperAdmin)
  useEffect(() => {
    if (!user?.gym_id && !isSuperAdmin) return;
    const loadPlanes = async () => {
      try {
        const data = await obtenerPlanes(user.gym_id || null);
        setPlanes(data || []);
      } catch (err) { console.error("Error planes", err) }
    }
    loadPlanes()
  }, [user?.gym_id, isSuperAdmin]);

  // Carga de Pagos y Alertas (Permitir null para SuperAdmin)
  useEffect(() => {
    if (!cliente?.id || (!user?.gym_id && !isSuperAdmin)) return;
    const fetchDatosExtras = async () => {
      setPagosLoading(true); setAlertasLoading(true);
      try {
        const targetId = isSuperAdmin ? (user?.gym_id || null) : user.gym_id;
        const [dataPagos, dataAlertas] = await Promise.all([
          obtenerPagos(targetId), 
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
  }, [cliente, user?.gym_id, isSuperAdmin]);

  const handleBuscar = async () => {
    if (!busqueda.trim() || (!user?.gym_id && !isSuperAdmin)) return;
    setLoading(true); setCliente(null);
    try {
      const targetId = isSuperAdmin ? (user?.gym_id || null) : user.gym_id;
      let resultados = [];
      if (filtroActivo === "dni") {
        const data = await obtenerClientePorDocumento(busqueda, targetId)
        resultados = data ? [data] : []
      } else {
        const todos = await obtenerClientes(targetId)
        resultados = todos.filter(c => 
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(busqueda.toLowerCase().trim())
        )
      }
      if (resultados.length === 1) setCliente(resultados[0]);
    } catch (err) { console.error(err) } 
    finally { setLoading(false) }
  }

  // ... (Siguen funciones de guardado y modales que se mantienen igual)

  return (
    <section className={styles.clientesLayout}>
      {mensajeTemporal && <div className={styles.floatingToast}>{mensajeTemporal}</div>}
      <div className={styles.searchSection}>
        <div className={styles.searchHeader}>
          <h2 className={styles.sectionTitle}>Buscar cliente</h2>
          {cliente && <button className={styles.btnBack} onClick={() => setCliente(null)}><ArrowLeft size={16} /> Volver</button>}
        </div>
        <div className={styles.searchControls}>
          <div className={styles.inputWrapper}>
            <Search className={styles.searchIcon} size={18} />
            <input type="text" placeholder={`Buscar por ${filtroActivo}...`} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleBuscar()} className={styles.mainInput} />
          </div>
          <button onClick={handleBuscar} className={styles.btnPrimary}>Buscar</button>
        </div>
      </div>

      {loading ? <div className={styles.loaderCenter}><Loader text="Sincronizando socio..." /></div> : (
        <>
          {!cliente && <CustomersTable onSelectCliente={(c) => setCliente(c)} gymId={user?.gym_id || null} />}
          {cliente && (
            <div className={styles.dashboardGrid}>
              {/* Renderizado de infoCard, asistenciaCard, pagosCard y rutinaCard */}
            </div>
          )}
        </>
      )}
    </section>
  )
}
export default Clientes;