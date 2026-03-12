import React, { useState } from 'react';
import styles from './HistorialPagos.module.css';
import { CreditCard, AlertCircle, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const HistorialPagos = ({ pagos, loading }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const calcularEstadoDesdePagos = () => {
    if (!pagos || pagos.length === 0) {
      return { 
        label: 'Factura sin registrar', 
        class: styles.statusNone, 
        icon: <AlertCircle size={18} />,
        sub: 'No se encontraron pagos realizados'
      };
    }

    const ultimoPago = new Date(pagos[0].payment_date);
    const vencimiento = new Date(ultimoPago);
    vencimiento.setDate(vencimiento.getDate() + 30);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    vencimiento.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'Factura vencida', class: styles.statusOverdue, icon: <XCircle size={18} />, sub: `Expiró hace ${Math.abs(diffDays)} días` };
    } else if (diffDays <= 5) {
      return { label: 'Factura por vencer', class: styles.statusWarning, icon: <Clock size={18} />, sub: `Vence en ${diffDays} días` };
    } else {
      return { label: 'Factura al día', class: styles.statusOk, icon: <CheckCircle2 size={18} />, sub: `Vence el ${vencimiento.toLocaleDateString()}` };
    }
  };

  const estado = calcularEstadoDesdePagos();

  const totalPaginas = Math.ceil(pagos.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const pagosActuales = pagos.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className={styles.container}>
      <div className={`${styles.statusCard} ${estado.class}`}>
        <div className={styles.statusInfo}>
          {estado.icon}
          <div>
            <h4>{estado.label}</h4>
            <span>{estado.sub}</span>
          </div>
        </div>
      </div>

      <div className={styles.historySection}>
        <div className={styles.historyHeader}>
          <h3>Historial de Pagos</h3>
          <CreditCard size={18} />
        </div>

        {loading ? (
          <p className={styles.empty}>Cargando historial...</p>
        ) : pagos.length > 0 ? (
          <div className={styles.mainContentWrapper}>
            {/* Contenedor con alto fijo para la tabla */}
            <div className={styles.tableFixedHeight}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Método</th>
                    <th className={styles.textRight}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {pagosActuales.map((p, i) => (
                    <tr key={p.id || i}>
                      <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                      <td>
                        <span className={styles.methodBadge}>
                          {p.payment_method?.replace('_', ' ') || 'Efectivo'}
                        </span>
                      </td>
                      <td className={`${styles.textRight} ${styles.amount}`}>
                        ${Number(p.amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginador siempre al final del wrapper */}
            {totalPaginas > 1 && (
              <div className={styles.pagination}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={styles.pageBtn}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className={styles.pageInfo}>
                  {currentPage} de {totalPaginas}
                </span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPaginas))}
                  disabled={currentPage === totalPaginas}
                  className={styles.pageBtn}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.noData}>
            <AlertCircle size={32} />
            <p>El cliente no registra actividad financiera.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistorialPagos;