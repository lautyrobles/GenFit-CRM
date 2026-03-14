import React, { useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from '../../assets/services/supabaseClient'; 
import { useAuth } from '../../context/AuthContext';
import styles from './AccessNotifier.module.css';

const AccessNotifier = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Si no hay nadie logueado (en el CRM), no escuchamos nada
    if (!user) return;

    const canalAsistencias = supabase
      .channel('ingresos_tiempo_real')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'access_logs' },
        async (payload) => {
          const nuevoIngreso = payload.new;

          // Buscamos el nombre del cliente
          const { data: userData } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', nuevoIngreso.user_id)
            .single();

          const nombreCliente = userData ? `${userData.first_name} ${userData.last_name}` : 'Un cliente';
          const accesoValido = nuevoIngreso.access_granted !== false;

          // Disparamos el Toast con el diseño del CSS Module
          toast.custom((t) => (
            <div className={`${styles.toastWrapper} ${t.visible ? styles.visible : styles.hidden} ${accesoValido ? styles.borderSuccess : styles.borderError}`}>
              
              <div className={`${styles.iconContainer} ${accesoValido ? styles.iconSuccess : styles.iconError}`}>
                {accesoValido ? '🙌' : '⛔'}
              </div>
              
              <div className={styles.textContainer}>
                <span className={styles.title}>
                  {accesoValido ? 'Ingreso Registrado' : 'Acceso Denegado'}
                </span>
                <span className={styles.subtitle}>
                  {accesoValido ? (
                    <><strong className={styles.name}>{nombreCliente}</strong> acaba de dar el presente.</>
                  ) : (
                    <>Problemas con el ingreso de <strong className={styles.name}>{nombreCliente}</strong>.</>
                  )}
                </span>
              </div>

            </div>
          ), { 
            position: 'top-right', 
            duration: 5000 
          });
        }
      )
      .subscribe();

    // Limpiamos la suscripción cuando se desmonta
    return () => {
      supabase.removeChannel(canalAsistencias);
    };
  }, [user]);

  // Este componente devuelve el Toaster, que es el contenedor donde se dibujan los pop-ups
  return <Toaster />;
};

export default AccessNotifier;