import React, { useEffect, useState } from "react";
import styles from "./Planes.module.css";
import Loader from "../../Components/Loader/Loader";
import {
  obtenerPlanes,
  crearPlan,
  actualizarPlan,
  cambiarEstadoPlan,
} from "../../assets/services/planesService";

const Planes = () => {
  // --- ESTADOS ---
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // UI States
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "" });

  // Form State
  const [nuevoPlan, setNuevoPlan] = useState({
    name: "",
    price: "",
    days_per_week_limit: "", // Vacío = Ilimitado
    entries_per_day_limit: 1,
    description: "",
    active: true,
  });

  // --- CARGA INICIAL ---
  const fetchPlanes = async () => {
    try {
      setLoading(true);
      const data = await obtenerPlanes();
      setPlanes(data || []);
    } catch (error) {
      console.error(error);
      mostrarToast("❌ Error al cargar los planes", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanes();
  }, []);

  // --- HELPERS ---
  const mostrarToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };

  const limpiarFormulario = () => {
    setNuevoPlan({
      name: "",
      price: "",
      days_per_week_limit: "",
      entries_per_day_limit: 1,
      description: "",
      active: true,
    });
    setEditIndex(null);
  };

  // --- HANDLERS UI ---
  const abrirModalCrear = () => {
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
    
    // Tratamiento para selects booleanos o números
    if (name === "active") finalValue = value === "true";
    
    setNuevoPlan((prev) => ({
      ...prev,
      [name]: finalValue,
    }));
  };

  // --- LOGICA CRUD ---
  const validarCampos = () => {
    if (!nuevoPlan.name || !nuevoPlan.price) {
      mostrarToast("⚠️ Nombre y Precio son obligatorios.", "error");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarCampos()) return;

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
        // UPDATE
        const plan = planes[editIndex];
        await actualizarPlan(plan.id, body);
        mostrarToast("Plan actualizado correctamente ✨");
      } else {
        // CREATE
        await crearPlan(body);
        mostrarToast("Nuevo plan creado con éxito 🚀");
      }

      await fetchPlanes();
      cerrarModal();

    } catch (error) {
      mostrarToast("Hubo un error al guardar.", "error");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const editarPlan = (index) => {
    const p = planes[index];
    setNuevoPlan({
      name: p.name,
      price: p.price,
      days_per_week_limit: p.days_per_week_limit || "",
      entries_per_day_limit: p.entries_per_day_limit || 1,
      description: p.description || "",
      active: p.active,
    });
    setEditIndex(index);
    setMostrarFormulario(true);
  };

  const toggleEstado = async (id, estadoActual) => {
    try {
      const next = !estadoActual;
      await cambiarEstadoPlan(id, next);
      mostrarToast(next ? "Plan Activado" : "Plan Desactivado");
      fetchPlanes(); // Recarga silenciosa
    } catch (error) {
      mostrarToast("No se pudo cambiar el estado", "error");
    }
  };

  // --- RENDER ---
  return (
    <section className={styles.planesContainer}>
      
      {/* TOAST NOTIFICATIONS */}
      {toast.message && (
        <div className={`${styles.toast} ${toast.type === "error" ? styles.toastError : styles.toastSuccess}`}>
          {toast.message}
        </div>
      )}

      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h2>Planes y Membresías</h2>
          <p>Define los productos, precios y límites de acceso para tus clientes.</p>
        </div>
        
        <button className={styles.btnPrimary} onClick={abrirModalCrear}>
          + Crear Nuevo Plan
        </button>
      </div>

      {/* MODAL POPUP (Overlay + Content) */}
      {mostrarFormulario && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <h3>{editIndex !== null ? "📝 Editando Plan" : "✨ Nuevo Plan"}</h3>
              <button className={styles.btnClose} onClick={cerrarModal}>&times;</button>
            </div>

            {/* Modal Body (Form) */}
            <div className={styles.modalBody}>
              <form onSubmit={handleSubmit} id="planForm">
                <div className={styles.formGrid}>
                  
                  {/* Grupo 1: Info Básica */}
                  <div className={styles.formGroup}>
                    <label>Nombre del Plan</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Ej: Pase Libre"
                      value={nuevoPlan.name}
                      onChange={handleChange}
                      autoFocus
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Precio ($)</label>
                    <input
                      type="number"
                      name="price"
                      placeholder="0.00"
                      value={nuevoPlan.price}
                      onChange={handleChange}
                      className={styles.inputPrice}
                    />
                  </div>

                  {/* Grupo 2: Límites */}
                  <div className={styles.formGroup}>
                    <label>Días por semana <small>(Vacío = Ilimitado)</small></label>
                    <input
                      type="number"
                      name="days_per_week_limit"
                      placeholder="∞"
                      value={nuevoPlan.days_per_week_limit}
                      onChange={handleChange}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Entradas por día</label>
                    <input
                      type="number"
                      name="entries_per_day_limit"
                      value={nuevoPlan.entries_per_day_limit}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Grupo 3: Extras */}
                  <div className={styles.formGroup}>
                    <label>Descripción / Nota</label>
                    <input
                      type="text"
                      name="description"
                      placeholder="Detalles breves..."
                      value={nuevoPlan.description}
                      onChange={handleChange}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Estado Inicial</label>
                    <select name="active" value={nuevoPlan.active} onChange={handleChange}>
                      <option value={true}>🟢 Activo</option>
                      <option value={false}>🔴 Inactivo</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={cerrarModal}>
                Cancelar
              </button>
              <button type="submit" form="planForm" className={styles.btnPrimary} disabled={saving}>
                {saving ? "Guardando..." : (editIndex !== null ? "Guardar Cambios" : "Crear Plan")}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL (GRILLA) */}
      {loading ? (
        <div className={styles.loaderWrapper}><Loader text="Cargando catálogo..." /></div>
      ) : (
        <>
          {planes.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📋</div>
              <h3>Aún no hay planes creados</h3>
              <p>Comenzá creando tu primer plan de suscripción para registrar pagos.</p>
              <button className={styles.btnPrimary} onClick={abrirModalCrear}>Crear primer plan</button>
            </div>
          ) : (
            <div className={styles.gridPlanes}>
              {planes.map((p, i) => (
                <div key={p.id} className={`${styles.cardPlan} ${!p.active ? styles.cardInactive : ''}`}>
                  
                  {/* Card Header */}
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitle}>
                      <h4>{p.name}</h4>
                      <span className={`${styles.badge} ${p.active ? styles.badgeActive : styles.badgeInactive}`}>
                        {p.active ? "ACTIVO" : "INACTIVO"}
                      </span>
                    </div>
                    <div className={styles.cardPrice}>
                      <span className={styles.currency}>$</span>
                      {Number(p.price).toLocaleString()}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className={styles.cardBody}>
                    <p className={styles.cardDesc}>{p.description || "Sin descripción"}</p>
                    
                    <div className={styles.featuresList}>
                      <div className={styles.featureItem}>
                        <span className={styles.icon}>📅</span>
                        <span>
                          {p.days_per_week_limit 
                            ? <strong>{p.days_per_week_limit} días</strong> 
                            : <strong className={styles.infinity}>Acceso Ilimitado</strong>}
                           {' '}/ semana
                        </span>
                      </div>
                      <div className={styles.featureItem}>
                        <span className={styles.icon}>🚪</span>
                        <span><strong>{p.entries_per_day_limit}</strong> accesos / día</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className={styles.cardFooter}>
                    <button className={styles.btnIcon} onClick={() => editarPlan(i)} title="Editar">
                      ✏️ Editar
                    </button>
                    
                    <button 
                      className={`${styles.btnIcon} ${p.active ? styles.btnDestructive : styles.btnConstructive}`} 
                      onClick={() => toggleEstado(p.id, p.active)}
                      title={p.active ? "Desactivar" : "Activar"}
                    >
                      {p.active ? "🚫 Desactivar" : "✅ Activar"}
                    </button>
                  </div>
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