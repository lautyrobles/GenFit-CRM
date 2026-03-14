import React, { useEffect, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from '../../assets/services/supabaseClient'; 
import { useAuth } from '../../context/AuthContext';
import styles from './AccessNotifier.module.css';

// Íconos adicionales para el Pop-up
import { FiEye, FiUser, FiCreditCard, FiActivity, FiAlertTriangle, FiHash } from 'react-icons/fi';

const AccessNotifier = () => {
  const { user } = useAuth();
  
  // Estados para controlar el Pop-up de Detalle del Usuario
  const [modalData, setModalData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Función que se ejecuta al tocar el "Ojo"
  const abrirDetalleUsuario = async (userId) => {
    setLoadingData(true);
    setIsModalOpen(true); // Abrimos el modal con estado de carga
    
    try {
      // 1. Buscamos los datos completos del usuario (Ajustá los nombres de las columnas si es necesario)
      const { data: userData } = await supabase
        .from('users')
        .select('*') // Trae first_name, last_name, dni, status, medical_alerts, etc.
        .eq('id', userId)
        .single();

      // 2. Calculamos las asistencias de los últimos 7 días
      const haceUnaSemana = new Date();
      haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);

      const { count } = await supabase
        .from('access_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', haceUnaSemana.toISOString());

      // Guardamos todo en el estado para dibujarlo en el Modal
      setModalData({
        ...userData,
        asistenciasSemanales: count || 0
      });

    } catch (error) {
      console.error("Error cargando detalle:", error);
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

          // Buscamos solo el nombre para el Toast rápido
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

              {/* 👉 ACÁ ESTÁ EL BOTÓN DEL OJO */}
              <button 
                className={styles.btnEye} 
                onClick={() => {
                  toast.dismiss(t.id); // Opcional: cierra el toast chiquito
                  abrirDetalleUsuario(nuevoIngreso.user_id); // Abre el Pop-up grande
                }}
                title="Ver detalles"
              >
                <FiEye size={20} />
              </button>

            </div>
          ), { 
            position: 'top-right', 
            duration: 6000 // Le di un segundito más para que tengas tiempo de darle clic
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
      {/* Contenedor invisible de los Toasts */}
      <Toaster />

      {/* ==================== POP-UP GRANDE (MODAL) ==================== */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <FiUser color="#3b82f6" /> Detalle de Ingreso
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
                    <span className={styles.infoValue}>{modalData.first_name} {modalData.last_name}</span>
                  </div>

                  {/* Fila 2: DNI (Asegurate que la columna se llame dni) */}
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}><FiHash /> DNI</span>
                    <span className={styles.infoValue}>{modalData.dni || 'No registrado'}</span>
                  </div>

                  {/* Fila 3: Estado de la Cuota (Asegurate que la columna se llame status) */}
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}><FiCreditCard /> Estado de Cuota</span>
                    <span className={`${styles.badgeStatus} ${modalData.status === 'activo' || modalData.status === 'ACTIVO' ? styles.statusActive : styles.statusInactive}`}>
                      {modalData.status ? modalData.status.toUpperCase() : 'DESCONOCIDO'}
                    </span>
                  </div>

                  {/* Fila 4: Asistencia Semanal calculada */}
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}><FiActivity /> Asistencia (Últimos 7 días)</span>
                    <span className={styles.infoValue}>{modalData.asistenciasSemanales} días</span>
                  </div>

                  {/* Alertas Médicas (Asegurate que la columna se llame medical_alerts) */}
                  {modalData.medical_alerts && (
                    <div className={styles.alertBox}>
                      <FiAlertTriangle className={styles.alertIcon} />
                      <p className={styles.alertText}>
                        <strong>Alerta Médica:</strong><br/>
                        {modalData.medical_alerts}
                      </p>
                    </div>
                  )}
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