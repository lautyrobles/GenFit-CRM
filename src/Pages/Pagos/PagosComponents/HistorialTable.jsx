import React, { useState, useMemo } from 'react';
import { Search, CheckCircle, Activity, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import Loader from '../../../Components/Loader/Loader';
import styles from '../Pagos.module.css';

const HistorialTable = ({ pagos, loading }) => {
  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 6;

  // 1. Procesamiento de datos: Filtrado y Ordenamiento (Nuevos primero)
  const pagosProcesados = useMemo(() => {
    let filtrados = pagos;

    if (busqueda) {
      const lower = busqueda.toLowerCase();
      filtrados = pagos.filter(p => 
        p.clientName?.toLowerCase().includes(lower) || 
        String(p.clientDni).includes(lower) || 
        p.method?.toLowerCase().includes(lower) ||
        p.planName?.toLowerCase().includes(lower)
      );
    }

    // Ordenar por fecha: los más recientes arriba
    return [...filtrados].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [pagos, busqueda]);

  // 2. Lógica de Paginación
  const totalPaginas = Math.ceil(pagosProcesados.length / registrosPorPagina) || 1;
  const indiceUltimo = paginaActual * registrosPorPagina;
  const indicePrimero = indiceUltimo - registrosPorPagina;
  const pagosPaginados = pagosProcesados.slice(indicePrimero, indiceUltimo);

  const handleDescargarComprobante = (pagoId) => {
    console.log("Generando comprobante para el ID:", pagoId);
    // Próximo paso: Integrar lógica de impresión/PDF
  };

  const cambiarPagina = (numero) => {
    if (numero >= 1 && numero <= totalPaginas) {
      setPaginaActual(numero);
    }
  };

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableToolbar}>
        <h3>Historial Reciente</h3>
        <div className={styles.searchBox}>
          <Search className={styles.searchIcon} size={16} />
          <input 
            type="text" 
            placeholder="Buscar socio, DNI o plan..." 
            value={busqueda} 
            onChange={(e) => {
                setBusqueda(e.target.value);
                setPaginaActual(1);
            }} 
          />
        </div>
      </div>

      <div className={styles.tableScrollArea}>
        {loading && pagos.length === 0 ? (
          <div className={styles.loaderWrapper}><Loader text="Sincronizando caja..." /></div>
        ) : pagosPaginados.length > 0 ? (
          <>
            {/* Contenedor con altura mínima para mantener el paginador fijo abajo */}
            <div className={styles.tableMinHeight}>
              <table className={styles.modernTable}>
                <thead>
                  <tr>
                    <th>Socio</th>
                    <th>DNI</th>
                    <th>Membresía</th>
                    <th>Canal</th>
                    <th>Fecha</th>
                    <th className={styles.textRight}>Importe</th>
                    <th className={styles.textCenter}>Status</th>
                    <th className={styles.textCenter}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagosPaginados.map((p) => (
                    <tr key={p.id}>
                      <td className={styles.fwBold}>{p.clientName}</td>
                      <td className={styles.textMuted}>{p.clientDni}</td>
                      <td>
                        <span className={styles.planBadge}>
                          {p.planName || "Sin Plan"}
                        </span>
                      </td>
                      <td><span className={styles.methodPill}>{p.method?.replace('_', ' ')}</span></td>
                      <td className={styles.dateText}>{new Date(p.date).toLocaleDateString()}</td>
                      <td className={`${styles.textRight} ${styles.amountText}`}>
                        ${Number(p.amount).toLocaleString()}
                      </td>
                      <td className={styles.textCenter}>
                        <span className={`${styles.statusPill} ${styles.confirmed}`}>
                          <CheckCircle size={12}/> Aprobado
                        </span>
                      </td>
                      <td className={styles.textCenter}>
                        <button 
                          className={styles.btnActionTable} 
                          onClick={() => handleDescargarComprobante(p.id)}
                          title="Descargar Comprobante"
                        >
                          <Download size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* --- PAGINADOR ANCLADO AL FONDO --- */}
            <div className={styles.pagination}>
              <p className={styles.pageInfo}>
                Mostrando {indicePrimero + 1} a {Math.min(indiceUltimo, pagosProcesados.length)} de {pagosProcesados.length}
              </p>
              <div className={styles.pageButtons}>
                <button 
                  onClick={() => cambiarPagina(paginaActual - 1)} 
                  disabled={paginaActual === 1}
                  className={styles.pageBtn}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className={styles.currentPage}>{paginaActual} / {totalPaginas}</span>
                <button 
                  onClick={() => cambiarPagina(paginaActual + 1)} 
                  disabled={paginaActual === totalPaginas}
                  className={styles.pageBtn}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <Activity size={32} />
            <p>No se encontraron movimientos financieros.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistorialTable;