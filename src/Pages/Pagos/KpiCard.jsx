import React from 'react';
import styles from './Pagos.module.css';

const KpiCard = ({ label, value, icon, trend, color = "purple" }) => {
  // Definimos las variables de color basadas en el "prop" que recibimos
  const colorMap = {
    green: { text: '#10b981', bg: '#ecfdf5' },
    blue: { text: '#3b82f6', bg: '#eff6ff' },
    purple: { text: '#7c3aed', bg: '#f5f3ff' },
    orange: { text: '#f59e0b', bg: '#fff7ed' },
    red: { text: '#ef4444', bg: '#fef2f2' }
  };

  const currentTheme = colorMap[color] || colorMap.purple;

  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiHeader}>
        <span 
          className={styles.kpiIcon} 
          style={{ color: currentTheme.text, backgroundColor: currentTheme.bg }}
        >
          {icon}
        </span>
        <span className={styles.kpiLabel}>{label}</span>
      </div>
      <div className={styles.kpiBody}>
        <span className={styles.kpiValue}>{value}</span>
        {trend && (
          <span 
            className={styles.kpiTrend} 
            style={{ color: currentTheme.text }}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};

export default KpiCard;