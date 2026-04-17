import React, { useState, useEffect } from 'react';
import { supabase } from '../../assets/services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  abrirCaja,
  obtenerBalanceDelDia,
  registrarCierre,
  obtenerSesionActiva,
  obtenerHistorialCierres
} from '../../assets/services/cajaService';
import Loader from '../../Components/Loader/Loader';

import {
  Archive, DollarSign, Lock, Unlock, Clock,
  TrendingUp, ShoppingCart, CreditCard, Banknote,
  QrCode, AlertTriangle, CheckCircle, ChevronDown,
  ChevronUp, Calendar, X, Receipt, User
} from 'lucide-react';
import styles from './CierreCaja.module.css';

/* ─── Helpers ─── */
const formatARS = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v || 0);

const fmtDatetime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const diffMinutes = (a, b) => {
  if (!a || !b) return 0;
  return Math.round((new Date(b) - new Date(a)) / 60000);
};

const fmtDuration = (mins) => {
  if (mins <= 0) return '0 min';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
};

const CierreCaja = () => {
  const { user } = useAuth();

  // role normalizado
  const role = (user?.role || '').toUpperCase().replace('ROLE_', '');
  const isAdmin = ['SUPER_ADMIN', 'SUPERADMINISTRADOR', 'ADMIN', 'ADMINISTRADOR'].includes(role);

  const [sesionActiva, setSesionActiva] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ventas, setVentas] = useState([]);
  const [loadingVentas, setLoadingVentas] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [feedback, setFeedback] = useState({ msg: '', type: '' });

  /* modales */
  const [modalApertura, setModalApertura] = useState(false);
  const [modalCierre, setModalCierre] = useState(false);
  const [montoApertura, setMontoApertura] = useState('');
  const [montoCierre, setMontoCierre] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { cargarDatos(); }, []);

  const showToast = (msg, type) => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback({ msg: '', type: '' }), 4000);
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // 1. Sesión activa del operador ACTUAL
      const sesion = await obtenerSesionActiva(user.id);
      setSesionActiva(sesion);

      if (sesion) {
        await cargarVentasSesion(sesion.abierta_en);
      } else {
        setVentas([]);
      }

      // 2. Historial de cierres (filtrado por rol)
      const hist = await obtenerHistorialCierres(user.id, role, user.gym_id);
      setHistorial(hist);

    } catch (err) {
      console.error(err);
      showToast('Error al cargar datos de caja', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cargarVentasSesion = async (abiertaEn) => {
    setLoadingVentas(true);
    try {
      const { data } = await supabase
        .from('payments')
        .select('id, amount, payment_method, created_at, users(first_name, last_name)')
        .gte('created_at', abiertaEn)
        .order('created_at', { ascending: false });

      const ventasFormateadas = (data || []).map(p => ({
        id: p.id,
        total: p.amount,
        metodo_pago: p.payment_method,
        creado_en: p.created_at,
        cliente: `${p.users?.first_name || ''} ${p.users?.last_name || ''}`.trim() || 'Cliente'
      }));

      setVentas(ventasFormateadas);
    } catch {
      setVentas([]);
    } finally {
      setLoadingVentas(false);
    }
  };

  /* métricas */
  const totalVentas = ventas.reduce((s, v) => s + Number(v.total), 0);
  const cantVentas = ventas.length;
  const ticketPromedio = cantVentas > 0 ? totalVentas / cantVentas : 0;

  const ventasPorMetodo = ventas.reduce((acc, v) => {
    acc[v.metodo_pago] = (acc[v.metodo_pago] || 0) + Number(v.total);
    return acc;
  }, {});

  const metodoIcono = (m) => {
    if (!m) return <DollarSign size={14} />;
    const ml = m.toLowerCase();
    if (ml.includes('efectivo')) return <Banknote size={14} />;
    if (ml.includes('tarjeta')) return <CreditCard size={14} />;
    return <QrCode size={14} />;
  };

  /* apertura */
  const handleAbrirCaja = async () => {
    if (!montoApertura || parseFloat(montoApertura) < 0) {
      showToast('Ingresá el monto inicial de caja', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await abrirCaja(parseFloat(montoApertura), user.id, user.gym_id);
      if (!res.success) throw new Error(res.error);

      showToast('Caja abierta correctamente', 'success');
      setModalApertura(false);
      setMontoApertura('');
      await cargarDatos();
    } catch (err) {
      showToast(err.message || 'Error al abrir caja', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* cierre */
  const handleCerrarCaja = async () => {
    if (!montoCierre && montoCierre !== '0') {
      showToast('Ingresá el monto en caja al cierre', 'error');
      return;
    }
    setSaving(true);
    try {
      const resBalance = await obtenerBalanceDelDia(sesionActiva.abierta_en);
      const esperadoFisico = (sesionActiva.monto_inicial || 0) + resBalance.totalEsperado;

      const res = await registrarCierre(
        parseFloat(montoCierre),
        esperadoFisico,
        user.id,
        user.gym_id
      );

      if (!res.success) throw new Error(res.error);

      showToast('Caja cerrada correctamente', 'success');
      setModalCierre(false);
      setMontoCierre('');
      setSesionActiva(null);
      setVentas([]);
      await cargarDatos();
    } catch (err) {
      showToast(err.message || 'Error al cerrar caja', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !sesionActiva) {
    return <Loader text="Sincronizando estado de caja..." />;
  }

  return (
    <div className={styles.cajaContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Caja Diaria</h1>
          <p className={styles.subtitle}>
            {isAdmin
              ? 'Apertura, cierre y arqueo de sesiones. Historial de todos los operadores.'
              : `Turno de ${user?.first_name || 'Operador'} — apertura y cierre de tu sesión.`}
          </p>
        </div>

        {sesionActiva ? (
          <button
            className={`${styles.btnCaja} ${styles.btnCerrar}`}
            onClick={() => setModalCierre(true)}
          >
            <Lock size={18} /> Cerrar Caja
          </button>
        ) : (
          <button
            className={`${styles.btnCaja} ${styles.btnAbrir}`}
            onClick={() => setModalApertura(true)}
          >
            <Unlock size={18} /> Abrir Caja
          </button>
        )}
      </header>

      {/* feedback */}
      {feedback.msg && (
        <div className={`${styles.alert} ${styles[feedback.type]}`}>
          {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {feedback.msg}
        </div>
      )}

      {sesionActiva ? (
        <>
          {/* Banner activo */}
          <div className={styles.bannerActivo}>
            <div className={styles.bannerLeft}>
              <div className={styles.dotActivo} />
              <div>
                <span className={styles.bannerLabel}>Caja abierta</span>
                <span className={styles.bannerSub}>
                  Desde {fmtDatetime(sesionActiva.abierta_en)}
                  {' · '}
                  Operador: {user?.first_name} {user?.last_name}
                </span>
              </div>
            </div>
            <div className={styles.bannerRight}>
              <Clock size={14} />
              <span>{fmtDuration(diffMinutes(sesionActiva.abierta_en, new Date().toISOString()))}</span>
            </div>
          </div>

          {/* Métricas */}
          <div className={styles.statsGrid}>
            <div className={`${styles.statCard} ${styles.gradGreen}`}>
              <div className={styles.statIcon}><TrendingUp size={22} /></div>
              <div>
                <span className={styles.statLabel}>Ingresos del turno</span>
                <p className={styles.statValue}>{formatARS(totalVentas)}</p>
              </div>
            </div>
            <div className={`${styles.statCard} ${styles.gradBlue}`}>
              <div className={styles.statIcon}><ShoppingCart size={22} /></div>
              <div>
                <span className={styles.statLabel}>Operaciones</span>
                <p className={styles.statValue}>{cantVentas}</p>
              </div>
            </div>
            <div className={`${styles.statCard} ${styles.gradPurple}`}>
              <div className={styles.statIcon}><DollarSign size={22} /></div>
              <div>
                <span className={styles.statLabel}>Ticket promedio</span>
                <p className={styles.statValue}>{formatARS(ticketPromedio)}</p>
              </div>
            </div>
            <div className={`${styles.statCard} ${styles.gradSlate}`}>
              <div className={styles.statIcon}><Archive size={22} /></div>
              <div>
                <span className={styles.statLabel}>Fondo inicial</span>
                <p className={styles.statValue}>{formatARS(sesionActiva.monto_inicial)}</p>
              </div>
            </div>
          </div>

          {/* Desglose por método */}
          {Object.keys(ventasPorMetodo).length > 0 && (
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}><CreditCard size={18} /> Ventas por método de pago</h3>
              <div className={styles.metodosGrid}>
                {Object.entries(ventasPorMetodo).map(([metodo, monto]) => (
                  <div key={metodo} className={styles.metodoCard}>
                    <div className={styles.metodoIcon}>{metodoIcono(metodo)}</div>
                    <div>
                      <span className={styles.metodoLabel}>{metodo}</span>
                      <strong className={styles.metodoMonto}>{formatARS(monto)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transacciones del turno */}
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}><Receipt size={18} /> Transacciones del turno</h3>
            {loadingVentas ? (
              <div className={styles.loadingVentas}>
                <div className={styles.skeletonRow} />
                <div className={styles.skeletonRow} />
                <div className={styles.skeletonRow} />
              </div>
            ) : ventas.length === 0 ? (
              <div className={styles.emptyState}>Sin ventas en este turno aún.</div>
            ) : (
              <div className={styles.ventasList}>
                {ventas.map(v => (
                  <div key={v.id} className={styles.ventaRow}>
                    <div className={styles.ventaInfo}>
                      <span className={styles.ventaTotal}>{formatARS(v.total)}</span>
                      <span className={styles.ventaMeta}>
                        Socio: {v.cliente} · Método: {v.metodo_pago}
                      </span>
                    </div>
                    <span className={styles.ventaHora}>
                      {new Date(v.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className={styles.cajaCerradaBanner}>
          <div className={styles.cajaCerradaIcon}><Lock size={36} strokeWidth={1.5} /></div>
          <p className={styles.cajaCerradaTxt}>
            La caja está cerrada. Abrí una sesión para comenzar a operar.
          </p>
        </div>
      )}

      {/* Historial */}
      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>
          <Calendar size={18} />
          {isAdmin ? ' Historial de Arqueos (todos los operadores)' : ' Mis Arqueos'}
        </h3>
        {historial.length === 0 ? (
          <div className={styles.emptyState}>No hay sesiones cerradas aún.</div>
        ) : (
          <div className={styles.historialList}>
            {historial.map(s => {
              const duracion = diffMinutes(s.abierta_en, s.cerrada_en);
              const dif = s.diferencia;
              const isOpen = expandedRow === s.id;

              return (
                <div key={s.id} className={styles.historialCard}>
                  <div
                    className={styles.historialRow}
                    onClick={() => setExpandedRow(isOpen ? null : s.id)}
                  >
                    <div className={styles.historialLeft}>
                      <CheckCircle
                        size={16}
                        color={dif === 0 ? '#10b981' : dif > 0 ? '#3b82f6' : '#ef4444'}
                      />
                      <div>
                        <span className={styles.historialFecha}>{fmtDatetime(s.abierta_en)}</span>
                        <span className={styles.historialDuracion}>
                          {fmtDuration(duracion)} · {s.operador}
                        </span>
                      </div>
                    </div>
                    <div className={styles.historialRight}>
                      <span className={styles.historialMonto}>{formatARS(s.monto_final)}</span>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {isOpen && (
                    <div className={styles.historialDetail}>
                      {isAdmin && (
                        <div className={styles.historialDetailRow}>
                          <span>Operador</span>
                          <strong>{s.operador}</strong>
                        </div>
                      )}
                      <div className={styles.historialDetailRow}>
                        <span>Fondo inicial</span>
                        <strong>{formatARS(s.monto_inicial)}</strong>
                      </div>
                      <div className={styles.historialDetailRow}>
                        <span>Monto esperado (sistema)</span>
                        <strong>{formatARS(s.monto_esperado)}</strong>
                      </div>
                      <div className={styles.historialDetailRow}>
                        <span>Monto declarado (físico)</span>
                        <strong>{formatARS(s.monto_final)}</strong>
                      </div>
                      <div className={`${styles.historialDetailRow} ${dif === 0 ? '' : dif > 0 ? styles.difPos : styles.difNeg}`}>
                        <span>Diferencia de arqueo</span>
                        <strong>{dif > 0 ? '+' : ''}{formatARS(dif)}</strong>
                      </div>
                      <div className={styles.historialDetailRow}>
                        <span>Apertura</span>
                        <strong>{fmtDatetime(s.abierta_en)}</strong>
                      </div>
                      <div className={styles.historialDetailRow}>
                        <span>Cierre</span>
                        <strong>{fmtDatetime(s.cerrada_en)}</strong>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal apertura */}
      {modalApertura && (
        <div className={styles.overlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Abrir Caja</h3>
              <button className={styles.closeBtn} onClick={() => setModalApertura(false)}>
                <X size={20} />
              </button>
            </div>
            <p className={styles.modalSub}>
              Ingresá el monto inicial con el que arranca tu turno.
            </p>
            <div className={styles.operadorInfo}>
              <User size={14} />
              <span>Operador: {user?.first_name} {user?.last_name}</span>
            </div>
            <div className={styles.formGroup}>
              <label>Monto inicial en caja ($)</label>
              <div className={styles.inputWrap}>
                <DollarSign size={16} color="#94a3b8" />
                <input
                  type="number"
                  placeholder="0.00"
                  value={montoApertura}
                  onChange={e => setMontoApertura(e.target.value)}
                  min={0}
                  className={styles.montoInput}
                  autoFocus
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setModalApertura(false)}>
                Cancelar
              </button>
              <button
                className={styles.btnConfirmGreen}
                onClick={handleAbrirCaja}
                disabled={saving}
              >
                {saving ? 'Abriendo...' : <><Unlock size={16} /> Abrir Caja</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cierre */}
      {modalCierre && sesionActiva && (
        <div className={styles.overlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Cerrar Caja</h3>
              <button className={styles.closeBtn} onClick={() => setModalCierre(false)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.cierreResumen}>
              <div className={styles.cierreItem}>
                <span>Fondo inicial</span>
                <strong>{formatARS(sesionActiva.monto_inicial)}</strong>
              </div>
              <div className={styles.cierreItem}>
                <span>Operaciones del turno</span>
                <strong>{cantVentas}</strong>
              </div>
              <div className={styles.cierreItem}>
                <span>Total cobrado</span>
                <strong>{formatARS(totalVentas)}</strong>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Dinero físico contado en la registradora ($)</label>
              <div className={styles.inputWrap}>
                <DollarSign size={16} color="#94a3b8" />
                <input
                  type="number"
                  placeholder="0.00"
                  value={montoCierre}
                  onChange={e => setMontoCierre(e.target.value)}
                  min={0}
                  className={styles.montoInput}
                  autoFocus
                />
              </div>
              <p className={styles.diferencia}>
                El sistema calculará la diferencia automáticamente.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setModalCierre(false)}>
                Cancelar
              </button>
              <button
                className={styles.btnConfirmRed}
                onClick={handleCerrarCaja}
                disabled={saving}
              >
                {saving ? 'Procesando...' : <><Lock size={16} /> Confirmar Cierre</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CierreCaja;