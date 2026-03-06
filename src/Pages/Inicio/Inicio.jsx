import React, { useState, useEffect } from 'react';
import styles from './Inicio.module.css';
import { useAuth } from '../../context/AuthContext';

// 🧩 Componentes Independientes
import StatCard from './Components/Statcard';
import IncomeChart from './Components/IncomeChart';
import PlansChart from './Components/PlansChart';
import QuickActions from './Components/QuickActions';
import Loader from '../../Components/Loader/Loader';

// 📦 Servicios
import { getSummaryStats, getIncomeHistory, getPlansDistribution } from '../../assets/services/dashboardService';

// 🎨 Iconos
import { Users, DollarSign, Calendar, AlertCircle } from 'lucide-react';

const Inicio = () => {
  const { user } = useAuth();
  
  // 📈 Estados para datos reales
  const [stats, setStats] = useState({
    activeUsers: 0,
    monthlyIncome: 0,
    dueSoon: 0,
    medicalAlerts: 0
  });
  const [incomeData, setIncomeData] = useState([]);
  const [plansData, setPlansData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [resStats, resIncome, resPlans] = await Promise.all([
          getSummaryStats(),
          getIncomeHistory(),
          getPlansDistribution()
        ]);

        if (resStats) setStats(resStats);
        if (resIncome) setIncomeData(resIncome);
        if (resPlans) setPlansData(resPlans);
        
      } catch (error) {
        console.error("Error al cargar el dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className={styles.loaderFull}>
        <Loader text="Sincronizando panel de control..." />
      </div>
    );
  }

  return (
    <div className={styles.inicioContainer}>
      
      {/* 📊 1. KPIs Rápidos */}
      <section className={styles.statsSection}>
        <StatCard 
          title="Socios Activos" 
          value={stats.activeUsers} 
          icon={<Users size={20} />} 
          color="blue" 
        />
        <StatCard 
          title="Ingresos Mes" 
          value={`$${stats.monthlyIncome.toLocaleString()}`} 
          icon={<DollarSign size={20} />} 
          trend="up" 
          color="green" 
        />
        <StatCard 
          title="Vencimientos (7d)" 
          value={stats.dueSoon} 
          icon={<Calendar size={20} />} 
          color="orange" 
        />
        <StatCard 
          title="Alertas Médicas" 
          value={stats.medicalAlerts} 
          icon={<AlertCircle size={20} />} 
          color="red" 
        />
      </section>

      {/* ⚡ 2. Operatividad (Accesos Directos) */}
      <section className={styles.actionsSection}>
        <QuickActions />
      </section>

      {/* 📈 3. Análisis Visual */}
      <section className={styles.mainChartsGrid}>
        <div className={styles.chartLarge}>
          <IncomeChart data={incomeData} />
        </div>
        <div className={styles.chartSmall}>
          <PlansChart data={plansData} />
        </div>
      </section>
    </div>
  );
};

export default Inicio;