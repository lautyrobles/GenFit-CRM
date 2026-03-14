import React, { useEffect, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from '../../assets/services/supabaseClient'; 
import { useAuth } from '../../context/AuthContext';
import styles from './AccessNotifier.module.css';

import { FiEye, FiUser, FiActivity, FiAlertTriangle, FiHash, FiCheckCircle, FiCreditCard } from 'react-icons/fi';

const AccessNotifier = () => {
  const { user } = useAuth();
  
  const [modalData, setModalData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const abrirDetalleUsuario = async (userId, estadoCalculado) => {
    setLoadingData(true);
    setIsModalOpen(true);
    
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name, dni')
        .eq('id', userId)
        .single();

      const { data: alertsData } = await supabase
        .from('medical_alerts')
        .select('name, observation, severity')
        .eq('user_id', userId);

      const haceUnaSemana = new Date();
      haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);

      const { count } = await supabase
        .from('access_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('check_in_time', haceUnaSemana.toISOString());

      // Usamos el estado que ya calculamos para la notificación
      setModalData({
        user: userData || {},
        alertas: alertsData || [],
        asistenciasSemanales: count || 0,
        ...estadoCalculado // Trae estadoCuota, badgeClass y diasRestantes
      });

    } catch (error) {
      console.error("Error cargando detalle de usuario:", error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const canalAsistencias = supabase
      .channel('ingresos_tiempo_real')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'access_logs' },
        async (payload) => {
          const nuevoIngreso = payload.new;

          // 1. Buscamos al usuario
          const { data: userData } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', nuevoIngreso.user_id)
            .single();

          const nombreCliente = userData ? `${userData.first_name} ${userData.last_name}` : 'Un cliente';

          // 👉 2. BUSCAMOS LA SUSCRIPCIÓN PARA LA NOTIFICACIÓN
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('due_date')
            .eq('user_id', nuevoIngreso.user_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          let estadoCuota = 'SIN PLAN';
          let diasRestantes = 0;
          let badgeClass = styles.statusInactive;
          let mensajeCuota = 'No tiene un plan registrado.';
          
          // Por defecto, si el QR entró bien en la app, es válido. Pero lo podemos sobreescribir si está muy vencido.
          let accesoValido = nuevoIngreso.access_granted !== false; 

          if (subData && subData.due_date) {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const vencimiento = new Date(subData.due_date);
            vencimiento.setHours(0, 0, 0, 0);

            const diffTime = vencimiento.getTime() - hoy.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
            diasRestantes = diffDays;

            if (diffDays >= 0) {
              estadoCuota = 'ACTIVO';
              badgeClass = styles.statusActive;
              mensajeCuota = `Le quedan ${diffDays} días de cuota.`;
            } else if (diffDays >= -5) {
              estadoCuota = 'RETRASO';
              badgeClass = styles.statusWarning;
              mensajeCuota = `Cuota atrasada por ${Math.abs(diffDays)} días.`;
              accesoValido = true; // Sigue entrando porque está en los 5 días de gracia
            } else {
              estadoCuota = 'NO ACTIVO';
              badgeClass = styles.statusInactive;
              mensajeCuota = `Cuota vencida hace ${Math.abs(diffDays)} días.`;
              accesoValido = false; // Se le bloquea el acceso en la notificación visual
            }
          }

          // Guardamos el cálculo para pasárselo al Modal del "ojo" y no calcularlo 2 veces
          const estadoCalculado = { estadoCuota, badgeClass, diasRestantes };

          // 👉 3. DISPARAMOS EL TOAST CON LOS DÍAS RESTANTES
          toast.custom((t) => (
            <div className={`${styles.toastWrapper} ${t.visible ? styles.visible : styles.hidden} ${accesoValido ? styles.borderSuccess : styles.borderError}`}>
              <div className={`${styles.iconContainer} ${accesoValido ? styles.iconSuccess : styles.iconError}`}>
                {accesoValido ? '🙌' : '⛔'}
              </div>
              
              <div className={styles.textContainer}>
                <span className={styles.title}>
                  {accesoValido ? 'Ingreso Registrado' : 'Acceso Denegado'}
                </span>
                <span className={styles.subtitle}>
                  <strong className={styles.name}>{nombreCliente}</strong>
                  <br/>
                  {/* Acá mostramos el estado de la cuota en el pop-up chiquito */}
                  <span style={{ 
                    color: estadoCuota === 'ACTIVO' ? '#059669' : (estadoCuota === 'RETRASO' ? '#d97706' : '#dc2626'),
                    fontWeight: '600',
                    fontSize: '0.85rem'
                  }}>
                    {mensajeCuota}
                  </span>
                </span>
              </div>
              
              <button 
                className={styles.btnEye} 
                onClick={() => {
                  toast.dismiss(t.id);
                  abrirDetalleUsuario(nuevoIngreso.user_id, estadoCalculado);
                }}
                title="Ver detalle del cliente"
              >
                <FiEye size={22} />
              </button>
            </div>
          ), { position: 'top-right', duration: 6000 });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(canalAsistencias);
  }, [user]);

  return (
    <>
      <Toaster />
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <FiUser color="#3b82f6" /> Ficha de Ingreso
              </h3>
              <button className={styles.modalCloseBtn} onClick={() => { setIsModalOpen(false); setModalData(null); }}>×</button>
            </div>

            <div className={styles.modalBody}>
              {loadingData || !modalData ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Cargando datos del cliente...</div>
              ) : (
                <>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}><FiUser /> Nombre Completo</span>
                    <span className={styles.infoValue}>{modalData.user.first_name} {modalData.user.last_name}</span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}><FiHash /> DNI</span>
                    <span className={styles.infoValue}>{modalData.user.dni || 'No registrado'}</span>
                  </div>

                  {/* ESTADO DE LA CUOTA */}
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}><FiCreditCard /> Estado de Cuota</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`${styles.badgeStatus} ${modalData.badgeClass}`}>
                        {modalData.estadoCuota}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>
                        {modalData.diasRestantes >= 0 
                          ? `(Quedan ${modalData.diasRestantes} días)` 
                          : `(Hace ${Math.abs(modalData.diasRestantes)} días)`}
                      </span>
                    </div>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}><FiActivity /> Asistencia (Últ. 7 días)</span>
                    <span className={styles.infoValue}>{modalData.asistenciasSemanales} días</span>
                  </div>

                  <div className={styles.alertsSection}>
                    <h4 className={styles.alertsTitle}>
                      <FiAlertTriangle color="#d97706" /> Alertas Médicas
                    </h4>
                    {modalData.alertas.length === 0 ? (
                      <div className={styles.noAlerts}>
                        <FiCheckCircle size={20} />
                        <span>El usuario no presenta alertas médicas.</span>
                      </div>
                    ) : (
                      modalData.alertas.map((alerta, index) => {
                        const esAlta = alerta.severity === 'Alta' || alerta.severity === 'high';
                        return (
                          <div key={index} className={`${styles.alertBox} ${esAlta ? styles.alertBoxHigh : ''}`}>
                            <FiAlertTriangle className={`${styles.alertIcon} ${esAlta ? styles.alertIconHigh : styles.alertIconNormal}`} />
                            <div className={styles.alertContent}>
                              <p className={`${styles.alertName} ${esAlta ? styles.alertNameHigh : styles.alertNameNormal}`}>
                                {alerta.name}
                              </p>
                              <p className={styles.alertObs}>{alerta.observation}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AccessNotifier;