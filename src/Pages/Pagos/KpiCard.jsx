import React from 'react';
import styles from './Pagos.module.css'; // Reutilizamos el CSS principal para mantener la cohesión

const KpiCard = ({ label, value, icon, trend }) => {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiHeader}>
        <span className={styles.kpiIcon}>{icon}</span>
        <span className={styles.kpiLabel}>{label}</span>
      </div>
      <div className={styles.kpiBody}>
        <span className={styles.kpiValue}>{value}</span>
        {trend && <span className={styles.kpiTrend}>{trend}</span>}
      </div>
    </div>
  );
};

export default KpiCard;