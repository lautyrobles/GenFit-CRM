import React, { useState } from 'react';
import styles from '../Pagos.module.css';
import { registrarPago } from '../../../assets/services/paymentsService';
import { registrarMovimiento } from '../../../assets/services/movimientosService';
import { CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';

/**
 * ModalConfirmacion
 *
 * Props:
 *   datos     — objeto con todos los datos del pago (viene de ModalNuevoPago)
 *   user      — usuario logueado (staff)
 *   onBack()  — volver al formulario
 *   onSuccess() — pago exitoso, cerrar y recargar
 */
const ModalConfirmacion = ({ datos, user, onBack, onSuccess }) => {
  const [estado, setEstado] = useState('CONFIRM'); // CONFIRM | PROCESSING | SUCCESS

  const handleConfirmar = async () => {
    setEstado('PROCESSING');
    try {
      await registrarPago({
        clienteId: datos.clienteId,
        montoFinal: datos.montoFinal,
        metodoPago: datos.metodoPago,
        fechaPago: datos.fechaPago,
        plan_id: datos.plan_id,
        notes: datos.notes,
        gym_id: datos.gym_id
      });

      await registrarMovimiento(
        user.id,
        'Pagos',
        'CREACIÓN',
        `Pago registrado para ${datos.clienteNombre} — $${datos.montoFinal} (${datos.metodoPago})`
      );

      setEstado('SUCCESS');
    } catch (err) {
      console.error('Error confirmando pago:', err);
      setEstado('CONFIRM'); // Volver al estado de confirmación para que puedan reintentar
    }
  };

  return (
    <div className={`${styles.modalOverlay} ${styles.confirmOverlay}`}>
      <div className={styles.modalCard}>

        {estado === 'CONFIRM' && (
          <>
            <div className={styles.modalHeader}>
              <h3>Confirmar Pago</h3>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.receiptLine}>
                <span className={styles.receiptLabel}>Socio</span>
                <span className={styles.receiptValue}>{datos.clienteNombre}</span>
              </div>
              <div className={styles.receiptLine}>
                <span className={styles.receiptLabel}>DNI</span>
                <span className={styles.receiptValue}>{datos.clienteDni}</span>
              </div>
              <div className={styles.receiptLine}>
                <span className={styles.receiptLabel}>Plan</span>
                <span className={styles.receiptValue}>{datos.planNombre}</span>
              </div>
              <hr className={styles.hrLine} />
              <div className={styles.receiptLine}>
                <span className={styles.receiptLabel}>Total</span>
                <span className={styles.receiptTotal}>
                  ${Number(datos.montoFinal).toLocaleString()}
                </span>
              </div>
              <hr className={styles.hrLine} />
              <div className={styles.receiptGrid}>
                <div className={styles.gridItem}>
                  <small>Método</small>
                  <p>{datos.metodoPago}</p>
                </div>
                <div className={styles.gridItem}>
                  <small>Fecha</small>
                  <p>{new Date(datos.fechaPago).toLocaleDateString('es-AR')}</p>
                </div>
                <div className={styles.gridItem}>
                  <small>Estado</small>
                  <p style={{ color: '#10b981' }}>COMPLETADO</p>
                </div>
              </div>
              {datos.notes && (
                <div style={{ marginTop: '12px', fontSize: '0.82rem', color: '#64748b' }}>
                  Nota: {datos.notes}
                </div>
              )}
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnOutline} onClick={onBack}>
                <ArrowLeft size={16} /> Volver
              </button>
              <button className={styles.btnConfirm} onClick={handleConfirmar}>
                Confirmar Pago
              </button>
            </div>
          </>
        )}

        {estado === 'PROCESSING' && (
          <div className={styles.processingState}>
            <Loader2
              size={48}
              style={{ color: '#7c3aed', animation: 'spin 1s linear infinite' }}
            />
            <p style={{ marginTop: '16px', color: '#64748b', fontWeight: 600 }}>
              Procesando pago...
            </p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {estado === 'SUCCESS' && (
          <div className={styles.successState}>
            <div className={styles.successIconBox}>
              <CheckCircle size={40} />
            </div>
            <h3>¡Pago Registrado!</h3>
            <p>
              Se registró el pago de <strong>${Number(datos.montoFinal).toLocaleString()}</strong> para{' '}
              <strong>{datos.clienteNombre}</strong>.
              <br />
              La membresía fue renovada por 30 días.
            </p>
            <div className={styles.successActions}>
              <button className={styles.btnConfirm} onClick={onSuccess}>
                Aceptar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalConfirmacion;