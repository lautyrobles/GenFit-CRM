import React from 'react'
import styles from './StatsCard.module.css'
import { Users, Activity, UserCheck } from 'lucide-react'

const StatsCard = ({ title, value, change, positive }) => {
  // Selección dinámica de iconos basada en el título
  const getIcon = () => {
    if (title.toLowerCase().includes("total")) return <Users size={24} />
    if (title.toLowerCase().includes("activo")) return <Activity size={24} />
    return <UserCheck size={24} />
  }

  return (
    <div className={styles.card}>
      <div className={styles.iconContainer}>
        {getIcon()}
      </div>
      <div className={styles.content}>
        <p className={styles.title}>{title}</p>
        <h3 className={styles.value}>{value}</h3>
        {change && (
          <div className={styles.trend}>
            <span className={positive ? styles.up : styles.down}>
              {change}
            </span>
            <span className={styles.trendPeriod}>Este mes</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatsCard