import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import styles from './PlansChart.module.css';

const COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f97316'];

const PlansChart = ({ data }) => {
  const hasData = data && data.length > 0;
  const dummyData = [{ name: 'Sin Socios', value: 1 }];

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3>Distribución de Membresías</h3>
        <span className={styles.subtitle}>Planes activos</span>
      </div>

      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={hasData ? data : dummyData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={hasData ? 8 : 0}
              dataKey="value"
              stroke="none"
            >
              {hasData 
                ? data.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} cornerRadius={6} />)
                : <Cell fill="#f1f5f9" /> // Círculo gris de fondo
              }
            </Pie>
            {hasData && <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />}
          </PieChart>
        </ResponsiveContainer>
        
        {!hasData && (
          <div className={styles.emptyOverlay}>
            <p>No hay socios activos</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlansChart;