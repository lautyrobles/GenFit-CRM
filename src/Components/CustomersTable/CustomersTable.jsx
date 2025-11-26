import React, { useState, useEffect } from "react";
import styles from "./CustomersTable.module.css";
import Loader from "../../Components/Loader/Loader";

// 📦 Servicios (Ya conectados a Supabase)
import {
  obtenerClientes,
  crearCliente,
  actualizarCliente,
} from "../../assets/services/clientesService";

import { obtenerPlanes } from "../../assets/services/planesService";

const CustomersTable = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [planesDisponibles, setPlanesDisponibles] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const itemsPerPage = mostrarFormulario ? 6 : 7;

  // Estado del formulario (Adaptado a campos de Supabase)
  const [nuevoUsuario, setNuevoUsuario] = useState({
    dni: "",         // Antes document
    first_name: "",  // Antes name
    last_name: "",   // Antes lastName
    email: "",
    phone: "",       // Antes phoneNumber
    plan_id: "",     // ID del plan seleccionado
  });

  /* ===================================================
     🔹 Obtener clientes y planes
     =================================================== */
  const fetchData = async () => {
    try {
      setLoading(true);
      const [clientesData, planesData] = await Promise.all([
        obtenerClientes(),
        obtenerPlanes(),
      ]);
      setUsuarios(clientesData || []);
      setPlanesDisponibles(planesData || []);
    } catch (error) {
      console.error("❌ Error al cargar datos:", error);
      mostrarToast("Error de conexión con la base de datos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ===================================================
     🔹 Resolver nombre del plan
     =================================================== */
  const resolverNombrePlan = (u) => {
    // 1. Si el usuario ya trae el nombre (por alguna vista SQL futura)
    if (u.plan_name) return u.plan_name;

    // 2. Si tenemos el ID del plan en el usuario (simulado)
    const idBusqueda = u.plan_id || (u.subscription && u.subscription.plan_id);
    
    if (idBusqueda) {
      const plan = planesDisponibles.find((p) => p.id === idBusqueda);
      if (plan) return plan.name;
    }

    return "-";
  };

  /* ===================================================
     🔹 Manejo del formulario
     =================================================== */
  const limpiarFormulario = () => {
    setNuevoUsuario({
      dni: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      plan_id: "",
    });
  };

  const toggleFormulario = () => {
    if (editIndex !== null) return;
    setMostrarFormulario(!mostrarFormulario);
    limpiarFormulario();
  };

  const cancelarEdicion = () => {
    limpiarFormulario();
    setEditIndex(null);
    setMostrarFormulario(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevoUsuario({
      ...nuevoUsuario,
      [name]: value,
    });
  };

  const mostrarToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 2500);
  };

  /* ===================================================
     🔹 Validación
     =================================================== */
  const validarCampos = () => {
    if (
      !nuevoUsuario.dni ||
      !nuevoUsuario.first_name ||
      !nuevoUsuario.last_name ||
      !nuevoUsuario.email
    ) {
      mostrarToast("⚠️ DNI, Nombre, Apellido y Email son obligatorios.", "error");
      return false;
    }
    return true;
  };

  /* ===================================================
     🔹 Crear o actualizar cliente
     =================================================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarCampos()) return;

    try {
      setSaving(true);

      // Objeto mapeado para Supabase
      const clienteBody = {
        dni: nuevoUsuario.dni,
        first_name: nuevoUsuario.first_name,
        last_name: nuevoUsuario.last_name,
        email: nuevoUsuario.email,
        // Si tienes campo phone en DB, descomenta:
        // phone: nuevoUsuario.phone, 
        enabled: true, // Por defecto activo
        role: 'CLIENT'
        // Nota: El plan_id se debería manejar creando una fila en la tabla 'subscriptions'
      };

      if (editIndex !== null) {
        // --- ACTUALIZAR ---
        const usuarioEditado = usuarios[editIndex];
        // Usamos el ID (UUID) para actualizar, no el DNI
        await actualizarCliente(usuarioEditado.id, clienteBody);
        mostrarToast("✅ Usuario actualizado correctamente");
      } else {
        // --- CREAR ---
        await crearCliente(clienteBody);
        mostrarToast("✅ Usuario creado exitosamente");
      }

      await fetchData(); // Recargar tabla
      limpiarFormulario();
      setMostrarFormulario(false);
      setEditIndex(null);
    } catch (error) {
      console.error("❌ Error en el envío:", error);
      mostrarToast("❌ Error al guardar usuario. Verifica si el DNI o Email ya existen.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ===================================================
     🔹 Editar usuario (Cargar datos al form)
     =================================================== */
  const editarUsuario = (index) => {
    const cliente = usuarios[index];

    // Intentamos buscar el plan actual
    // Nota: Esto mejorará cuando hagamos el JOIN con subscriptions
    setNuevoUsuario({
      dni: cliente.dni || "",
      first_name: cliente.first_name || "",
      last_name: cliente.last_name || "",
      email: cliente.email || "",
      phone: cliente.phone || "",
      plan_id: cliente.plan_id || "", 
    });

    setEditIndex(index);
    setMostrarFormulario(true);
  };

  /* ===================================================
     🔹 Paginación
     =================================================== */
  const totalPaginas = Math.ceil(usuarios.length / itemsPerPage);
  const inicio = (currentPage - 1) * itemsPerPage;
  const usuariosPagina = usuarios.slice(inicio, inicio + itemsPerPage);

  const siguientePagina = () =>
    currentPage < totalPaginas && setCurrentPage(currentPage + 1);

  const anteriorPagina = () =>
    currentPage > 1 && setCurrentPage(currentPage - 1);

  /* ===================================================
     🔹 Render UI
     =================================================== */
  return (
    <>
      {toast.message && (
        <div
          className={`${styles.toast} ${
            toast.type === "error" ? styles.toastError : styles.toastSuccess
          }`}
        >
          {toast.message}
        </div>
      )}

      <section className={styles.customersContainer}>
        <div className={styles.header}>
          <h3>Gestión de Usuarios</h3>

          {editIndex === null ? (
            <button className={styles.btnCrear} onClick={toggleFormulario}>
              {mostrarFormulario ? "Cancelar" : "+ Crear usuario"}
            </button>
          ) : (
            <button className={styles.btnEliminar} onClick={cancelarEdicion}>
              Cancelar edición
            </button>
          )}
        </div>

        {/* Loaders */}
        {loading ? (
          <Loader text="Cargando clientes..." />
        ) : saving ? (
          <Loader text="Guardando cambios..." />
        ) : (
          <>
            {/* FORMULARIO */}
            {mostrarFormulario && (
              <form className={styles.formContainer} onSubmit={handleSubmit}>
                <input
                  type="text"
                  name="dni"
                  placeholder="DNI"
                  value={nuevoUsuario.dni}
                  onChange={handleChange}
                  // En Supabase a veces es mejor no editar DNI si es único, pero lo dejo habilitado
                />

                <input
                  type="text"
                  name="first_name"
                  placeholder="Nombre"
                  value={nuevoUsuario.first_name}
                  onChange={handleChange}
                />

                <input
                  type="text"
                  name="last_name"
                  placeholder="Apellido"
                  value={nuevoUsuario.last_name}
                  onChange={handleChange}
                />

                <input
                  type="email"
                  name="email"
                  placeholder="Correo electrónico"
                  value={nuevoUsuario.email}
                  onChange={handleChange}
                />

                <input
                  type="text"
                  name="phone"
                  placeholder="Teléfono"
                  value={nuevoUsuario.phone}
                  onChange={handleChange}
                />

                <select
                  name="plan_id"
                  value={nuevoUsuario.plan_id}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar plan...</option>
                  {planesDisponibles.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} — ${plan.price}
                    </option>
                  ))}
                </select>

                <button type="submit" className={styles.btnConfirmar}>
                  {editIndex !== null ? "Guardar cambios" : "Confirmar"}
                </button>
              </form>
            )}

            {/* TABLA */}
            {usuarios.length > 0 ? (
              <>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>DNI</th>
                      <th>Nombre</th>
                      <th>Apellido</th>
                      <th>Email</th>
                      <th>Teléfono</th>
                      <th>Plan</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {usuariosPagina.map((u, i) => {
                      const indexReal = inicio + i;
                      const isEditing = editIndex === indexReal;
                      // Supabase usa 'enabled' (boolean), lo mapeamos a texto
                      const statusTexto = u.enabled ? "Activo" : "Inactivo";
                      const isActive = u.enabled;

                      return (
                        <tr
                          key={u.id} // Usamos UUID como key
                          className={isEditing ? styles.editingRow : ""}
                        >
                          <td>{u.dni || "-"}</td>
                          <td>{u.first_name}</td>
                          <td>{u.last_name}</td>
                          <td>{u.email}</td>
                          <td>{u.phone || "-"}</td>

                          <td>{resolverNombrePlan(u)}</td>

                          <td>
                            <span
                              className={
                                isActive ? styles.active : styles.inactive
                              }
                            >
                              {statusTexto}
                            </span>
                          </td>

                          <td>
                            <button
                              className={styles.btnEditar}
                              onClick={() => editarUsuario(indexReal)}
                              disabled={
                                editIndex !== null && editIndex !== indexReal
                              }
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* PAGINADOR */}
                {usuarios.length > itemsPerPage && (
                  <div className={styles.paginador}>
                    <button
                      onClick={anteriorPagina}
                      disabled={currentPage === 1}
                      className={styles.btnPaginador}
                    >
                      ◀ Anterior
                    </button>

                    <span className={styles.paginaActual}>
                      Página {currentPage} de {totalPaginas}
                    </span>

                    <button
                      onClick={siguientePagina}
                      disabled={currentPage === totalPaginas}
                      className={styles.btnPaginador}
                    >
                      Siguiente ▶
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.placeholderBox}>
                <p>⚙️ No hay usuarios registrados todavía...</p>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
};

export default CustomersTable;