import React, { useEffect, useState, useMemo } from "react";
import styles from "./Pagos.module.css";
import Loader from "../../Components/Loader/Loader";
import { useAuth } from "../../context/AuthContext";

// --- SERVICIOS ---
import { obtenerPagos, registrarPago } from "../../assets/services/paymentsService";
import { obtenerClientePorDocumento } from "../../assets/services/clientesService";
import { registrarMovimiento } from "../../assets/services/movimientosService";

const Pagos = () => {
  const { user } = useAuth(); // Usuario logueado (Admin/Supervisor)
  
  // Roles permitidos
  const role = user?.role || "USER"; 
  const canRegisterPayments = ["SUPER_ADMIN", "ADMIN", "SUPERVISOR"].includes(role);

  // --- ESTADOS DE DATOS ---
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  // --- ESTADOS DE INTERFAZ ---
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // --- ESTADO DEL FORMULARIO ---
  const [nuevoPago, setNuevoPago] = useState({
    clienteId: null,      // ID interno de Supabase (UUID)
    clienteDocumento: "", // DNI para buscar
    clienteNombre: "",
    planNombre: "",       // Visual
    periodo: "",
    fechaPago: new Date().toISOString().split("T")[0],
    montoFinal: "",
    metodoPago: "EFECTIVO",
    comprobante: ""       // Notas
  });

  // ===============================================================
  // 🔔 TOAST HELPER
  // ===============================================================
  const mostrarToast = (msg, tipo = "error") => {
    if (tipo === "error") {
      setError(msg);
      setSuccess("");
    } else {
      setSuccess(msg);
      setError("");
    }
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  };

  // ===============================================================
  // 📥 CARGAR DATOS (READ)
  // ===============================================================
  const cargarHistorial = async () => {
    try {
      setLoading(true);
      const data = await obtenerPagos();
      
      // Mapeamos de snake_case (Supabase) a camelCase (UI)
      const pagosFormateados = data.map(p => ({
        id: p.id,
        amount: p.amount,
        date: p.payment_date,
        method: p.payment_method,
        status: p.status,
        clientName: p.users ? `${p.users.first_name} ${p.users.last_name}` : 'Cliente Eliminado',
        clientDni: p.users?.dni || '-',
        planName: 'Plan Activo' // Si tuvieras relación con planes, iría aquí
      }));

      setPagos(pagosFormateados);
    } catch (e) {
      mostrarToast("Error al cargar el historial de pagos.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  // ===============================================================
  // 🔍 BUSCAR CLIENTE
  // ===============================================================
  const buscarCliente = async () => {
    const dni = nuevoPago.clienteDocumento.trim();
    if (!dni) return mostrarToast("Ingresá un DNI para buscar.", "error");

    setLoading(true); // Pequeño loading visual
    try {
      const cliente = await obtenerClientePorDocumento(dni);

      if (!cliente) {
        setNuevoPago(prev => ({ ...prev, clienteNombre: "", clienteId: null }));
        return mostrarToast("Cliente no encontrado en la base de datos.", "error");
      }

      setNuevoPago((prev) => ({
        ...prev,
        clienteId: cliente.id, // Guardamos el UUID para la relación
        clienteNombre: `${cliente.first_name} ${cliente.last_name}`,
        planNombre: "Plan Vigente", // Aquí podrías hacer fetch del plan si es necesario
      }));

      mostrarToast("Cliente encontrado exitosamente.", "success");
    } catch (e) {
      mostrarToast("Error de conexión al buscar cliente.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ===============================================================
  // 💾 CONFIRMAR PAGO (CREATE)
  // ===============================================================
  const handleAbrirConfirmacion = (e) => {
    e.preventDefault();
    if (!nuevoPago.clienteId) return mostrarToast("Debes buscar y seleccionar un cliente válido.", "error");
    if (!nuevoPago.montoFinal || Number(nuevoPago.montoFinal) <= 0) return mostrarToast("El monto debe ser mayor a 0.", "error");
    
    setShowConfirmPopup(true);
  };

  const confirmarPago = async () => {
    try {
      // 1. Preparar objeto para DB (snake_case)
      const pagoData = {
        user_id: nuevoPago.clienteId,
        amount: Number(nuevoPago.montoFinal),
        payment_date: nuevoPago.fechaPago,
        payment_method: nuevoPago.metodoPago,
        status: 'COMPLETED',
        notes: nuevoPago.comprobante ? `Ref: ${nuevoPago.comprobante} | Periodo: ${nuevoPago.periodo}` : `Periodo: ${nuevoPago.periodo}`
      };

      // 2. Insertar en Supabase
      await registrarPago(pagoData);

      // 3. Registrar en Auditoría (System Logs)
      if (user?.id) {
        await registrarMovimiento(
          user.id,
          "Pagos",
          "CREACIÓN",
          `Cobro registrado de $${pagoData.amount} a ${nuevoPago.clienteNombre} (${nuevoPago.clienteDocumento})`
        );
      }

      // 4. Actualizar UI
      mostrarToast("¡Pago registrado correctamente!", "success");
      setShowConfirmPopup(false);
      setMostrarFormulario(false);
      
      // 5. Resetear formulario
      setNuevoPago({
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

      // 6. Recargar lista
      cargarHistorial();

    } catch (e) {
      console.error(e);
      mostrarToast("Hubo un error al guardar el pago.", "error");
    }
  };

  // ===============================================================
  // 📊 CALCULOS EN TIEMPO REAL
  // ===============================================================
  const kpis = useMemo(() => {
    const total = pagos.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const cantidad = pagos.length;
    const promedio = cantidad > 0 ? total / cantidad : 0;
    return { total, cantidad, promedio };
  }, [pagos]);

  const pagosFiltrados = useMemo(() => {
    if (!busqueda) return pagos;
    const lower = busqueda.toLowerCase();
    return pagos.filter(
      (p) =>
        p.clientName?.toLowerCase().includes(lower) ||
        String(p.clientDni).includes(lower) ||
        p.method?.toLowerCase().includes(lower)
    );
  }, [pagos, busqueda]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevoPago((prev) => ({ ...prev, [name]: value }));
  };

  // ===============================================================
  // 🎨 RENDER
  // ===============================================================
  return (
    <section className={styles.pagosContainer}>
      
      {/* --- Toasts --- */}
      <div className={styles.toastContainer}>
        {success && <div className={`${styles.toast} ${styles.toastSuccess}`}>✅ {success}</div>}
        {error && <div className={`${styles.toast} ${styles.toastError}`}>⚠️ {error}</div>}
      </div>

      {/* --- Header --- */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h2>Gestión de pagos</h2>
          <p className={styles.subtitle}>Administración de caja y cobros.</p>
        </div>
        
        {canRegisterPayments && (
          <button
            className={mostrarFormulario ? `${styles.btnPrimary} ${styles.btnCancel}` : styles.btnPrimary}
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
          >
            {mostrarFormulario ? "Cancelar operación" : "+ Nuevo Pago"}
          </button>
        )}
      </div>

      {/* --- KPIs --- */}
      {!mostrarFormulario && (
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Total Recaudado</span>
            <span className={styles.kpiValue}>${kpis.total.toLocaleString()}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Transacciones</span>
            <span className={styles.kpiValue}>{kpis.cantidad}</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Ticket Promedio</span>
            <span className={styles.kpiValue}>${Math.round(kpis.promedio).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* --- Formulario --- */}
      <div className={`${styles.collapseSection} ${mostrarFormulario ? styles.open : ''}`}>
        <div className={styles.formContainer}>
          <form onSubmit={handleAbrirConfirmacion}>
            <div className={styles.formSplit}>
              
              {/* Columna Izquierda */}
              <div className={styles.formColumn}>
                <h4 className={styles.columnTitle}>👤 Datos del Cliente</h4>
                
                <div className={styles.formGroup}>
                  <label>DNI / Documento</label>
                  <div className={styles.inputWithAction}>
                    <input
                      type="text"
                      name="clienteDocumento"
                      value={nuevoPago.clienteDocumento}
                      onChange={handleChange}
                      placeholder="Ej: 30123456"
                      autoFocus
                    />
                    <button type="button" onClick={buscarCliente} disabled={loading} title="Buscar">
                      {loading ? "..." : "🔍"}
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Cliente</label>
                  <input
                    type="text"
                    value={nuevoPago.clienteNombre}
                    readOnly
                    placeholder="Se completa al buscar..."
                    className={styles.readOnlyInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Plan (Referencia)</label>
                  <input
                    type="text"
                    value={nuevoPago.planNombre}
                    readOnly
                    className={styles.readOnlyInput}
                  />
                </div>
              </div>

              {/* Columna Derecha */}
              <div className={styles.formColumn}>
                <h4 className={styles.columnTitle}>💰 Detalles del Pago</h4>
                
                <div className={styles.rowTwo}>
                  <div className={styles.formGroup}>
                    <label>Monto ($)</label>
                    <input
                      type="number"
                      name="montoFinal"
                      value={nuevoPago.montoFinal}
                      onChange={handleChange}
                      placeholder="0.00"
                      className={styles.amountInput}
                      min="0"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Fecha</label>
                    <input
                      type="date"
                      name="fechaPago"
                      value={nuevoPago.fechaPago}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className={styles.rowTwo}>
                  <div className={styles.formGroup}>
                    <label>Método de Pago</label>
                    <select name="metodoPago" value={nuevoPago.metodoPago} onChange={handleChange}>
                      <option value="EFECTIVO">💵 Efectivo</option>
                      <option value="TRANSFERENCIA">🏦 Transferencia</option>
                      <option value="MERCADO_PAGO">📱 Mercado Pago</option>
                      <option value="TARJETA_DEBITO">💳 Débito</option>
                      <option value="TARJETA_CREDITO">💳 Crédito</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Período (Opcional)</label>
                    <input
                      type="month"
                      name="periodo"
                      value={nuevoPago.periodo}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Ref. Comprobante / Nota</label>
                  <input
                    type="text"
                    name="comprobante"
                    value={nuevoPago.comprobante}
                    onChange={handleChange}
                    placeholder="# Operación, nota interna..."
                  />
                </div>
              </div>
            </div>

            <div className={styles.formFooter}>
              <button type="submit" className={styles.btnSubmit}>Continuar al Resumen</button>
            </div>
          </form>
        </div>
      </div>

      {/* --- Tabla --- */}
      <div className={styles.tableSection}>
        <div className={styles.tableToolbar}>
          <h3>Historial de Transacciones</h3>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input 
              type="text" 
              placeholder="Buscar por cliente, DNI..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.tableContainer}>
          {loading && pagos.length === 0 ? (
            <div style={{ padding: 20 }}><Loader text="Cargando pagos..." /></div>
          ) : pagosFiltrados.length > 0 ? (
            <table className={styles.modernTable}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>DNI</th>
                  <th>Concepto</th>
                  <th>Método</th>
                  <th>Fecha</th>
                  <th className={styles.textRight}>Monto</th>
                  <th className={styles.textCenter}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pagosFiltrados.map((p) => (
                  <tr key={p.id}>
                    <td className={styles.fwBold}>{p.clientName}</td>
                    <td className={styles.textMuted}>{p.clientDni}</td>
                    <td><span className={styles.planBadge}>{p.planName}</span></td>
                    <td>{p.method?.replace('_', ' ')}</td>
                    <td>{new Date(p.date).toLocaleDateString()}</td>
                    <td className={`${styles.textRight} ${styles.amountText}`}>
                      ${Number(p.amount).toLocaleString()}
                    </td>
                    <td className={styles.textCenter}>
                      <span className={`${styles.statusPill} ${styles.confirmed}`}>
                        {p.status === 'COMPLETED' ? 'CONFIRMADO' : p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
              <p>No se encontraron transacciones recientes.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- Modal Confirmación --- */}
      {showConfirmPopup && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Confirmar Registro</h3>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.summaryItem}>
                <span>Cliente:</span>
                <strong>{nuevoPago.clienteNombre}</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Monto a cobrar:</span>
                <strong className={styles.bigTotal}>${nuevoPago.montoFinal}</strong>
              </div>
              <div className={styles.summaryGrid}>
                <div><small>Método</small><p>{nuevoPago.metodoPago}</p></div>
                <div><small>Fecha</small><p>{nuevoPago.fechaPago}</p></div>
                <div><small>DNI</small><p>{nuevoPago.clienteDocumento}</p></div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnOutline} onClick={() => setShowConfirmPopup(false)}>
                Corregir
              </button>
              <button className={styles.btnPrimary} onClick={confirmarPago}>
                ✅ Registrar Cobro
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};

export default Pagos;