import React from 'react';
import styles from './StatCard.module.css';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ title, value, icon, trend, percentage, color = "purple" }) => {
  // Colores definidos para mantener la consistencia Sparkling Blue
  const colorClass = styles[color] || styles.purple;

  return (
    <div className={`${styles.card} ${colorClass}`}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          {icon}
        </div>
        {percentage && (
          <div className={`${styles.trend} ${trend === 'up' ? styles.trendUp : styles.trendDown}`}>
            {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{percentage}%</span>
          </div>
        )}
      </div>
      
      <div className={styles.content}>
        <span className={styles.title}>{title}</span>
        <h3 className={styles.value}>{value}</h3>
      </div>
      
      {/* Elemento decorativo Sparkling */}
      <div className={styles.sparkleDecoration}></div>
    </div>
  );
};

export default StatCard;