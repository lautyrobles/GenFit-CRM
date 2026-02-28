import React, { useEffect, useState, useMemo } from "react";
import styles from "./Pagos.module.css";
import Loader from "../../Components/Loader/Loader";
import { useAuth } from "../../context/AuthContext";
import KpiCard from "./KpiCard";
import { Plus, Search, CheckCircle, AlertCircle, X, DollarSign, Activity, FileText } from 'lucide-react';

// --- SERVICIOS ---
import { obtenerPagos, registrarPago } from "../../assets/services/paymentsService";
import { obtenerClientePorDocumento } from "../../assets/services/clientesService";
import { registrarMovimiento } from "../../assets/services/movimientosService";

const Pagos = () => {
  const { user } = useAuth(); 
  
  const role = user?.role || "USER"; 
  const canRegisterPayments = ["SUPER_ADMIN", "ADMIN", "SUPERVISOR"].includes(role);

  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [nuevoPago, setNuevoPago] = useState({
    clienteId: null,      
    clienteDocumento: "", 
    clienteNombre: "",
    planNombre: "",       
    periodo: "",
    fechaPago: new Date().toISOString().split("T")[0],
    montoFinal: "",
    metodoPago: "EFECTIVO",
    comprobante: ""       
  });

  const mostrarToast = (msg, tipo = "error") => {
    if (tipo === "error") { setError(msg); setSuccess(""); } 
    else { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  };

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      const data = await obtenerPagos();
      const pagosFormateados = data.map(p => ({
        id: p.id, amount: p.amount, date: p.payment_date, method: p.payment_method, status: p.status,
        clientName: p.users ? `${p.users.first_name} ${p.users.last_name}` : 'Cliente Eliminado',
        clientDni: p.users?.dni || '-', planName: 'Plan Activo' 
      }));
      setPagos(pagosFormateados);
    } catch (e) {
      mostrarToast("Error al cargar el historial de pagos.", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { cargarHistorial(); }, []);

  const buscarCliente = async () => {
    const dni = nuevoPago.clienteDocumento.trim();
    if (!dni) return mostrarToast("Ingresá un DNI para buscar.", "error");
    setLoading(true); 
    try {
      const cliente = await obtenerClientePorDocumento(dni);
      if (!cliente) {
        setNuevoPago(prev => ({ ...prev, clienteNombre: "", clienteId: null }));
        return mostrarToast("Cliente no encontrado en la base de datos.", "error");
      }
      setNuevoPago((prev) => ({
        ...prev, clienteId: cliente.id, clienteNombre: `${cliente.first_name} ${cliente.last_name}`, planNombre: "Plan Vigente", 
      }));
      mostrarToast("Cliente encontrado exitosamente.", "success");
    } catch (e) { mostrarToast("Error de conexión al buscar cliente.", "error"); } 
    finally { setLoading(false); }
  };

  const handleAbrirConfirmacion = (e) => {
    e.preventDefault();
    if (!nuevoPago.clienteId) return mostrarToast("Debes buscar y seleccionar un cliente válido.", "error");
    if (!nuevoPago.montoFinal || Number(nuevoPago.montoFinal) <= 0) return mostrarToast("El monto debe ser mayor a 0.", "error");
    setShowConfirmPopup(true);
  };

  const confirmarPago = async () => {
    try {
      const pagoData = {
        user_id: nuevoPago.clienteId, amount: Number(nuevoPago.montoFinal), payment_date: nuevoPago.fechaPago,
        payment_method: nuevoPago.metodoPago, status: 'COMPLETED',
        notes: nuevoPago.comprobante ? `Ref: ${nuevoPago.comprobante} | Periodo: ${nuevoPago.periodo}` : `Periodo: ${nuevoPago.periodo}`
      };

      await registrarPago(pagoData);

      if (user?.id) {
        await registrarMovimiento(user.id, "Pagos", "CREACIÓN", `Cobro registrado de $${pagoData.amount} a ${nuevoPago.clienteNombre} (${nuevoPago.clienteDocumento})`);
      }

      mostrarToast("¡Pago registrado correctamente!", "success");
      setShowConfirmPopup(false); 
      setMostrarFormulario(false);
      setNuevoPago({ clienteId: null, clienteDocumento: "", clienteNombre: "", planNombre: "", periodo: "", fechaPago: new Date().toISOString().split("T")[0], montoFinal: "", metodoPago: "EFECTIVO", comprobante: "" });
      cargarHistorial();
    } catch (e) { console.error(e); mostrarToast("Hubo un error al guardar el pago.", "error"); }
  };

  const kpis = useMemo(() => {
    const total = pagos.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const cantidad = pagos.length;
    const promedio = cantidad > 0 ? total / cantidad : 0;
    return { total, cantidad, promedio };
  }, [pagos]);

  const pagosFiltrados = useMemo(() => {
    if (!busqueda) return pagos;
    const lower = busqueda.toLowerCase();
    return pagos.filter(p => p.clientName?.toLowerCase().includes(lower) || String(p.clientDni).includes(lower) || p.method?.toLowerCase().includes(lower));
  }, [pagos, busqueda]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevoPago((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <section className={styles.pagosLayout}>
      
      {/* --- Toasts Superiores --- */}
      <div className={styles.toastContainer}>
        {success && <div className={`${styles.toast} ${styles.toastSuccess}`}><CheckCircle size={18}/> {success}</div>}
        {error && <div className={`${styles.toast} ${styles.toastError}`}><AlertCircle size={18}/> {error}</div>}
      </div>

      {/* BLOQUE SUPERIOR ESTÁTICO (Header + KPIs) */}
      <div className={styles.topSection}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <h2>Flujo de Caja</h2>
            <p className={styles.subtitle}>Control de ingresos y transacciones.</p>
          </div>
          
          {canRegisterPayments && (
            <button
              className={styles.btnPrimary}
              onClick={() => setMostrarFormulario(true)}
            >
              <Plus size={16}/> Nuevo Cobro
            </button>
          )}
        </div>

        {/* KPIs estilo Tarjetas Premium */}
        <div className={styles.kpiGrid}>
          <KpiCard label="Total Recaudado" value={`$${kpis.total.toLocaleString()}`} icon={<DollarSign size={20}/>} trend="+Mes actual" />
          <KpiCard label="Transacciones" value={kpis.cantidad} icon={<Activity size={20}/>} />
          <KpiCard label="Ticket Promedio" value={`$${Math.round(kpis.promedio).toLocaleString()}`} icon={<FileText size={20}/>} />
        </div>
      </div>

      {/* BLOQUE INFERIOR (Tabla con scroll interno) */}
      <div className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <h3>Historial Reciente</h3>
          <div className={styles.searchBox}>
            <Search className={styles.searchIcon} size={16} />
            <input type="text" placeholder="Filtrar recibos..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
        </div>

        <div className={styles.tableScrollArea}>
          {loading && pagos.length === 0 ? (
            <div className={styles.loaderWrapper}><Loader text="Sincronizando caja..." /></div>
          ) : pagosFiltrados.length > 0 ? (
            <table className={styles.modernTable}>
              <thead>
                <tr>
                  <th>Socio</th>
                  <th>DNI</th>
                  <th>Membresía</th>
                  <th>Canal</th>
                  <th>Fecha</th>
                  <th className={styles.textRight}>Importe</th>
                  <th className={styles.textCenter}>Status</th>
                </tr>
              </thead>
              <tbody>
                {pagosFiltrados.map((p) => (
                  <tr key={p.id}>
                    <td className={styles.fwBold}>{p.clientName}</td>
                    <td className={styles.textMuted}>{p.clientDni}</td>
                    <td><span className={styles.planBadge}>{p.planName}</span></td>
                    <td><span className={styles.methodPill}>{p.method?.replace('_', ' ')}</span></td>
                    <td className={styles.dateText}>{new Date(p.date).toLocaleDateString()}</td>
                    <td className={`${styles.textRight} ${styles.amountText}`}>${Number(p.amount).toLocaleString()}</td>
                    <td className={styles.textCenter}>
                      <span className={`${styles.statusPill} ${styles.confirmed}`}>
                        <CheckCircle size={12}/> {p.status === 'COMPLETED' ? 'Aprobado' : p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <Activity size={32} />
              <p>No se encontraron movimientos financieros.</p>
            </div>
          )}
        </div>
      </div>

      {/* =========================================
          🪟 MODAL: FORMULARIO DE NUEVO COBRO 
          ========================================= */}
      {mostrarFormulario && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setMostrarFormulario(false)}>
          <div className={styles.largeModalCard}>
            
            <div className={styles.modalHeaderFlex}>
              <div>
                <h3 className={styles.modalTitle}>Registrar Cobro</h3>
                <p className={styles.modalSubtitle}>Ingresa los datos del pago y asocialo a un cliente.</p>
              </div>
              <button className={styles.closeIconButton} onClick={() => setMostrarFormulario(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAbrirConfirmacion}>
              <div className={styles.formSplit}>
                
                {/* Columna Izquierda */}
                <div className={styles.formColumn}>
                  <h4 className={styles.columnTitle}>Identificación del Socio</h4>
                  <div className={styles.formGroup}>
                    <label>Documento de Identidad</label>
                    <div className={styles.inputWithAction}>
                      <input type="text" name="clienteDocumento" value={nuevoPago.clienteDocumento} onChange={handleChange} placeholder="Ej: 30123456" autoFocus />
                      <button type="button" onClick={buscarCliente} disabled={loading} title="Buscar">
                        {loading ? "..." : <Search size={16}/>}
                      </button>
                    </div>
                  </div>
                  <div className={styles.rowTwo}>
                    <div className={styles.formGroup}>
                      <label>Cliente Verificado</label>
                      <input type="text" value={nuevoPago.clienteNombre} readOnly placeholder="Automático" className={styles.readOnlyInput} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Plan Asignado</label>
                      <input type="text" value={nuevoPago.planNombre} readOnly placeholder="Automático" className={styles.readOnlyInput} />
                    </div>
                  </div>
                </div>

                {/* Columna Derecha */}
                <div className={styles.formColumn}>
                  <h4 className={styles.columnTitle}>Condiciones de Cobro</h4>
                  <div className={styles.rowTwo}>
                    <div className={styles.formGroup}>
                      <label>Monto a percibir ($)</label>
                      <input type="number" name="montoFinal" value={nuevoPago.montoFinal} onChange={handleChange} placeholder="0.00" className={styles.amountInput} min="0" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Fecha Efectiva</label>
                      <input type="date" name="fechaPago" value={nuevoPago.fechaPago} onChange={handleChange} />
                    </div>
                  </div>
                  <div className={styles.rowTwo}>
                    <div className={styles.formGroup}>
                      <label>Medio de Pago</label>
                      <select name="metodoPago" value={nuevoPago.metodoPago} onChange={handleChange}>
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                        <option value="MERCADO_PAGO">Mercado Pago</option>
                        <option value="TARJETA_DEBITO">Tarjeta Débito</option>
                        <option value="TARJETA_CREDITO">Tarjeta Crédito</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Período Cubierto</label>
                      <input type="month" name="periodo" value={nuevoPago.periodo} onChange={handleChange} />
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.formFooter}>
                <button type="button" onClick={() => setMostrarFormulario(false)} className={styles.btnCancelText}>Cancelar</button>
                <button type="submit" className={styles.btnSubmit}>Continuar a Confirmación</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          🪟 MODAL: CONFIRMACIÓN FINAL (Doble capa)
          ========================================= */}
      {showConfirmPopup && (
        <div className={`${styles.modalOverlay} ${styles.confirmOverlay}`}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Verificar Emisión</h3>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.receiptLine}>
                <span className={styles.receiptLabel}>Beneficiario:</span>
                <span className={styles.receiptValue}>{nuevoPago.clienteNombre}</span>
              </div>
              <div className={styles.receiptLine}>
                <span className={styles.receiptLabel}>Monto total:</span>
                <span className={styles.receiptTotal}>${nuevoPago.montoFinal}</span>
              </div>
              
              <div className={styles.hrLine}></div>

              <div className={styles.receiptGrid}>
                <div className={styles.gridItem}>
                  <small>Canal</small><p>{nuevoPago.metodoPago}</p>
                </div>
                <div className={styles.gridItem}>
                  <small>Fecha</small><p>{nuevoPago.fechaPago}</p>
                </div>
                <div className={styles.gridItem}>
                  <small>Identificación</small><p>{nuevoPago.clienteDocumento}</p>
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnOutline} onClick={() => setShowConfirmPopup(false)}>Revisar datos</button>
              <button className={styles.btnConfirm} onClick={confirmarPago}>Emitir Comprobante</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Pagos;