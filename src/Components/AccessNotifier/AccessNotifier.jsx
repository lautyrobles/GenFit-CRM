import React, { useEffect, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from '../../assets/services/supabaseClient'; 
import { useAuth } from '../../context/AuthContext';
import styles from './AccessNotifier.module.css';

// Íconos
import { FiEye, FiUser, FiActivity, FiAlertTriangle, FiHash, FiCheckCircle } from 'react-icons/fi';

const AccessNotifier = () => {
  const { user } = useAuth();
  
  // Estados para el Pop-up (Modal)
  const [modalData, setModalData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Función al tocar el "Ojo"
  const abrirDetalleUsuario = async (userId) => {
    setLoadingData(true);
    setIsModalOpen(true);
    
    try {
      // 1. Buscamos nombre y DNI en 'users'
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name, dni')
        .eq('id', userId)
        .single();

      // 2. Buscamos las alertas médicas en 'medical_alerts'
      const { data: alertsData } = await supabase
        .from('medical_alerts')
        .select('name, observation, severity')
        .eq('user_id', userId);

      // 3. Calculamos asistencias de los últimos 7 días en 'access_logs'
      const haceUnaSemana = new Date();
      haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);

      // Usamos 'check_in_time' según tu esquema
      const { count } = await supabase
        .from('access_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('check_in_time', haceUnaSemana.toISOString());

      // Guardamos todo para dibujar el Modal
      setModalData({
        user: userData || {},
        alertas: alertsData || [],
        asistenciasSemanales: count || 0
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

          const { data: userData } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', nuevoIngreso.user_id)
            .single();

          const nombreCliente = userData ? `${userData.first_name} ${userData.last_name}` : 'Un cliente';
          const accesoValido = nuevoIngreso.access_granted !== false;

          // Disparamos el Toast
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
                  {accesoValido ? (
                    <><strong className={styles.name}>{nombreCliente}</strong> dio el presente.</>
                  ) : (
                    <>Problemas con el acceso de <strong className={styles.name}>{nombreCliente}</strong>.</>
                  )}
                </span>
              </div>

              {/* Botón del OJO */}
              <button 
                className={styles.btnEye} 
                onClick={() => {
                  toast.dismiss(t.id); // Cerramos el toast
                  abrirDetalleUsuario(nuevoIngreso.user_id); // Abrimos el Pop-up grande
                }}
                title="Ver detalle del cliente"
              >
                <FiEye size={22} />
              </button>

            </div>
          ), { 
            position: 'top-right', 
            duration: 6000 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalAsistencias);
    };
  }, [user]);

  return (
    <>
      <Toaster />

      {/* ==================== POP-UP GRANDE (MODAL) ==================== */}
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
                  {/* Fila 1: Nombre */}
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}><FiUser /> Nombre Completo</span>
                    <span className={styles.infoValue}>{modalData.user.first_name} {modalData.user.last_name}</span>
                  </div>

                  {/* Fila 2: DNI */}
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}><FiHash /> DNI</span>
                    <span className={styles.infoValue}>{modalData.user.dni || 'No registrado'}</span>
                  </div>

                  {/* Fila 3: Asistencia Semanal */}
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}><FiActivity /> Asistencia (Últ. 7 días)</span>
                    <span className={styles.infoValue}>{modalData.asistenciasSemanales} días</span>
                  </div>

                  {/* Sección Alertas Médicas */}
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