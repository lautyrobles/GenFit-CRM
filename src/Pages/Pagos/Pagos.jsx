import React, { useEffect, useState, useCallback } from "react";
import styles from "./Pagos.module.css";
import { useAuth } from "../../context/AuthContext";
import { Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { useLocation, useNavigate } from "react-router-dom";

// --- COMPONENTES ATÓMICOS ---
import KpiSection from "./PagosComponents/KpiSection";
import HistorialTable from "./PagosComponents/HistorialTable";
import ModalNuevoPago from "./PagosComponents/ModalNuevoPago";
import ModalConfirmacion from "./PagosComponents/ModalConfirmacion";

// --- SERVICIOS ---
import { obtenerPagos } from "../../assets/services/paymentsService";

const Pagos = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // 👑 Lógica de SUPERADMIN y permisos
  const role = user?.role?.replace("_", "").toUpperCase() || "STAFF";
  const isSuperAdmin = role === "SUPERADMIN";
  const canRegisterPayments = ["SUPERADMIN", "ADMIN", "SUPERVISOR"].includes(role);

  // Estados Principales
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Estados de Flujo de Modales
  const [step, setStep] = useState("IDLE"); // IDLE, FORM, CONFIRM
  const [datosTemporales, setDatosTemporales] = useState(null);
  const [socioPreseleccionado, setSocioPreseleccionado] = useState(null);

  // Helper para notificaciones visuales
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

  /**
   * 🔄 Carga de historial corregida para acceso global
   */
  const cargarHistorial = useCallback(async () => {
    // 🛡️ CORRECCIÓN: Si no hay gym_id Y no es SuperAdmin, apagamos el loader y salimos
    if (!user?.gym_id && !isSuperAdmin) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // El SuperAdmin puede mandar null para traer data global
      const targetGymId = isSuperAdmin ? (user?.gym_id || null) : user.gym_id;
      
      const data = await obtenerPagos(targetGymId);
      
      const pagosFormateados = data.map(p => ({
        id: p.id,
        amount: p.amount,
        date: p.payment_date,
        method: p.payment_method,
        status: p.status,
        clientName: p.users ? `${p.users.first_name} ${p.users.last_name}` : 'Cliente Eliminado',
        clientDni: p.users?.dni || '-',
        planName: p.users?.plans?.name || 'Sin Plan' 
      }));
      
      setPagos(pagosFormateados);
    } catch (e) {
      console.error("Error en Pagos:", e);
      mostrarToast("Error al sincronizar historial.", "error");
    } finally {
      setLoading(false); // ✅ Garantizamos que el loader se apague siempre
    }
  }, [user?.gym_id, isSuperAdmin]);

  /**
   * 🎯 EFECTO PARA DETECTAR REDIRECCIÓN DESDE CLIENTES
   */
  useEffect(() => {
    if (location.state?.abrirNuevoPago && location.state?.clienteData) {
      setSocioPreseleccionado(location.state.clienteData);
      setStep("FORM");
      
      // Limpiamos el state de la navegación para evitar bucles al recargar
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Recargar cuando el componente monta o el gym_id cambia
  useEffect(() => { 
    cargarHistorial(); 
  }, [cargarHistorial]);

  return (
    <section className={styles.pagosLayout}>
      
      {/* --- Toasts --- */}
      <div className={styles.toastContainer}>
        {success && <div className={`${styles.toast} ${styles.toastSuccess}`}><CheckCircle size={18}/> {success}</div>}
        {error && <div className={`${styles.toast} ${styles.toastError}`}><AlertCircle size={18}/> {error}</div>}
      </div>

      {/* --- Header & KPIs --- */}
      <div className={styles.topSection}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <h2>Flujo de Caja</h2>
            <p className={styles.subtitle}>Gestión de ingresos y membresías.</p>
          </div>
          {canRegisterPayments && (
            <button className={styles.btnPrimary} onClick={() => {
                setSocioPreseleccionado(null); 
                setStep("FORM");
            }}>
              <Plus size={16}/> Nuevo Cobro
            </button>
          )}
        </div>
        <KpiSection pagos={pagos} />
      </div>

      {/* --- Tabla de Historial --- */}
      <HistorialTable pagos={pagos} loading={loading} />

      {/* --- MODAL PASO 1: Formulario --- */}
      {step === "FORM" && (
        <ModalNuevoPago 
          onClose={() => {
              setStep("IDLE");
              setSocioPreseleccionado(null);
          }} 
          socioInicial={socioPreseleccionado} 
          onContinue={(datos) => {
            setDatosTemporales(datos);
            setStep("CONFIRM");
          }}
        />
      )}

      {/* --- MODAL PASO 2: Confirmación, Loader y Éxito --- */}
      {step === "CONFIRM" && (
        <ModalConfirmacion 
          datos={datosTemporales} 
          user={user}
          onBack={() => setStep("FORM")}
          onSuccess={() => {
            setStep("IDLE");
            setDatosTemporales(null);
            setSocioPreseleccionado(null);
            cargarHistorial(); // Refrescamos la tabla tras el éxito
            mostrarToast("¡Transacción finalizada!", "success");
          }}
        />
      )}

    </section>
  );
};

export default Pagos;