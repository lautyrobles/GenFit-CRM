import React, { useState, useEffect } from 'react';
import styles from './Inicio.module.css';
import { useAuth } from '../../context/AuthContext';

// 🧩 Componentes
import StatCard from './Components/Statcard';
import IncomeChart from './Components/IncomeChart';
import PlansChart from './Components/PlansChart';
import QuickActions from './Components/QuickActions';
import Loader from '../../Components/Loader/Loader';

// 📦 Servicios
import { 
  getSummaryStats, 
  getIncomeHistory, 
  getPlansDistribution, 
  obtenerConteoAlertasMedicas 
} from '../../assets/services/dashboardService';
import { obtenerUsuariosActivosAhora } from '../../assets/services/asistenciaService';
import { Users, DollarSign, Activity, AlertTriangle } from 'lucide-react';

const Inicio = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    activeUsers: 0,
    monthlyIncome: 0,
    usersPresent: 0, 
    alertasMedicas: 0,
  });
  
  const [incomeData, setIncomeData] = useState([]);
  const [plansData, setPlansData] = useState([]);

  // 🛠️ Función para transformar Pagos en Tendencia Mensual (Últimos 6 meses)
  const transformarIngresos = (pagos) => {
    const mesesNombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const hoy = new Date();
    const ultimosMeses = [];

    // 1. Generamos un esqueleto de los últimos 6 meses en 0
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      ultimosMeses.push({
        name: mesesNombres[d.getMonth()],
        fullName: `${d.getMonth() + 1}-${d.getFullYear()}`, // Clave única para agrupar
        ingresos: 0
      });
    }

    // 2. Mapeamos los pagos sobre ese esqueleto
    if (pagos && pagos.length > 0) {
      pagos.forEach(pago => {
        const fechaPago = new Date(pago.payment_date);
        const clavePago = `${fechaPago.getMonth() + 1}-${fechaPago.getFullYear()}`;
        
        const mesEncontrado = ultimosMeses.find(m => m.fullName === clavePago);
        if (mesEncontrado) {
          mesEncontrado.ingresos += (Number(pago.amount) || 0);
        }
      });
    }

    return ultimosMeses;
  };

  const transformarPlanes = (usuarios) => {
    if (!usuarios || usuarios.length === 0) return [];
    const conteo = {};
    usuarios.forEach(u => {
      const nombrePlan = u.plans?.name || "Sin Plan";
      conteo[nombrePlan] = (conteo[nombrePlan] || 0) + 1;
    });
    return Object.keys(conteo).map(plan => ({
      name: plan,
      value: conteo[plan]
    }));
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.gym_id) return;

      try {
        setLoading(true);
        const [resStats, resIncome, resPlans, resPresent, resAlertas] = await Promise.all([
          getSummaryStats(user.gym_id),
          getIncomeHistory(user.gym_id),
          getPlansDistribution(user.gym_id),
          obtenerUsuariosActivosAhora(user.gym_id),
          obtenerConteoAlertasMedicas(user.gym_id)
        ]);

        if (resStats) {
          setStats({
            ...resStats,
            usersPresent: resPresent || 0,
            alertasMedicas: resAlertas || 0
          });
        }
        
        setIncomeData(transformarIngresos(resIncome));
        setPlansData(transformarPlanes(resPlans));
        
      } catch (error) {
        console.error("Error al cargar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.gym_id]);

  if (loading) {
    return (
      <div className={styles.loaderFull}>
        <Loader text="Sincronizando métricas..." />
      </div>
    );
  }

  return (
    <div className={styles.inicioContainer}>
      <section className={styles.statsSection}>
        <StatCard title="Socios Activos" value={stats.activeUsers} icon={<Users size={20} />} color="blue" />
        <StatCard title="Ingresos Mes" value={`$${stats.monthlyIncome.toLocaleString()}`} icon={<DollarSign size={20} />} trend="up" color="green" />
        <StatCard title="Gimnasio Ahora" value={stats.usersPresent} icon={<Activity size={20} />} color="orange" trend="Últimas 3hs" />
        <StatCard title="Alertas Médicas" value={stats.alertasMedicas} icon={<AlertTriangle size={24} color="#ef4444" />} trend="Atención" color="danger" />
      </section>

      <section className={styles.actionsSection}>
        <QuickActions />
      </section>

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