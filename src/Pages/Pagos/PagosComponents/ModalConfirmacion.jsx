import React, { useState } from 'react';
import { Check, Printer } from 'lucide-react';
import Loader from '../../../Components/Loader/Loader';
import { supabase } from '../../../assets/services/supabaseClient';
import { registrarPago } from '../../../assets/services/paymentsService';
import { actualizarCliente } from '../../../assets/services/clientesService';
import { registrarMovimiento } from '../../../assets/services/movimientosService';
import styles from '../Pagos.module.css';

const ModalConfirmacion = ({ datos, onBack, onSuccess, user }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const ejecutarPago = async () => {
    setIsProcessing(true);
    try {
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

      await registrarPago({
        user_id: datos.clienteId, amount: Number(datos.montoFinal),
        payment_date: datos.fechaPago, payment_method: datos.metodoPago,
        status: 'COMPLETED', notes: `Periodo: ${datos.periodo}`
      });

      const { error: subError } = await supabase
        .from('subscriptions').update({ 
          due_date: fechaVencimiento.toISOString().split('T')[0],
          active: true, amount_paid: Number(datos.montoFinal)
        }).eq('user_id', datos.clienteId);

      if (subError) throw subError;
      await actualizarCliente(datos.clienteId, { enabled: true });

      if (user?.id) {
        await registrarMovimiento(user.id, "Pagos", "COBRO", `Cobro a ${datos.clienteNombre}`);
      }

      setIsSuccess(true);
    } catch (e) {
      console.error(e);
      alert("Error al procesar el pago.");
      onBack();
    } finally { setIsProcessing(false); }
  };

  return (
    <div className={`${styles.modalOverlay} ${styles.confirmOverlay}`}>
      <div className={styles.modalCard}>
        {isProcessing ? (
          <div className={styles.processingState}><Loader text="Sincronizando..." /></div>
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
            <div className={styles.modalHeader}><h3>Verificar Emisión</h3></div>
            <div className={styles.modalBody}>
              <div className={styles.receiptLine}><span>Socio:</span><strong>{datos.clienteNombre}</strong></div>
              <div className={styles.receiptLine}><span>Monto:</span><strong className={styles.receiptTotal}>${datos.montoFinal}</strong></div>
              <div className={styles.hrLine}></div>
              <div className={styles.receiptGrid}>
                <div className={styles.gridItem}><small>Canal</small><p>{datos.metodoPago}</p></div>
                <div className={styles.gridItem}><small>Fecha</small><p>{datos.fechaPago}</p></div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnOutline} onClick={onBack}>Revisar</button>
              <button className={styles.btnConfirm} onClick={ejecutarPago}>Confirmar Pago</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ModalConfirmacion;