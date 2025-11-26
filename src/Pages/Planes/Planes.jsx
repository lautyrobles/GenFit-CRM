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
  const [planes, setPlanes] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  // Estado adaptado a la tabla 'plans' de Supabase
  const [nuevoPlan, setNuevoPlan] = useState({
    name: "",
    price: "",
    days_per_week_limit: "", // Vacío = Ilimitado
    entries_per_day_limit: 1, // Por defecto 1 entrada al día
    description: "",
    active: true,
  });

  const [toast, setToast] = useState({ message: "", type: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ================================
      🔹 Obtener planes
      ================================ */
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

  /* ================================
      🔹 Form handlers
      ================================ */
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Manejo especial para booleanos y números
    let finalValue = value;
    if (name === "active") finalValue = value === "true";

    setNuevoPlan((prev) => ({
      ...prev,
      [name]: finalValue,
    }));
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

  const toggleFormulario = () => {
    if (editIndex !== null) return;
    setMostrarFormulario((prev) => !prev);
    limpiarFormulario();
  };

  const cancelarEdicion = () => {
    limpiarFormulario();
    setMostrarFormulario(false);
  };

  const mostrarToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 2500);
  };

  const validarCampos = () => {
    if (!nuevoPlan.name || !nuevoPlan.price) {
      mostrarToast("⚠️ El nombre y el precio son obligatorios.", "error");
      return false;
    }
    return true;
  };

  /* ================================
      🔹 Crear / Actualizar
      ================================ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarCampos()) return;

    try {
      setSaving(true);

      // Preparamos el objeto para Supabase
      const body = {
        name: nuevoPlan.name,
        price: Number(nuevoPlan.price),
        // Si está vacío, mandamos NULL (significa ilimitado)
        days_per_week_limit: nuevoPlan.days_per_week_limit ? Number(nuevoPlan.days_per_week_limit) : null,
        entries_per_day_limit: Number(nuevoPlan.entries_per_day_limit) || 1,
        description: nuevoPlan.description || "",
        active: nuevoPlan.active,
      };

      if (editIndex !== null) {
        // --- ACTUALIZAR ---
        const plan = planes[editIndex];
        // Usamos el ID real de la base de datos
        await actualizarPlan(plan.id, body);
        mostrarToast("✔️ Plan actualizado correctamente");
      } else {
        // --- CREAR ---
        await crearPlan(body);
        mostrarToast("✔️ Plan creado exitosamente");
      }

      await fetchPlanes();
      cancelarEdicion();
    } catch (error) {
      mostrarToast("❌ Error al guardar el plan", "error");
      console.error("❌ ERROR SUBMIT:", error);
    } finally {
      setSaving(false);
    }
  };

  /* ================================
      🔹 Cambiar estado (Activar/Desactivar)
      ================================ */
  const toggleEstado = async (id, estadoActual) => {
    try {
      // estadoActual es booleano en Supabase
      const next = !estadoActual;
      await cambiarEstadoPlan(id, next);
      mostrarToast(next ? "Plan Activado" : "Plan Desactivado");
      await fetchPlanes();
    } catch (error) {
      mostrarToast("❌ Error al cambiar estado", "error");
    }
  };

  /* ================================
      🔹 Editar plan (Cargar datos)
      ================================ */
  const editarPlan = (index) => {
    const p = planes[index];

    setNuevoPlan({
      name: p.name,
      price: p.price,
      days_per_week_limit: p.days_per_week_limit || "", // Si es null, mostramos vacío
      entries_per_day_limit: p.entries_per_day_limit || 1,
      description: p.description || "",
      active: p.active,
    });

    setEditIndex(index);
    setMostrarFormulario(true);
  };

  /* ================================
      🔹 Render
      ================================ */
  return (
    <section className={styles.planesContainer}>
      {toast.message && (
        <div
          className={`${styles.toast} ${
            toast.type === "error" ? styles.toastError : styles.toastSuccess
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className={styles.header}>
        <div>
          <h2>Planes Disponibles</h2>
          <p>Configura las membresías y reglas de acceso (Básico vs Libre).</p>
        </div>

        {editIndex === null ? (
          <button className={styles.btnCrear} onClick={toggleFormulario}>
            {mostrarFormulario ? "Cancelar" : "+ Crear plan"}
          </button>
        ) : (
          <button className={styles.btnEliminar} onClick={cancelarEdicion}>
            Cancelar edición
          </button>
        )}
      </div>

      {loading ? (
        <Loader text="Cargando planes..." />
      ) : saving ? (
        <Loader text="Guardando cambios..." />
      ) : (
        <>
          {/* FORMULARIO */}
          {mostrarFormulario && (
            <form className={styles.formContainer} onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label>Nombre del Plan</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Ej: Pase Libre"
                  value={nuevoPlan.name}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Precio ($)</label>
                <input
                  type="number"
                  name="price"
                  placeholder="Ej: 25000"
                  value={nuevoPlan.price}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Días x Semana (Vacío = Ilimitado)</label>
                <input
                  type="number"
                  name="days_per_week_limit"
                  placeholder="Ej: 3 (Para Básico)"
                  value={nuevoPlan.days_per_week_limit}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Accesos x Día</label>
                <input
                  type="number"
                  name="entries_per_day_limit"
                  placeholder="Ej: 1"
                  value={nuevoPlan.entries_per_day_limit}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Descripción / Notas</label>
                <input
                  type="text"
                  name="description"
                  placeholder="Notas internas..."
                  value={nuevoPlan.description}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Estado Inicial</label>
                <select name="active" value={nuevoPlan.active} onChange={handleChange}>
                  <option value={true}>Activo</option>
                  <option value={false}>Inactivo</option>
                </select>
              </div>

              <button type="submit" className={styles.btnConfirmar}>
                {editIndex !== null ? "Guardar cambios" : "Confirmar"}
              </button>
            </form>
          )}

          {/* TABLA */}
          {planes.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Días/Semana</th>
                  <th>Accesos/Día</th>
                  <th>Precio</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {planes.map((p, i) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    
                    <td>
                      {p.days_per_week_limit 
                        ? `${p.days_per_week_limit} días` 
                        : <span style={{color: '#27ae60'}}>Ilimitado</span>}
                    </td>
                    
                    <td>{p.entries_per_day_limit || "∞"}</td>
                    
                    <td>${p.price}</td>
                    
                    <td>{p.description || "-"}</td>

                    <td>
                      <span className={p.active ? styles.active : styles.inactive}>
                        {p.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td>
                      <button className={styles.btnEditar} onClick={() => editarPlan(i)}>
                        Editar
                      </button>

                      <button
                        className={styles.btnEstado}
                        onClick={() => toggleEstado(p.id, p.active)}
                      >
                        {p.active ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.placeholderBox}>
              <p>📋 No hay planes registrados todavía</p>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default Planes;