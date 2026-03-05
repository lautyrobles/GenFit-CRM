import React from 'react';
import styles from './Receipt.module.css';

const Receipt = ({ pago, cliente }) => {
  return (
    <div className={styles.receiptContainer}>
      <div className={styles.header}>
        <h1>GYM SPARKLE</h1>
        <p>Comprobante de Pago</p>
      </div>
      <div className={styles.divider} />
      <div className={styles.details}>
        <p><strong>Fecha:</strong> {new Date(pago.payment_date).toLocaleString()}</p>
        <p><strong>Socio:</strong> {cliente.first_name} {cliente.last_name}</p>
        <p><strong>DNI:</strong> {cliente.dni}</p>
        <p><strong>Concepto:</strong> Pago de Membresía</p>
        <p><strong>Método:</strong> {pago.payment_method}</p>
      </div>
      <div className={styles.divider} />
      <div className={styles.totalRow}>
        <span>TOTAL RECIBIDO</span>
        <span className={styles.amount}>${Number(pago.amount).toLocaleString()}</span>
      </div>
      <div className={styles.footer}>
        <p>¡Gracias por entrenar con nosotros!</p>
        <p>Vence el: {new Date(pago.due_date).toLocaleDateString()}</p>
      </div>
    </div>
  );
};