import React, { useEffect, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from '../../assets/services/supabaseClient'; 
import { useAuth } from '../../context/AuthContext';
import styles from './AccessNotifier.module.css';
import { useNavigate } from 'react-router-dom';

import { FiEye, FiUser, FiActivity, FiAlertTriangle, FiHash, FiCheckCircle, FiCreditCard } from 'react-icons/fi';

const AccessNotifier = () => {
  const { user, selectedGymId } = useAuth();
  
  const [modalData, setModalData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const navigate = useNavigate();

  const irAlPerfil = () => {
    if (!modalData) return;
    setIsModalOpen(false);
    navigate('/clientes', { state: { autoOpenUserId: modalData.user_id } });
  };

  const abrirDetalleUsuario = async (userId, estadoCalculado) => {
    setLoadingData(true);
    setIsModalOpen(true);
    
    try {
      let nombre = "Cliente no encontrado";
      let userDni = "No registrado";

      const { data: usrData } = await supabase
        .from('users')
        .select('first_name, last_name, dni')
        .eq('id', userId)
        .maybeSingle();

      if (usrData) {
        nombre = `${usrData.first_name || ''} ${usrData.last_name || ''}`.trim();
        userDni = usrData.dni;
      }

      const { data: alertsData } = await supabase
        .from('medical_alerts')
        .select('name, observation, severity')
        .eq('user_id', userId)
        .eq('gym_id', selectedGymId); 

      const haceUnaSemana = new Date();
      haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);

      const { count } = await supabase
        .from('access_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('gym_id', selectedGymId)
        .gte('check_in_time', haceUnaSemana.toISOString());

      setModalData({
        user_id: userId,
        user: { fullName: nombre, dni: userDni },
        alertas: alertsData || [],
        asistenciasSemanales: count || 0,
        ...estadoCalculado
      });

    } catch (error) {
      console.error("Error cargando detalle de usuario:", error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!selectedGymId) return;

    const canalAsistencias = supabase
      .channel(`ingresos_gym_${selectedGymId}`) 
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'access_logs',
          filter: `gym_id=eq.${selectedGymId}` 
        },
        async (payload) => {
          const nuevoIngreso = payload.new;

          const { data: usrData } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', nuevoIngreso.user_id)
            .maybeSingle();

          const nombreCliente = usrData ? `${usrData.first_name} ${usrData.last_name}` : "Un cliente";

          // Buscamos la suscripción recién actualizada
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('due_date')
            .eq('user_id', nuevoIngreso.user_id)
            .eq('gym_id', selectedGymId)
            .maybeSingle();

          let estadoCuota = 'SIN PLAN';
          let diasRestantes = 0;
          let badgeClass = styles.statusInactive;
          let mensajeCuota = 'No tiene un plan registrado.';
          let accesoValido = nuevoIngreso.access_granted !== false; 

          if (subData && subData.due_date) {
            // --- 🎯 LÓGICA DE FECHAS NORMALIZADA (ANTI 60 DÍAS) ---
            const hoyStr = new Date().toISOString().split('T')[0];
            const hoy = new Date(hoyStr + "T12:00:00");
            const vencimiento = new Date(subData.due_date + "T12:00:00");

            const diffTime = vencimiento.getTime() - hoy.getTime();
            // Math.round para evitar cualquier decimal molesto
            const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
            diasRestantes = diffDays;

            if (diffDays >= 0) {
              estadoCuota = 'ACTIVO';
              badgeClass = styles.statusActive;
              mensajeCuota = `Le quedan ${diffDays} días de cuota.`;
            } else if (diffDays >= -5) {
              estadoCuota = 'RETRASO';
              badgeClass = styles.statusWarning;
              mensajeCuota = `En periodo de gracia (${Math.abs(diffDays)} días).`;
              accesoValido = true;
            } else {
              estadoCuota = 'NO ACTIVO';
              badgeClass = styles.statusInactive;
              mensajeCuota = `Cuota vencida hace ${Math.abs(diffDays)} días.`;
              accesoValido = false;
            }
          }

          const estadoCalculado = { estadoCuota, badgeClass, diasRestantes };

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
              >
                <FiEye size={22} />
              </button>
            </div>
          ), { position: 'top-right', duration: 6000 });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(canalAsistencias);
  }, [selectedGymId]);

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
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Cargando datos del cliente...
                </div>
              ) : (
                <>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}><FiUser /> Nombre Completo</span>
                    <span className={styles.infoValue}>{modalData.user.fullName}</span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}><FiHash /> DNI</span>
                    <span className={styles.infoValue}>{modalData.user.dni || 'No registrado'}</span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}><FiCreditCard /> Estado de Cuota</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`${styles.badgeStatus} ${modalData.badgeClass}`}>
                        {modalData.estadoCuota}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>
                        {modalData.diasRestantes >= 0 
                          ? `(Quedan ${modalData.diasRestantes} días)` 
                          : `(Vencido hace ${Math.abs(modalData.diasRestantes)} días)`}
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
                      modalData.alertas.map((alerta, index) => (
                        <div key={index} className={`${styles.alertBox} ${alerta.severity === 'Alta' ? styles.alertBoxHigh : ''}`}>
                          <FiAlertTriangle className={alerta.severity === 'Alta' ? styles.alertIconHigh : styles.alertIconNormal} />
                          <div className={styles.alertContent}>
                            <p className={alerta.severity === 'Alta' ? styles.alertNameHigh : styles.alertNameNormal}>
                              {alerta.name}
                            </p>
                            <p className={styles.alertObs}>{alerta.observation}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{ marginTop: '10px' }}>
                    <button 
                      className={styles.btnFullProfile} 
                      onClick={irAlPerfil}
                    >
                      <FiEye /> Ir al Perfil
                    </button>
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