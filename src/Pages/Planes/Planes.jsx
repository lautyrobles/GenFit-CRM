import React, { useEffect, useState } from "react";
import styles from "./Planes.module.css";
import Loader from "../../Components/Loader/Loader";
import { Plus, X, Edit3, Power, PowerOff, CheckCircle, AlertCircle, LayoutDashboard } from 'lucide-react';

import {
  obtenerPlanes,
  crearPlan,
  actualizarPlan,
  cambiarEstadoPlan,
} from "../../assets/services/planesService";
import { useAuth } from "../../context/AuthContext";

const Planes = () => {
  const { user } = useAuth();

  // --- LÓGICA DE PERMISOS ---
  const role = (user?.role || "").toUpperCase();
  const isReadOnly = role === "SUPERVISOR";

  // --- ESTADOS ---
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "" });

  const [nuevoPlan, setNuevoPlan] = useState({
    name: "", price: "", days_per_week_limit: "", entries_per_day_limit: 1, description: "", active: true,
  });

  // --- CARGA INICIAL (Actualizado con gym_id) ---
const fetchPlanes = async () => {
  if (!user?.gym_id) {
    console.warn("⚠️ No hay gym_id en el usuario logueado:", user);
    return;
  }

  try {
    setLoading(true);
    console.log("🔍 Intentando buscar planes para el Gym ID:", user.gym_id);
    
    const data = await obtenerPlanes(user.gym_id);
    
    console.log("✅ Datos recibidos de la DB:", data);
    setPlanes(data || []);
  } catch (error) {
    console.error("❌ Error capturado en el componente:", error);
    mostrarToast("Error al cargar los planes", "error");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchPlanes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.gym_id]); // Re-ejecutar si el gym_id cambia o se carga

  // --- HELPERS ---
  const mostrarToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };

  const limpiarFormulario = () => {
    setNuevoPlan({
      name: "", price: "", days_per_week_limit: "", entries_per_day_limit: 1, description: "", active: true,
    });
    setEditIndex(null);
  };

  const getPlanClass = (planName) => {
    if (!planName) return styles.planDefault;
    const name = planName.toLowerCase();
    if (name.includes('estudiantil')) return styles.planEstudiantil;
    if (name.includes('basico') || name.includes('básico')) return styles.planBasico;
    if (name.includes('libre')) return styles.planLibre;
    return styles.planDefault;
  };

  // --- HANDLERS UI ---
  const abrirModalCrear = () => {
    if (isReadOnly) return;
    limpiarFormulario();
    setMostrarFormulario(true);
  };

  const cerrarModal = () => {
    setMostrarFormulario(false);
    limpiarFormulario();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === "active") finalValue = value === "true";
    setNuevoPlan((prev) => ({ ...prev, [name]: finalValue }));
  };

  // --- LOGICA CRUD (Actualizado con gym_id) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (!nuevoPlan.name || !nuevoPlan.price) {
      mostrarToast("Nombre y Precio son obligatorios.", "error");
      return;
    }

    try {
      setSaving(true);
      const body = {
        name: nuevoPlan.name,
        price: Number(nuevoPlan.price),
        days_per_week_limit: nuevoPlan.days_per_week_limit ? Number(nuevoPlan.days_per_week_limit) : null,
        entries_per_day_limit: Number(nuevoPlan.entries_per_day_limit) || 1,
        description: nuevoPlan.description || "",
        active: nuevoPlan.active,
      };

      if (editIndex !== null) {
        await actualizarPlan(planes[editIndex].id, body);
        mostrarToast("Plan actualizado correctamente");
      } else {
        // 🎯 IMPORTANTE: Pasamos el gym_id al crear para etiquetarlo
        await crearPlan(body, user.gym_id);
        mostrarToast("Nuevo plan creado con éxito");
      }

      await fetchPlanes();
      cerrarModal();
    } catch (error) {
      mostrarToast("Hubo un error al guardar.", "error");
    } finally {
      setSaving(false);
    }
  };

  const editarPlan = (index) => {
    if (isReadOnly) return;
    const p = planes[index];
    setNuevoPlan({
      name: p.name, price: p.price, days_per_week_limit: p.days_per_week_limit || "", entries_per_day_limit: p.entries_per_day_limit || 1, description: p.description || "", active: p.active,
    });
    setEditIndex(index);
    setMostrarFormulario(true);
  };

  const toggleEstado = async (id, estadoActual) => {
    if (isReadOnly) return;
    try {
      const next = !estadoActual;
      await cambiarEstadoPlan(id, next);
      mostrarToast(next ? "Plan Activado" : "Plan Desactivado");
      fetchPlanes(); 
    } catch (error) {
      mostrarToast("No se pudo cambiar el estado", "error");
    }
  };

  return (
    <section className={styles.planesContainer}>
      
      {toast.message && (
        <div className={`${styles.toast} ${toast.type === "error" ? styles.toastError : styles.toastSuccess}`}>
          {toast.type === 'error' ? <AlertCircle size={18}/> : <CheckCircle size={18}/>}
          {toast.message}
        </div>
      )}

      <div className={styles.header}>
        <div className={styles.headerText}>
          <h2>Suscripciones y Planes</h2>
          <p>Define los productos, precios y límites de acceso para tus clientes.</p>
        </div>
        
        {!isReadOnly && (
          <button className={styles.btnPrimary} onClick={abrirModalCrear}>
            <Plus size={16}/> Crear Plan
          </button>
        )}
      </div>

      {mostrarFormulario && !isReadOnly && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && cerrarModal()}>
          <div className={styles.modalContent}>
             <div className={styles.modalHeader}>
               <h3>{editIndex !== null ? "Editar Configuración de Plan" : "Nuevo Plan de Suscripción"}</h3>
               <button className={styles.btnClose} onClick={cerrarModal}><X size={20}/></button>
             </div>
             <div className={styles.modalBody}>
               <form onSubmit={handleSubmit} id="planForm">
                 <div className={styles.formGrid}>
                   <div className={styles.formGroup}>
                     <label>Nombre del Plan</label>
                     <input type="text" name="name" placeholder="Ej: Pase Libre Premium" value={nuevoPlan.name} onChange={handleChange} autoFocus />
                   </div>
                   <div className={styles.formGroup}>
                     <label>Precio Final ($)</label>
                     <input type="number" name="price" placeholder="0.00" value={nuevoPlan.price} onChange={handleChange} className={styles.inputPrice} />
                   </div>
                   <div className={styles.formGroup}>
                     <label>Días por semana <small>(Vacío = Ilimitado)</small></label>
                     <input type="number" name="days_per_week_limit" placeholder="∞" value={nuevoPlan.days_per_week_limit} onChange={handleChange} />
                   </div>
                   <div className={styles.formGroup}>
                     <label>Entradas por día</label>
                     <input type="number" name="entries_per_day_limit" value={nuevoPlan.entries_per_day_limit} onChange={handleChange} />
                   </div>
                   <div className={styles.formGroupFull}>
                     <label>Descripción / Notas comerciales</label>
                     <input type="text" name="description" placeholder="Ej: Incluye acceso a todas las sedes..." value={nuevoPlan.description} onChange={handleChange} />
                   </div>
                   <div className={styles.formGroup}>
                     <label>Estado del Plan</label>
                     <select name="active" value={nuevoPlan.active} onChange={handleChange}>
                       <option value={true}>🟢 Visible y Activo</option>
                       <option value={false}>🔴 Oculto / Inactivo</option>
                     </select>
                   </div>
                 </div>
               </form>
             </div>
             <div className={styles.modalFooter}>
               <button type="button" className={styles.btnSecondary} onClick={cerrarModal}>Cancelar</button>
               <button type="submit" form="planForm" className={styles.btnPrimarySave} disabled={saving}>
                 {saving ? "Guardando..." : (editIndex !== null ? "Actualizar Plan" : "Publicar Plan")}
               </button>
             </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.loaderWrapper}><Loader text="Sincronizando planes..." /></div>
      ) : (
        <>
          {planes.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><LayoutDashboard size={48} strokeWidth={1}/></div>
              <h3>Aún no hay planes configurados</h3>
              <p>Comenzá creando tu primer producto para poder registrar ingresos.</p>
              {!isReadOnly && <button className={styles.btnPrimary} onClick={abrirModalCrear}>Configurar Primer Plan</button>}
            </div>
          ) : (
            <div className={styles.gridPlanes}>
              {planes.map((p, i) => (
                <div key={p.id} className={`${styles.cardPlan} ${!p.active ? styles.cardInactive : ''}`}>
                  <div className={styles.cardHeader}>
                    <h4 className={`${styles.cardName} ${getPlanClass(p.name)}`}>{p.name}</h4>
                    <div className={styles.cardPriceBox}>
                      <span className={styles.currency}>$</span>
                      <span className={styles.priceNumber}>{Number(p.price).toLocaleString()}</span>
                      <span className={styles.pricePeriod}>/mes</span>
                    </div>
                  </div>

                  <div className={styles.hrGradient}></div>

                  <div className={styles.cardBody}>
                    <p className={styles.cardDesc}>{p.description || "Plan estándar de entrenamiento."}</p>
                    <ul className={styles.featuresList}>
                      <li className={styles.featureItem}>
                        <CheckCircle size={16} className={styles.iconCheck}/>
                        <span>
                          {p.days_per_week_limit 
                            ? <><strong>{p.days_per_week_limit} días</strong> de acceso semanal</>
                            : <><strong>Acceso Ilimitado</strong> toda la semana</>}
                        </span>
                      </li>
                      <li className={styles.featureItem}>
                        <CheckCircle size={16} className={styles.iconCheck}/>
                        <span>Permite <strong>{p.entries_per_day_limit}</strong> {p.entries_per_day_limit === 1 ? 'ingreso' : 'ingresos'} por día</span>
                      </li>
                    </ul>
                  </div>

                  {!isReadOnly && (
                    <div className={styles.cardFooter}>
                      <button className={styles.btnEdit} onClick={() => editarPlan(i)} title="Editar Configuración">
                        <Edit3 size={16} /> Modificar
                      </button>
                      <button 
                        className={`${styles.btnToggle} ${p.active ? styles.btnOff : styles.btnOn}`} 
                        onClick={() => toggleEstado(p.id, p.active)}
                      >
                        {p.active ? <><PowerOff size={16}/> Pausar</> : <><Power size={16}/> Reactivar</>}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default Planes;