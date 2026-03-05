import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './IncomeChart.module.css';

const IncomeChart = ({ data }) => {
  // Si no hay datos, creamos un array ficticio con valores en 0 para dibujar el gráfico vacío
  const chartData = data && data.length > 0 ? data : [
    { name: 'Sin Datos', ingresos: 0 }
  ];

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3>Tendencia de Ingresos</h3>
        <span className={styles.subtitle}>Histórico de suscripciones</span>
      </div>
      
      <div className={styles.chartWrapper}>
        {/* Renderizamos el gráfico siempre para mantener la estética */}
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              dy={10}
            />
            <YAxis hide={true} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
              formatter={(value) => [`$${value.toLocaleString()}`, 'Ingresos']}
            />
            <Area 
              type="monotone" 
              dataKey="ingresos" 
              stroke="#7c3aed" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorIngresos)" 
            />
          </AreaChart>
        </ResponsiveContainer>
        
        {/* El mensaje lo superponemos centrado si no hay datos reales */}
        {(!data || data.length === 0) && (
          <div className={styles.emptyOverlay}>
            <p>Sin ingresos registrados este mes</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomeChart;