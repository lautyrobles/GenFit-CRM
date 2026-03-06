import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowRight, CheckCircle } from 'lucide-react';
import { obtenerAsistenciasPorUsuario } from '../../assets/services/asistenciaService';
import styles from './ClienteAsistencia.module.css';

const ClienteAsistencia = ({ socio }) => {
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const hoy = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const cargarDatos = async () => {
      if (!socio?.id) return;
      try {
        setLoading(true);
        const dias = await obtenerAsistenciasPorUsuario(socio.id);
        setAsistencias(dias);
      } catch (error) {
        console.error("Error al cargar calendario", error);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, [socio]);

  const irAAsistencia = () => {
    navigate('/asistencia', { state: { dni: socio.dni } });
  };

  const renderCalendario = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Configuración del calendario
    const primerDiaMes = new Date(year, month, 1).getDay();
    const diasEnMes = new Date(year, month + 1, 0).getDate();
    
    const celdas = [];
    
    // Espacios vacíos para el inicio del mes
    for (let i = 0; i < primerDiaMes; i++) {
      celdas.push(<div key={`empty-${i}`} className={styles.diaVacio}></div>);
    }

    // Días del mes
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fechaString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const asistio = asistencias.includes(fechaString);
      const esHoy = fechaString === hoy;

      celdas.push(
        <div 
          key={dia} 
          className={`${styles.dia} ${asistio ? styles.asistio : ''} ${esHoy ? styles.hoy : ''}`}
        >
          <span className={styles.numeroDia}>{dia}</span>
          {asistio && <CheckCircle className={styles.checkIcon} size={12} />}
        </div>
      );
    }
    return celdas;
  };

  return (
    <div className={styles.asistenciaContainer}>
      <div className={styles.miniHeader}>
        <div className={styles.statsInfo}>
          <span className={styles.count}>{asistencias.length}</span>
          <label>Asistencias este mes</label>
        </div>
        <button onClick={irAAsistencia} className={styles.btnAction}>
          Dar Presente <ArrowRight size={14} />
        </button>
      </div>

      <div className={styles.calendarWrapper}>
        <div className={styles.weekLabels}>
          {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => <span key={d}>{d}</span>)}
        </div>
        <div className={styles.grid}>
          {loading ? <div className={styles.loaderSmall}>Cargando...</div> : renderCalendario()}
        </div>
      </div>
    </div>
  );
};

export default ClienteAsistencia;