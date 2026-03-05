import React, { useMemo } from 'react';
import KpiCard from '../KpiCard';
import { DollarSign, Activity, FileText } from 'lucide-react';
import styles from '../Pagos.module.css';

const KpiSection = ({ pagos }) => {
  const kpis = useMemo(() => {
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    const pagosMes = pagos.filter(p => {
      const fechaPago = new Date(p.date);
      return fechaPago.getMonth() === mesActual && fechaPago.getFullYear() === anioActual;
    });

    const total = pagosMes.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const cantidad = pagosMes.length;
    const promedio = cantidad > 0 ? total / cantidad : 0;

    return { total, cantidad, promedio };
  }, [pagos]);

  return (
    <div className={styles.kpiGrid}>
      <KpiCard 
        label="Total Recaudado" 
        value={`$${kpis.total.toLocaleString()}`} 
        icon={<DollarSign size={20}/>} 
        trend="+ Mes actual" 
        color="green" 
      />
      <KpiCard 
        label="Transacciones" 
        value={kpis.cantidad} 
        icon={<Activity size={20}/>} 
        color="purple"
      />
      <KpiCard 
        label="Ticket Promedio" 
        value={`$${Math.round(kpis.promedio).toLocaleString()}`} 
        icon={<FileText size={20}/>} 
        color="blue"
      />
    </div>
  );
};

export default KpiSection;