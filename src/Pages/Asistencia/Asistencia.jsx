import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom"; // Importante para recibir el DNI
import styles from "./Asistencia.module.css";
import { Search, CheckCircle, XCircle, AlertTriangle, Clock, UserCheck } from "lucide-react";
import Loader from "../../Components/Loader/Loader";

// Servicios
import { 
  registrarAsistenciaManual, 
  buscarSocioParaAsistencia, 
  obtenerHistorialHoy 
} from "../../assets/services/asistenciaService";

const Asistencia = () => {
  const { state } = useLocation(); // Capturamos el estado enviado desde Clientes
  const [busqueda, setBusqueda] = useState(state?.dni || "");
  const [socio, setSocio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [mensajeTemporal, setMensajeTemporal] = useState("");

  // Memorizamos la carga de historial para evitar re-renderizados innecesarios
  const cargarHistorial = useCallback(async () => {
    try {
      const data = await obtenerHistorialHoy();
      setHistorial(data || []);
    } catch (error) {
      console.error("Error al cargar historial", error);
    } finally {
      setLoadingHistorial(false);
    }
  }, []);

  // Carga inicial e historial
  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  // Si entramos con un DNI desde el perfil, ejecutamos la búsqueda automáticamente
  useEffect(() => {
    if (state?.dni) {
      handleBuscar();
    }
  }, [state]);

  const mostrarMensaje = (msg) => {
    setMensajeTemporal(msg);
    setTimeout(() => setMensajeTemporal(""), 3000);
  };

  const handleBuscar = async (e) => {
    if (e) e.preventDefault();
    const dniLimpio = busqueda.trim();
    if (!dniLimpio) return;
    
    setLoading(true);
    setSocio(null);
    try {
      const data = await buscarSocioParaAsistencia(dniLimpio);
      if (data) setSocio(data);
      else mostrarMensaje("Socio no encontrado");
    } catch (error) {
      mostrarMensaje("No se encontró el DNI");
    } finally {
      setLoading(false);
    }
  };

  // Lógica Semáforo (Verde, Amarillo, Rojo)
  const calcularEstado = (s) => {
    // 1. RESTRICCIONES (ROJO)
    if (!s.enabled) {
      return { status: "rojo", text: "Cuenta Inhabilitada", icon: <XCircle size={24}/> };
    }
    if (!s.plan_id) {
      return { status: "rojo", text: "Sin Plan Asignado", icon: <XCircle size={24}/> };
    }

    // 2. REINCIDENCIA - YA INGRESÓ (AMARILLO)
    const yaIngresoHoy = historial.find(log => log.user_id === s.id && log.access_granted);
    if (yaIngresoHoy) {
      const horaIngreso = new Date(yaIngresoHoy.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return { 
        status: "amarillo", 
        text: `Ya ingresó hoy (${horaIngreso} hs)`, 
        icon: <Clock size={24}/> 
      };
    }

    // 3. TODO CORRECTO (VERDE)
    return { status: "verde", text: "Acceso Autorizado", icon: <CheckCircle size={24}/> };
  };

  const handleRegistrarEntrada = async () => {
    if (!socio) return;
    const estadoInfo = calcularEstado(socio);
    const granted = estadoInfo.status !== "rojo";
    const msg = `Ingreso manual - ${estadoInfo.text}`;

    try {
      await registrarAsistenciaManual(socio.id, granted, msg);
      mostrarMensaje("✅ Asistencia registrada");
      setSocio(null);
      setBusqueda("");
      cargarHistorial();
    } catch (error) {
      mostrarMensaje("❌ Error al registrar");
    }
  };

  return (
    <section className={styles.asistenciaLayout}>
      <div className={styles.headerTitle}>
        <h2 className={styles.sectionTitle}>Control de Acceso</h2>
        <p>Busca por DNI o escanea el carnet para ticar el ingreso.</p>
      </div>

      <div className={styles.mainGrid}>
        
        {/* PANEL IZQUIERDO: BUSCADOR Y CHECK-IN */}
        <div className={styles.checkinPanel}>
          <div className={styles.searchSection}>
            <div className={styles.searchHeader}>
              <h3>Registrar Ingreso</h3>
              {mensajeTemporal && <span className={styles.toastMini}>{mensajeTemporal}</span>}
            </div>
            
            <form onSubmit={handleBuscar} className={styles.searchControls}>
              <div className={styles.inputWrapper}>
                <Search className={styles.searchIcon} size={18} />
                <input
                  type="text"
                  placeholder="Escanear o escribir DNI..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className={styles.mainInput}
                  autoFocus
                />
              </div>
              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? "Buscando..." : "Buscar"}
              </button>
            </form>
          </div>

          {loading && <div className={styles.loaderCenter}><Loader text="Verificando socio..." /></div>}

          {socio && !loading && (() => {
            const estado = calcularEstado(socio);
            return (
              <div className={`${styles.socioCard} ${styles.fadeIn}`}>
                <div className={`${styles.statusBanner} ${styles[estado.status]}`}>
                  {estado.icon}
                  <span>{estado.text}</span>
                </div>
                
                <div className={styles.socioInfo}>
                  <div className={styles.avatarLarge}>
                    {socio.first_name[0]}{socio.last_name[0]}
                  </div>
                  <div className={styles.socioDetails}>
                    <h3>{socio.first_name} {socio.last_name}</h3>
                    <p>DNI: {socio.dni}</p>
                    <span className={styles.planBadge}>{socio.plans?.name || "Sin Plan"}</span>
                  </div>
                </div>

                <button 
                  className={`
                    ${styles.btnCheckIn} 
                    ${estado.status === 'rojo' ? styles.btnCheckInRojo : 
                      estado.status === 'amarillo' ? styles.btnCheckInAmarillo : 
                      styles.btnCheckInVerde}
                  `}
                  onClick={handleRegistrarEntrada}
                >
                  <UserCheck size={20} />
                  {estado.status === 'rojo' ? 'Forzar Ingreso (Bloqueado)' : 
                   estado.status === 'amarillo' ? 'Volver a Registrar' : 'Confirmar Ingreso'}
                </button>
              </div>
            );
          })()}
        </div>

        {/* PANEL DERECHO: HISTORIAL */}
        <div className={styles.historyPanel}>
          <div className={styles.historyHeader}>
            <h3>Ingresos de Hoy</h3>
            <Clock size={18} className={styles.titleIcon} />
          </div>
          
          <div className={styles.historyList}>
            {loadingHistorial ? (
              <Loader text="Cargando historial..." />
            ) : historial.length > 0 ? (
              historial.map((log) => (
                <div key={log.id} className={`${styles.historyItem} ${!log.access_granted ? styles.itemDenied : ''}`}>
                  <div className={styles.historyTime}>
                    {new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className={styles.historyData}>
                    <strong>{log.users?.first_name} {log.users?.last_name}</strong>
                    <small>{log.message}</small>
                  </div>
                  {log.access_granted ? (
                    <CheckCircle size={16} className={styles.iconGranted} />
                  ) : (
                    <XCircle size={16} className={styles.iconDenied} />
                  )}
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <p>Aún no hay ingresos registrados hoy.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Asistencia;