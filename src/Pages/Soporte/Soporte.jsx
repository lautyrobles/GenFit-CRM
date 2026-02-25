import React, { useState } from 'react';
import styles from './Soporte.module.css';
import { MessageCircle, ExternalLink, ShieldCheck, Clock } from 'lucide-react';

const Soporte = () => {
  const [categoria, setCategoria] = useState('General');

  const handleWhatsAppRedirect = () => {
    const telefono = "549123456789"; // Reemplaza con tu número real
    const mensaje = `Hola! Necesito soporte técnico para FitSEO CRM.%0A*Categoría:* ${categoria}`;
    window.open(`https://wa.me/${telefono}?text=${mensaje}`, '_blank');
  };

  return (
    <section className={styles.soporteWrapper}>
      <div className={styles.soporteContainer}>
        <div className={styles.infoSection}>
          <div className={styles.iconHeader}>
            <MessageCircle size={40} className={styles.mainIcon} />
          </div>
          <h2>Centro de Soporte</h2>
          <p>
            ¿Tenés algún inconveniente? Resolvemos tus dudas de forma directa a través de nuestro canal de WhatsApp.
          </p>

          <div className={styles.featuresGrid}>
            <div className={styles.featureItem}>
              <Clock size={18} />
              <span>Respuesta en menos de 1h</span>
            </div>
            <div className={styles.featureItem}>
              <ShieldCheck size={18} />
              <span>Atención personalizada</span>
            </div>
          </div>
        </div>

        <div className={styles.actionBox}>
          <div className={styles.fieldGroup}>
            <label>¿Sobre qué es tu consulta?</label>
            <select 
              value={categoria} 
              onChange={(e) => setCategoria(e.target.value)}
              className={styles.selectInput}
            >
              <option value="General">Consulta General</option>
              <option value="Pagos">Problemas con Pagos</option>
              <option value="Usuarios">Acceso de Usuarios</option>
              <option value="Tecnico">Error en el Sistema</option>
            </select>
          </div>

          <button onClick={handleWhatsAppRedirect} className={styles.btnWhatsApp}>
            <MessageCircle size={20} />
            Contactar Soporte
            <ExternalLink size={16} className={styles.linkIcon} />
          </button>
          
          <span className={styles.footerNote}>
            Atención de Lunes a Viernes • 09:00 a 18:00 hs
          </span>
        </div>
      </div>
    </section>
  );
};

export default Soporte;