import React, { useState, useEffect } from 'react';
import styles from '../Pagos.module.css';
import { supabase } from '../../../assets/services/supabaseClient';
import { X, Search } from 'lucide-react';

/**
 * ModalNuevoPago
 *
 * Props:
 *   onClose()              — cerrar el modal
 *   onContinue(datos)      — pasar al modal de confirmación con los datos
 *   socioInicial           — objeto cliente pre-seleccionado (viene de /clientes)
 */
const ModalNuevoPago = ({ onClose, onContinue, socioInicial = null }) => {
  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(socioInicial || null);
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);

  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');

  // Cuando llega un socio pre-seleccionado, auto-completar el monto con el precio del plan
  useEffect(() => {
    if (socioInicial) {
      setClienteSeleccionado(socioInicial);
      // Si el cliente tiene plan con precio, pre-cargar el monto
      const precioPlan = socioInicial?.plans?.price || null;
      if (precioPlan) {
        setMonto(String(precioPlan));
      }
    }
  }, [socioInicial]);

  // Cuando se selecciona un cliente desde la búsqueda, cargar el precio de su plan
  const seleccionarCliente = async (cliente) => {
    setClienteSeleccionado(cliente);
    setResultadosBusqueda([]);
    setBusqueda('');

    // Si el cliente no trae el plan con precio, buscarlo
    if (cliente.plans?.price) {
      setMonto(String(cliente.plans.price));
    } else if (cliente.plan_id) {
      const { data: plan } = await supabase
        .from('plans')
        .select('price')
        .eq('id', cliente.plan_id)
        .single();
      if (plan?.price) setMonto(String(plan.price));
    }
  };

  const handleBuscar = async (termino) => {
    setBusqueda(termino);
    if (!termino || termino.length < 2) {
      setResultadosBusqueda([]);
      return;
    }
    setBuscando(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, dni, email, plan_id, plans(id, name, price)')
        .eq('role', 'CLIENT')
        .or(`first_name.ilike.%${termino}%,last_name.ilike.%${termino}%,dni.ilike.%${termino}%`)
        .limit(6);
      setResultadosBusqueda(data || []);
    } catch {
      setResultadosBusqueda([]);
    } finally {
      setBuscando(false);
    }
  };

  const handleContinuar = () => {
    if (!clienteSeleccionado) {
      setError('Seleccioná un cliente.');
      return;
    }
    if (!monto || parseFloat(monto) <= 0) {
      setError('Ingresá un monto válido.');
      return;
    }
    if (!metodoPago) {
      setError('Seleccioná un método de pago.');
      return;
    }

    setError('');
    onContinue({
      clienteId: clienteSeleccionado.id,
      clienteNombre: `${clienteSeleccionado.first_name} ${clienteSeleccionado.last_name}`,
      clienteDni: clienteSeleccionado.dni,
      planNombre: clienteSeleccionado.plans?.name || 'Sin plan',
      plan_id: clienteSeleccionado.plan_id || clienteSeleccionado.plans?.id || null,
      montoFinal: parseFloat(monto),
      metodoPago,
      fechaPago: new Date(fechaPago + 'T12:00:00').toISOString(),
      notes: notas || null,
      gym_id: clienteSeleccionado.gym_id || null
    });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.largeModalCard}>
        {/* Header */}
        <div className={styles.modalHeaderFlex}>
          <div>
            <h3 className={styles.modalTitle}>Registrar Cobro</h3>
            <p className={styles.modalSubtitle}>
              Completá los datos para registrar el pago de membresía.
            </p>
          </div>
          <button className={styles.closeIconButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.formSplit}>
          {/* ─── Columna izquierda: cliente ─── */}
          <div>
            <h4 className={styles.columnTitle}>Datos del Socio</h4>

            {!clienteSeleccionado ? (
              <div className={styles.formGroup}>
                <label>Buscar por nombre o DNI</label>
                <div style={{ position: 'relative' }}>
                  <div className={styles.inputWithAction}>
                    <input
                      type="text"
                      placeholder="Escribí el nombre o DNI..."
                      value={busqueda}
                      onChange={e => handleBuscar(e.target.value)}
                      autoFocus
                    />
                    <button type="button" disabled>
                      <Search size={16} />
                    </button>
                  </div>

                  {resultadosBusqueda.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      zIndex: 100,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      overflow: 'hidden',
                      marginTop: '4px'
                    }}>
                      {resultadosBusqueda.map(c => (
                        <div
                          key={c.id}
                          onClick={() => seleccionarCliente(c)}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        >
                          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>
                            {c.first_name} {c.last_name}
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                            DNI: {c.dni} · {c.plans?.name || 'Sin plan'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {buscando && (
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px' }}>
                      Buscando...
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                {/* Card del cliente seleccionado */}
                <div style={{
                  background: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  borderRadius: '14px',
                  padding: '16px',
                  marginBottom: '16px',
                  position: 'relative'
                }}>
                  <button
                    type="button"
                    onClick={() => { setClienteSeleccionado(null); setMonto(''); }}
                    style={{
                      position: 'absolute', top: '10px', right: '10px',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: '#94a3b8', display: 'flex'
                    }}
                    title="Cambiar cliente"
                  >
                    <X size={16} />
                  </button>
                  <div style={{ fontWeight: 800, color: '#7c3aed', fontSize: '1.05rem' }}>
                    {clienteSeleccionado.first_name} {clienteSeleccionado.last_name}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>
                    DNI: {clienteSeleccionado.dni}
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <span style={{
                      background: '#ede9fe', color: '#6d28d9',
                      padding: '4px 10px', borderRadius: '8px',
                      fontSize: '0.75rem', fontWeight: 700
                    }}>
                      {clienteSeleccionado.plans?.name || 'Sin plan'}
                      {clienteSeleccionado.plans?.price
                        ? ` — $${Number(clienteSeleccionado.plans.price).toLocaleString()}`
                        : ''}
                    </span>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Email</label>
                  <input
                    type="text"
                    value={clienteSeleccionado.email || '—'}
                    readOnly
                    className={styles.readOnlyInput}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ─── Columna derecha: datos del pago ─── */}
          <div>
            <h4 className={styles.columnTitle}>Datos del Pago</h4>

            <div className={styles.formGroup}>
              <label>Monto a Cobrar ($)</label>
              <input
                type="number"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                placeholder="0.00"
                min="0"
                className={styles.amountInput}
              />
              {clienteSeleccionado?.plans?.price && (
                <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>
                  Precio del plan: ${Number(clienteSeleccionado.plans.price).toLocaleString()}
                </small>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Método de Pago</label>
              <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="TARJETA_DEBITO">Tarjeta Débito</option>
                <option value="TARJETA_CREDITO">Tarjeta Crédito</option>
                <option value="MERCADOPAGO">Mercado Pago</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Fecha de Pago</label>
              <input
                type="date"
                value={fechaPago}
                onChange={e => setFechaPago(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Notas (opcional)</label>
              <input
                type="text"
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Ej: Descuento estudiante..."
              />
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
            padding: '12px 16px', borderRadius: '12px', marginTop: '8px',
            fontSize: '0.85rem', fontWeight: 600
          }}>
            {error}
          </div>
        )}

        <div className={styles.formFooter}>
          <button type="button" className={styles.btnCancelText} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={styles.btnSubmit} onClick={handleContinuar}>
            Continuar →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalNuevoPago;