import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { obtenerClientePorDocumento } from '../../../assets/services/clientesService';
import styles from '../Pagos.module.css';

const ModalNuevoPago = ({ onClose, onContinue }) => {
  const [loading, setLoading] = useState(false);
  const [nuevoPago, setNuevoPago] = useState({
    clienteId: null, clienteDocumento: "", clienteNombre: "",
    planNombre: "", periodo: "", montoFinal: "",
    fechaPago: new Date().toISOString().split("T")[0],
    metodoPago: "EFECTIVO", comprobante: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevoPago(prev => ({ ...prev, [name]: value }));
  };

  const buscarCliente = async () => {
    const dni = nuevoPago.clienteDocumento.trim();
    if (!dni) return;
    setLoading(true);
    try {
      const cliente = await obtenerClientePorDocumento(dni);
      if (cliente) {
        setNuevoPago(prev => ({
          ...prev,
          clienteId: cliente.id,
          clienteNombre: `${cliente.first_name} ${cliente.last_name}`,
          planNombre: cliente.plans?.name || "Sin Plan",
          montoFinal: cliente.plans?.price || ""
        }));
      }
    } finally { setLoading(false); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nuevoPago.clienteId && nuevoPago.montoFinal > 0) {
      onContinue(nuevoPago);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.largeModalCard}>
        <div className={styles.modalHeaderFlex}>
          <div><h3 className={styles.modalTitle}>Registrar Cobro</h3></div>
          <button className={styles.closeIconButton} onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.formSplit}>
            <div className={styles.formColumn}>
              <h4 className={styles.columnTitle}>Socio</h4>
              <div className={styles.formGroup}>
                <label>Documento</label>
                <div className={styles.inputWithAction}>
                  <input type="text" name="clienteDocumento" value={nuevoPago.clienteDocumento} onChange={handleChange} placeholder="Ej: 30123456" autoFocus />
                  <button type="button" onClick={buscarCliente} disabled={loading}>{loading ? "..." : <Search size={16}/>}</button>
                </div>
              </div>
              <div className={styles.rowTwo}>
                <div className={styles.formGroup}><label>Nombre</label><input type="text" value={nuevoPago.clienteNombre} readOnly className={styles.readOnlyInput} /></div>
                <div className={styles.formGroup}><label>Plan</label><input type="text" value={nuevoPago.planNombre} readOnly className={styles.readOnlyInput} /></div>
              </div>
            </div>
            <div className={styles.formColumn}>
              <h4 className={styles.columnTitle}>Condiciones</h4>
              <div className={styles.rowTwo}>
                <div className={styles.formGroup}><label>Monto</label><input type="number" name="montoFinal" value={nuevoPago.montoFinal} onChange={handleChange} className={styles.amountInput} /></div>
                <div className={styles.formGroup}><label>Fecha</label><input type="date" name="fechaPago" value={nuevoPago.fechaPago} onChange={handleChange} /></div>
              </div>
              <div className={styles.rowTwo}>
                <div className={styles.formGroup}><label>Medio</label>
                  <select name="metodoPago" value={nuevoPago.metodoPago} onChange={handleChange}>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="MERCADO_PAGO">Mercado Pago</option>
                  </select>
                </div>
                <div className={styles.formGroup}><label>Período</label><input type="month" name="periodo" value={nuevoPago.periodo} onChange={handleChange} /></div>
              </div>
            </div>
          </div>
          <div className={styles.formFooter}>
            <button type="button" onClick={onClose} className={styles.btnCancelText}>Cancelar</button>
            <button type="submit" className={styles.btnSubmit}>Continuar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalNuevoPago;