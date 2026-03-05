import React, { useEffect, useState, useCallback } from "react";
import styles from "./Pagos.module.css";
import { useAuth } from "../../context/AuthContext";
import { Plus, CheckCircle, AlertCircle } from 'lucide-react';

// --- COMPONENTES ATÓMICOS ---
import KpiSection from "./PagosComponents/KpiSection";
import HistorialTable from "./PagosComponents/HistorialTable";
import ModalNuevoPago from "./PagosComponents/ModalNuevoPago";
import ModalConfirmacion from "./PagosComponents/ModalConfirmacion";

// --- SERVICIOS ---
import { obtenerPagos } from "../../assets/services/paymentsService";

const Pagos = () => {
  const { user } = useAuth();
  const role = user?.role || "USER";
  const canRegisterPayments = ["SUPER_ADMIN", "ADMIN", "SUPERVISOR"].includes(role);

  // Estados Principales
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Estados de Flujo de Modales
  const [step, setStep] = useState("IDLE"); // IDLE, FORM, CONFIRM
  const [datosTemporales, setDatosTemporales] = useState(null);

  const mostrarToast = (msg, tipo = "error") => {
    if (tipo === "error") { setError(msg); setSuccess(""); } 
    else { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  };

  const cargarHistorial = useCallback(async () => {
    try {
      setLoading(true);
      const data = await obtenerPagos();
      
      const pagosFormateados = data.map(p => ({
        id: p.id,
        amount: p.amount,
        date: p.payment_date,
        method: p.payment_method,
        status: p.status,
        clientName: p.users ? `${p.users.first_name} ${p.users.last_name}` : 'Cliente Eliminado',
        clientDni: p.users?.dni || '-',
        // 👇 AQUÍ ESTÁ EL CAMBIO: Extraemos el nombre real del plan
        planName: p.users?.plans?.name || 'Sin Plan' 
      }));
      
      setPagos(pagosFormateados);
    } catch (e) {
      mostrarToast("Error al sincronizar historial.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

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
            <button className={styles.btnPrimary} onClick={() => setStep("FORM")}>
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
          onClose={() => setStep("IDLE")} 
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
            cargarHistorial();
            mostrarToast("¡Transacción finalizada!", "success");
          }}
        />
      )}

    </section>
  );
};

export default Pagos;