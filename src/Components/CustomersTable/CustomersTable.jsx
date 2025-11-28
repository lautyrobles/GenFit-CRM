import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom"; 
import styles from "./CustomersTable.module.css";
import Loader from "../../Components/Loader/Loader";

// 📦 Servicios
import {
  obtenerClientes,
  crearCliente,
  actualizarCliente,
} from "../../assets/services/clientesService";

import { obtenerPlanes } from "../../assets/services/planesService";

// Iconos simples
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const CustomersTable = () => {
  const navigate = useNavigate(); 
  const [usuarios, setUsuarios] = useState([]);
  const [planesDisponibles, setPlanesDisponibles] = useState([]);
  
  // 🪟 Estado del Modal
  const [mostrarModal, setMostrarModal] = useState(false);
  
  const [editIndex, setEditIndex] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 🔍 Estado para el buscador
  const [busqueda, setBusqueda] = useState("");

  const itemsPerPage = 5; 

  // Estado del formulario
  const [nuevoUsuario, setNuevoUsuario] = useState({
    dni: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    plan_id: "",
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
      🔹 Lógica de Filtrado
     =================================================== */
  const usuariosFiltrados = useMemo(() => {
    if (!busqueda) return usuarios;
    const termino = busqueda.toLowerCase();
    
    return usuarios.filter((usuario) => {
      if (usuario.dni && usuario.dni.toString().toLowerCase().includes(termino)) {
        return true;
      }
      const nombreCompleto = `${usuario.first_name} ${usuario.last_name}`.toLowerCase();
      return nombreCompleto.includes(termino);
    });
  }, [usuarios, busqueda]);

  /* ===================================================
      🔹 Manejo de búsqueda
     =================================================== */
  const handleBusqueda = (e) => {
    setBusqueda(e.target.value);
    setCurrentPage(1);
  };

  /* ===================================================
      🔹 Resolver nombre del plan
     =================================================== */
  const resolverNombrePlan = (u) => {
    if (u.plan_name) return u.plan_name;
    const idBusqueda = u.plan_id || (u.subscription && u.subscription.plan_id);
    if (idBusqueda) {
      const plan = planesDisponibles.find((p) => p.id === idBusqueda);
      if (plan) return plan.name;
    }
    return "-";
  };

  /* ===================================================
      🔹 Manejo del formulario (Modal)
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

  const abrirModalCrear = () => {
    limpiarFormulario();
    setEditIndex(null);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    limpiarFormulario();
    setEditIndex(null);
    setMostrarModal(false);
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
      🔹 Validación y Submit
     =================================================== */
  const validarCampos = () => {
    if (!nuevoUsuario.dni || !nuevoUsuario.first_name || !nuevoUsuario.last_name || !nuevoUsuario.email) {
      mostrarToast("⚠️ DNI, Nombre, Apellido y Email son obligatorios.", "error");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarCampos()) return;

    try {
      setSaving(true);
      const clienteBody = {
        dni: nuevoUsuario.dni,
        first_name: nuevoUsuario.first_name,
        last_name: nuevoUsuario.last_name,
        email: nuevoUsuario.email,
        phone: nuevoUsuario.phone,
        enabled: true,
        role: 'CLIENT'
      };

      if (editIndex !== null) {
        // --- ACTUALIZAR ---
        // Buscamos el usuario real en la lista filtrada
        const usuarioEditado = usuariosFiltrados[editIndex];
        
        await actualizarCliente(usuarioEditado.id, {
            ...clienteBody,
            // Importante: enviar el plan_id si la API lo soporta directamente, 
            // o manejarlo aparte en subscriptions.
            plan_id: nuevoUsuario.plan_id 
        });
        mostrarToast("✅ Usuario actualizado correctamente");
      } else {
        // --- CREAR ---
        await crearCliente({
            ...clienteBody,
            plan_id: nuevoUsuario.plan_id 
        });
        mostrarToast("✅ Usuario creado exitosamente");
      }

      await fetchData();
      cerrarModal(); 
    } catch (error) {
      console.error("❌ Error en el envío:", error);
      mostrarToast("❌ Error al guardar usuario.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ===================================================
      🔹 Acciones de Usuario
     =================================================== */
  const editarUsuario = (u) => {
    // Buscamos el index correcto en la lista filtrada
    const indexEnFiltrados = usuariosFiltrados.findIndex(user => user.id === u.id);
    
    setNuevoUsuario({
      dni: u.dni || "",
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      email: u.email || "",
      phone: u.phone || "",
      plan_id: u.plan_id || "", 
    });

    setEditIndex(indexEnFiltrados);
    setMostrarModal(true); // Abrimos el modal
  };

  const verDetalleUsuario = (usuario) => {
    navigate("/clientes", { state: { clienteSeleccionado: usuario } });
  };

  /* ===================================================
      🔹 Paginación
     =================================================== */
  const totalPaginas = Math.ceil(usuariosFiltrados.length / itemsPerPage);
  const inicio = (currentPage - 1) * itemsPerPage;
  const usuariosPagina = usuariosFiltrados.slice(inicio, inicio + itemsPerPage);

  const siguientePagina = () => currentPage < totalPaginas && setCurrentPage(currentPage + 1);
  const anteriorPagina = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  /* ===================================================
      🔹 Render UI
     =================================================== */
  return (
    <>
      {toast.message && (
        <div className={`${styles.toast} ${toast.type === "error" ? styles.toastError : styles.toastSuccess}`}>
          {toast.message}
        </div>
      )}

      {/* ==========================================
          🪟 MODAL / POPUP (Nuevo Estilo)
         ========================================== */}
      {mostrarModal && (
        <div className={styles.modalOverlay} onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModal();
        }}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{editIndex !== null ? "Editar Usuario" : "Crear Usuario"}</h3>
              <button className={styles.modalCloseBtn} onClick={cerrarModal}>&times;</button>
            </div>

            <form className={styles.modalBody} onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label>DNI</label>
                <input type="text" name="dni" placeholder="DNI" value={nuevoUsuario.dni} onChange={handleChange} />
              </div>
              
              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label>Nombre</label>
                  <input type="text" name="first_name" placeholder="Nombre" value={nuevoUsuario.first_name} onChange={handleChange} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Apellido</label>
                  <input type="text" name="last_name" placeholder="Apellido" value={nuevoUsuario.last_name} onChange={handleChange} />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Email</label>
                <input type="email" name="email" placeholder="correo@ejemplo.com" value={nuevoUsuario.email} onChange={handleChange} />
              </div>

              <div className={styles.inputGroup}>
                <label>Teléfono</label>
                <input type="text" name="phone" placeholder="Teléfono" value={nuevoUsuario.phone} onChange={handleChange} />
              </div>
              
              <div className={styles.inputGroup}>
                <label>Plan</label>
                <select name="plan_id" value={nuevoUsuario.plan_id} onChange={handleChange}>
                  <option value="">Seleccionar plan...</option>
                  {planesDisponibles.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.name} — ${plan.price}</option>
                  ))}
                </select>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnCancelar} onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnGuardar} disabled={saving}>
                  {saving ? "Guardando..." : editIndex !== null ? "Guardar Cambios" : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          CONTENEDOR PRINCIPAL
         ========================================== */}
      <section className={styles.customersContainer}>
        <div className={styles.header}>
          <div className={styles.titleContainer}>
            <h3>Gestión de Usuarios</h3>
            <span className={styles.badgeCount}>{usuariosFiltrados.length} clientes</span>
          </div>

          <div className={styles.actionsHeader}>
            <div className={styles.searchContainer}>
              <span className={styles.searchIcon}>
                <SearchIcon />
              </span>
              <input 
                type="text" 
                placeholder="Buscar por DNI o Nombre..." 
                value={busqueda}
                onChange={handleBusqueda}
                className={styles.searchInput}
              />
            </div>

            <button className={styles.btnCrear} onClick={abrirModalCrear}>
              + Crear usuario
            </button>
          </div>
        </div>

        {/* Loaders */}
        {loading ? (
          <Loader text="Cargando clientes..." />
        ) : (
          <>
            {/* TABLA */}
            {usuariosFiltrados.length > 0 ? (
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
                    {usuariosPagina.map((u) => {
                      const originalIndex = usuarios.findIndex(user => user.id === u.id);
                      const isEditing = editIndex === originalIndex;
                      
                      const statusTexto = u.enabled ? "Activo" : "Inactivo";
                      const isActive = u.enabled;

                      return (
                        <tr key={u.id} className={isEditing ? styles.editingRow : ""}>
                          <td>{u.dni || "-"}</td>
                          <td>{u.first_name}</td>
                          <td>{u.last_name}</td>
                          <td>{u.email}</td>
                          <td>{u.phone || "-"}</td>
                          <td>{resolverNombrePlan(u)}</td>
                          <td>
                            <span className={isActive ? styles.active : styles.inactive}>
                              {statusTexto}
                            </span>
                          </td>

                          <td className={styles.actionsCell}>
                            <button
                              className={styles.btnVer}
                              onClick={() => verDetalleUsuario(u)}
                              title="Ver detalle"
                            >
                              <EyeIcon /> 
                              <span className={styles.btnText}>Ver</span>
                            </button>

                            <button
                              className={styles.btnEditar}
                              onClick={() => editarUsuario(u)}
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
                {usuariosFiltrados.length > itemsPerPage && (
                  <div className={styles.paginador}>
                    <button onClick={anteriorPagina} disabled={currentPage === 1} className={styles.btnPaginador}>
                      ◀ Anterior
                    </button>
                    <span className={styles.paginaActual}>
                      Página {currentPage} de {totalPaginas}
                    </span>
                    <button onClick={siguientePagina} disabled={currentPage === totalPaginas} className={styles.btnPaginador}>
                      Siguiente ▶
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.placeholderBox}>
                <p>🔍 No se encontraron usuarios.</p>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
};

export default CustomersTable;