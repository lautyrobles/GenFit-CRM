import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { obtenerAsistenciasPorUsuario } from '../../assets/services/asistenciaService';
import { useAuth } from '../../context/AuthContext'; 
import styles from './ClienteAsistencia.module.css';

const ClienteAsistencia = ({ socio }) => {
  const { user } = useAuth(); 
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const hoy = new Date();
  const hoyISO = hoy.toISOString().split('T')[0];

  useEffect(() => {
    const cargarDatos = async () => {
      if (!socio?.id || !user?.gym_id) return;
      
      try {
        setLoading(true);
        const dias = await obtenerAsistenciasPorUsuario(socio.id);
        setAsistencias(dias || []);
      } catch (error) {
        console.error("❌ Error al cargar asistencias del socio:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [socio?.id, user?.gym_id]); 

  const diasSemana = useMemo(() => {
    const current = new Date();
    const dayOfWeek = current.getDay();
    const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, []);

  const fechaHeader = `Semana del ${diasSemana[0].toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}`;

  const irAAsistencia = () => {
    if (socio?.dni) {
      navigate('/asistencia', { state: { dni: socio.dni } });
    }
  };

  return (
    <div className={styles.asistenciaContainer}>
      <div className={styles.miniHeader}>
        <div className={styles.statsInfo}>
          <div className={styles.headerTitleRow}>
            <CalendarIcon size={16} className={styles.calendarIconTitle} />
            <span className={styles.weekText}>{fechaHeader}</span>
          </div>
          <label className={styles.subtitle}>Actividad Reciente</label>
        </div>
        <button onClick={irAAsistencia} className={styles.btnAction}>
          Dar Presente <ArrowRight size={14} />
        </button>
      </div>

      <div className={styles.weekWrapper}>
        {loading ? (
          <div className={styles.loaderSmall}>Sincronizando...</div>
        ) : (
          <div className={styles.weekGrid}>
            {diasSemana.map((fecha, idx) => {
              const diaISO = fecha.toISOString().split('T')[0];
              const asistio = asistencias.includes(diaISO);
              const esHoy = diaISO === hoyISO;
              const nombreDia = fecha.toLocaleDateString('es-ES', { weekday: 'short' })
                .toUpperCase()
                .replace('.', '');

              return (
                <div 
                  key={idx} 
                  className={`${styles.diaCol} ${esHoy ? styles.hoy : ''}`}
                >
                  <span className={styles.diaNombre}>{nombreDia}</span>
                  <div className={`${styles.statusDot} ${asistio ? styles.asistio : styles.falto}`}>
                    {asistio ? (
                      <CheckCircle2 size={24} />
                    ) : (
                      <Circle size={24} className={styles.emptyCircle} />
                    )}
                  </div>
                  <span className={styles.diaNumero}>{fecha.getDate()}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={styles.footerStats}>
          <p>
            Asistencias registradas: <strong>{asistencias.length}</strong>
          </p>
      </div>
    </div>
  );
};

export default ClienteAsistencia;