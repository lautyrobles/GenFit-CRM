import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { obtenerClientePorDocumento } from '../../../assets/services/clientesService';
import { useAuth } from '../../../context/AuthContext'; 
import styles from '../Pagos.module.css';

const ModalNuevoPago = ({ onClose, onContinue, socioInicial }) => {
  const { user } = useAuth(); 
  const [loading, setLoading] = useState(false);
  const [nuevoPago, setNuevoPago] = useState({
    clienteId: null,
    plan_id: null, // 👈 Agregado para cumplir con la base de datos
    clienteDocumento: "",
    clienteNombre: "",
    planNombre: "",
    periodo: new Date().toISOString().slice(0, 7),
    montoFinal: "",
    fechaPago: new Date().toISOString().split("T")[0],
    metodoPago: "EFECTIVO",
    comprobante: ""
  });

  useEffect(() => {
    if (socioInicial) {
      setNuevoPago(prev => ({
        ...prev,
        clienteId: socioInicial.id,
        plan_id: socioInicial.plan_id || socioInicial.plans?.id || null, // 👈 Capturamos el ID del plan del socio inicial
        clienteDocumento: socioInicial.dni || "",
        clienteNombre: `${socioInicial.first_name} ${socioInicial.last_name}`,
        planNombre: socioInicial.plans?.name || socioInicial.plan_name || "Plan Estándar",
        montoFinal: socioInicial.plans?.price || socioInicial.plan_price || ""
      }));
    }
  }, [socioInicial]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevoPago(prev => ({ ...prev, [name]: value }));
  };

  const buscarCliente = async () => {
    const dni = nuevoPago.clienteDocumento.trim();
    if (!dni || !user?.gym_id) return;
    
    setLoading(true);
    try {
      const cliente = await obtenerClientePorDocumento(dni, user.gym_id);
      if (cliente) {
        setNuevoPago(prev => ({
          ...prev,
          clienteId: cliente.id,
          plan_id: cliente.plan_id || cliente.plans?.id || null, // 👈 Capturamos el ID del plan al buscar por DNI
          clienteNombre: `${cliente.first_name} ${cliente.last_name}`,
          planNombre: cliente.plans?.name || "Sin Plan",
          montoFinal: cliente.plans?.price || ""
        }));
      } else {
        alert("Socio no encontrado en este gimnasio.");
      }
    } catch (error) {
      console.error(error);
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
          <div>
            <h3 className={styles.modalTitle}>Registrar Cobro</h3>
            <p className={styles.modalSubtitle}>Ingresa los detalles de la transacción.</p>
          </div>
          <button className={styles.closeIconButton} onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formSplit}>
            <div className={styles.formColumn}>
              <h4 className={styles.columnTitle}>Información del Socio</h4>
              
              <div className={styles.formGroup}>
                <label>Documento / DNI</label>
                <div className={styles.inputWithAction}>
                  <input 
                    type="text" 
                    name="clienteDocumento" 
                    value={nuevoPago.clienteDocumento} 
                    onChange={handleChange} 
                    placeholder="Ej: 30123456" 
                    autoFocus 
                  />
                  <button type="button" onClick={buscarCliente} disabled={loading}>
                    {loading ? "..." : <Search size={16}/>}
                  </button>
                </div>
              </div>

              <div className={styles.rowTwo}>
                <div className={styles.formGroup}>
                  <label>Nombre Completo</label>
                  <input type="text" value={nuevoPago.clienteNombre} readOnly className={styles.readOnlyInput} placeholder="Socio no identificado" />
                </div>
                <div className={styles.formGroup}>
                  <label>Plan Actual</label>
                  <input type="text" value={nuevoPago.planNombre} readOnly className={styles.readOnlyInput} placeholder="-" />
                </div>
              </div>
            </div>

            <div className={styles.formColumn}>
              <h4 className={styles.columnTitle}>Detalles del Pago</h4>
              
              <div className={styles.rowTwo}>
                <div className={styles.formGroup}>
                  <label>Monto a Cobrar</label>
                  <input 
                    type="number" 
                    name="montoFinal" 
                    value={nuevoPago.montoFinal} 
                    onChange={handleChange} 
                    className={styles.amountInput} 
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Fecha de Cobro</label>
                  <input 
                    type="date" 
                    name="fechaPago" 
                    value={nuevoPago.fechaPago} 
                    onChange={handleChange} 
                    required
                  />
                </div>
              </div>

              <div className={styles.rowTwo}>
                <div className={styles.formGroup}>
                  <label>Medio de Pago</label>
                  <select name="metodoPago" value={nuevoPago.metodoPago} onChange={handleChange}>
                    <option value="EFECTIVO">💵 Efectivo</option>
                    <option value="TRANSFERENCIA">🏦 Transferencia</option>
                    <option value="MERCADO_PAGO">🔵 Mercado Pago</option>
                    <option value="DEBITO">💳 Débito / Crédito</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Período (Mes)</label>
                  <input 
                    type="month" 
                    name="periodo" 
                    value={nuevoPago.periodo} 
                    onChange={handleChange} 
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.formFooter}>
            <button type="button" onClick={onClose} className={styles.btnCancelText}>Cancelar</button>
            <button 
              type="submit" 
              className={styles.btnSubmit} 
              disabled={!nuevoPago.clienteId || !nuevoPago.montoFinal}
            >
              Continuar a Confirmación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalNuevoPago;