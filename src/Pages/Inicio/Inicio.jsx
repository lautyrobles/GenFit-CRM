import React from 'react';
import styles from './Inicio.module.css';
import StatsCard from '../../Components/StatsCard/StatsCard';
import CustomersTable from '../../Components/CustomersTable/CustomersTable';
import { useAuth } from '../../context/AuthContext';

const Inicio = () => {
  const { user } = useAuth();
  // Asumimos que el nombre viene del email o perfil
  const userName = user?.email?.split('@')[0] || 'Admin';

  return (
    <div className={styles.inicioContainer}>

      <section className={styles.statsSection}>
        <StatsCard title="Clientes totales" value="5,423" change="+16% Este mes" positive />
        <StatsCard title="Miembros" value="1,893" change="-1% Este mes" />
        <StatsCard title="Activos ahora" value="189" change="+5% Este mes" positive />
      </section>

      <div className={styles.contentGrid}>
        <div className={styles.tableWrapper}>
          <CustomersTable />
        </div>
      </div>
    </div>
  );
};

export default Inicio;