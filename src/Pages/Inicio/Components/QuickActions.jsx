import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './QuickActions.module.css';
import { UserPlus, DollarSign, QrCode, ClipboardList } from 'lucide-react';

const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Nuevo Socio',
      icon: <UserPlus size={24} />,
      path: '/clientes',
      description: 'Registrar alta',
      color: '#7c3aed'
    },
    {
      title: 'Cobrar Cuota',
      icon: <DollarSign size={24} />,
      path: '/pagos',
      description: 'Registrar pago',
      color: '#10b981'
    },
    {
      title: 'Control Acceso',
      icon: <QrCode size={24} />,
      path: '/asistencia',
      description: 'Dar presente',
      color: '#3b82f6'
    },
    {
      title: 'Ver Rutinas',
      icon: <ClipboardList size={24} />,
      path: '/rutinas',
      description: 'Validar solicitudes',
      color: '#f97316'
    }
  ];

  return (
    <div className={styles.container}>
      <h3 className={styles.sectionTitle}>Accesos Directos</h3>
      <div className={styles.actionsGrid}>
        {actions.map((action, index) => (
          <button 
            key={index} 
            className={styles.actionBtn}
            onClick={() => navigate(action.path)}
          >
            <div className={styles.iconBox} style={{ color: action.color, backgroundColor: `${action.color}15` }}>
              {action.icon}
            </div>
            <div className={styles.textBox}>
              <span className={styles.actionTitle}>{action.title}</span>
              <span className={styles.actionDesc}>{action.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;