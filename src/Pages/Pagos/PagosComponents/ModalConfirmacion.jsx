import React, { useState } from 'react';
import { Check, Printer, AlertCircle, XCircle } from 'lucide-react';
import Loader from '../../../Components/Loader/Loader';
import { supabase } from '../../../assets/services/supabaseClient';
import { registrarPago } from '../../../assets/services/paymentsService';
import { actualizarCliente } from '../../../assets/services/clientesService';
import { registrarMovimiento } from '../../../assets/services/movimientosService';
import styles from '../Pagos.module.css';

const ModalConfirmacion = ({ datos, onBack, onSuccess, user }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(""); // 👈 Estado para manejar errores sin alerts

const ejecutarPago = async () => {
  if (isProcessing || isSuccess) return;

  setIsProcessing(true);
  setErrorMessage("");

  try {
    await registrarPago(datos, user.gym_id);
    
    try {
      await registrarMovimiento(user.id, "Pagos", "COBRO", `Cobro a ${datos.clienteNombre}`, user.gym_id);
    } catch (moveErr) {
      console.warn("No se pudo registrar movimiento:", moveErr);
    }

    setIsSuccess(true);
  } catch (e) {
    console.error("❌ Detalle del error en Modal:", e);
    // Extraemos el mensaje real del error
    const msj = e?.message || e?.details || JSON.stringify(e);
    setErrorMessage(`Error: ${msj}`);
  } finally {
    setIsProcessing(false);
  }
};

  return (
    <div className={`${styles.modalOverlay} ${styles.confirmOverlay}`}>
      <div className={styles.modalCard}>
        {isProcessing ? (
          <div className={styles.processingState}>
            <Loader text="Procesando transacción..." />
          </div>
        ) : isSuccess ? (
          <div className={styles.successState}>
            <div className={styles.successIconBox}><Check size={40} /></div>
            <h3>¡Pago Registrado!</h3>
            <p>Se ha renovado el acceso de <strong>{datos.clienteNombre}</strong>.</p>
            <div className={styles.successActions}>
              <button className={styles.btnConfirm} onClick={() => window.print()}><Printer size={18} /> Imprimir</button>
              <button className={styles.btnOutline} onClick={onSuccess}>Finalizar</button>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.modalHeader}>
              <h3>Verificar Emisión</h3>
            </div>

            {/* --- Mensaje de Error dentro del Modal --- */}
            {errorMessage && (
              <div className={styles.errorAlertInner}>
                <XCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className={styles.modalBody}>
              <div className={styles.receiptLine}><span>Socio:</span><strong>{datos.clienteNombre}</strong></div>
              <div className={styles.receiptLine}><span>Monto:</span><strong className={styles.receiptTotal}>${Number(datos.montoFinal).toLocaleString()}</strong></div>
              <div className={styles.hrLine}></div>
              <div className={styles.receiptGrid}>
                <div className={styles.gridItem}><small>Canal</small><p>{datos.metodoPago}</p></div>
                <div className={styles.gridItem}><small>Fecha</small><p>{datos.fechaPago}</p></div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnOutline} onClick={onBack} disabled={isProcessing}>Revisar</button>
              <button className={styles.btnConfirm} onClick={ejecutarPago} disabled={isProcessing}>
                Confirmar Pago
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ModalConfirmacion;