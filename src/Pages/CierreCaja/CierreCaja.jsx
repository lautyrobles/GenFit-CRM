import React, { useState, useEffect } from "react";
import styles from "./CierreCaja.module.css";
import { FiDollarSign, FiMinusCircle, FiLock, FiCheckCircle, FiInfo } from "react-icons/fi";
import { registrarEgreso, obtenerBalanceDelDia, registrarCierre } from "../../assets/services/cajaService";
// 👉 Ajustá el import de tu AuthContext según cómo lo llames
import { useAuth } from "../../context/AuthContext"; 

const CierreCaja = () => {
  const { user, role } = useAuth(); // role debería ser 'ADMIN' o 'SUPERVISOR'
  
  // Estados para Egresos
  const [egresoMonto, setEgresoMonto] = useState("");
  const [egresoCat, setEgresoCat] = useState("Proveedores");
  const [egresoDesc, setEgresoDesc] = useState("");
  
  // Estados para Cierre
  const [montoDeclarado, setMontoDeclarado] = useState("");
  const [montoEsperado, setMontoEsperado] = useState(0);
  
  // Feedback visual
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ msg: "", type: "" });

  // Cargar el balance real al entrar (oculto en UI para supervisores, pero necesario para la DB)
  useEffect(() => {
    const cargarBalance = async () => {
      const res = await obtenerBalanceDelDia();
      if (res.success) {
        setMontoEsperado(res.totalEsperado);
      }
    };
    cargarBalance();
  }, [feedback]); // Se recarga si hay un nuevo movimiento (feedback cambia)

  /* --- MANEJADORES --- */
  const handleEgreso = async (e) => {
    e.preventDefault();
    if (!egresoMonto || !egresoDesc) return;
    
    setLoading(true);
    const res = await registrarEgreso(egresoMonto, egresoCat, egresoDesc, user.id);
    
    if (res.success) {
      setFeedback({ msg: "Egreso registrado correctamente.", type: "success" });
      setEgresoMonto("");
      setEgresoDesc("");
    } else {
      setFeedback({ msg: "Error al registrar egreso.", type: "error" });
    }
    setLoading(false);
    setTimeout(() => setFeedback({ msg: "", type: "" }), 3000);
  };

  const handleCierre = async (e) => {
    e.preventDefault();
    if (!montoDeclarado) return;
    
    setLoading(true);
    const res = await registrarCierre(montoDeclarado, montoEsperado, user.id);
    
    if (res.success) {
      setFeedback({ msg: "Cierre de caja guardado con éxito.", type: "success" });
      setMontoDeclarado("");
    } else {
      setFeedback({ msg: "Error al cerrar la caja.", type: "error" });
    }
    setLoading(false);
    setTimeout(() => setFeedback({ msg: "", type: "" }), 4000);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h2>Control y Cierre de Caja</h2>
        <p>Registrá salidas de dinero y realizá el arqueo final de tu turno.</p>
      </div>

      {feedback.msg && (
        <div className={`${styles.alert} ${styles[feedback.type]}`}>
          {feedback.type === 'success' ? <FiCheckCircle /> : <FiInfo />}
          {feedback.msg}
        </div>
      )}

      <div className={styles.grid}>
        
        {/* --- PANEL 1: REGISTRAR EGRESO --- */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <FiMinusCircle />
            </div>
            <h3>Registrar Egreso</h3>
          </div>
          
          <form onSubmit={handleEgreso} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Monto a retirar ($)</label>
              <input 
                type="number" 
                className={styles.input} 
                value={egresoMonto} 
                onChange={(e) => setEgresoMonto(e.target.value)} 
                placeholder="Ej: 5000" 
                required 
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Categoría</label>
              <select className={styles.input} value={egresoCat} onChange={(e) => setEgresoCat(e.target.value)}>
                <option value="Proveedores">Pago a Proveedores</option>
                <option value="Mantenimiento">Mantenimiento / Limpieza</option>
                <option value="Servicios">Servicios (Luz, Agua, etc)</option>
                <option value="Sueldos">Adelanto Sueldos</option>
                <option value="Otros">Otros</option>
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label>Descripción / Motivo</label>
              <input 
                type="text" 
                className={styles.input} 
                value={egresoDesc} 
                onChange={(e) => setEgresoDesc(e.target.value)} 
                placeholder="Ej: Pago de bidones de agua" 
                required 
              />
            </div>

            <button type="submit" className={styles.btnDanger} disabled={loading}>
              {loading ? "Guardando..." : "Retirar Dinero"}
            </button>
          </form>
        </div>

        {/* --- PANEL 2: CIERRE DE CAJA A CIEGAS --- */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <FiLock />
            </div>
            <h3>Cierre de Turno</h3>
          </div>

          <div className={styles.blindBox}>
            <p>Contá el dinero físico en la caja registradora e ingresá el monto exacto a continuación.</p>
            
            {/* 👉 SECRETO PARA ADMINS: Solo ellos ven el esperado */}
            {role === 'ADMIN' && (
              <div className={styles.adminInfo}>
                <span>👁️ Vista de Admin: Monto esperado en sistema:</span>
                <strong>${montoEsperado.toLocaleString()}</strong>
              </div>
            )}

            <form onSubmit={handleCierre} className={styles.form}>
              <div className={styles.inputGroup}>
                <label>Dinero físico contado ($)</label>
                <div className={styles.inputWithIcon}>
                  <FiDollarSign className={styles.inputIcon} />
                  <input 
                    type="number" 
                    className={`${styles.input} ${styles.inputLarge}`} 
                    value={montoDeclarado} 
                    onChange={(e) => setMontoDeclarado(e.target.value)} 
                    placeholder="0.00" 
                    required 
                  />
                </div>
              </div>

              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? "Procesando..." : "Confirmar Cierre de Caja"}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CierreCaja;