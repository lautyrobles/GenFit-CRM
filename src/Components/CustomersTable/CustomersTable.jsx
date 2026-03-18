import React, { useState, useEffect, useMemo } from "react";
import styles from "./CustomersTable.module.css";
import Loader from "../../Components/Loader/Loader";

// 📦 Servicios
import {
  obtenerClientes,
  crearCliente,
  actualizarCliente,
} from "../../assets/services/clientesService";
import { obtenerPlanes } from "../../assets/services/planesService";
import { crearAlertaMedica } from "../../assets/services/medicalService";

// Iconos refinados
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const CustomersTable = ({ onSelectCliente }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [planesDisponibles, setPlanesDisponibles] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const itemsPerPage = 6; 

  const [nuevoUsuario, setNuevoUsuario] = useState({
    dni: "", first_name: "", last_name: "", email: "", phone: "", plan_id: "",
  });

  const [tieneAlerta, setTieneAlerta] = useState(false);
  const [alertaMedica, setAlertaMedica] = useState({
    name: "", severity: "Baja", observation: ""
  });

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
      mostrarToast("Error de conexión", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getPlanClass = (planName) => {
    if (!planName) return styles.planDefault;
    const name = planName.toLowerCase();
    if (name.includes('estudiantil')) return styles.planEstudiantil;
    if (name.includes('basico') || name.includes('básico')) return styles.planBasico;
    if (name.includes('libre')) return styles.planLibre;
    return styles.planDefault;
  };

  const usuariosFiltrados = useMemo(() => {
    if (!busqueda) return usuarios;
    const termino = busqueda.toLowerCase();
    return usuarios.filter((u) => {
      const full = `${u.first_name} ${u.last_name}`.toLowerCase();
      return (u.dni?.toString().includes(termino) || full.includes(termino));
    });
  }, [usuarios, busqueda]);

  const resolverNombrePlan = (u) => {
    if (u.plans?.name) return u.plans.name;
    const idPlan = u.plan_id; 
    const planEncontrado = planesDisponibles.find((p) => String(p.id) === String(idPlan));
    return planEncontrado ? planEncontrado.name : "Sin Plan";
  };

  // 👉 LÓGICA SIMPLIFICADA: Solo lee el booleano 'condition'
  const resolverEstadoCuota = (u) => {
    const estaActivoDB = u.enabled === true || u.condition === "true" || u.condition === "TRUE"; 
    return estaActivoDB 
      ? { texto: "Activo", clase: styles.active } 
      : { texto: "Inactivo", clase: styles.inactive };
  };

  const abrirModalCrear = () => {
    setNuevoUsuario({ dni: "", first_name: "", last_name: "", email: "", phone: "", plan_id: "" });
    setTieneAlerta(false);
    setAlertaMedica({ name: "", severity: "Baja", observation: "" });
    setEditIndex(null);
    setMostrarModal(true);
  };

  const cerrarModal = () => { setMostrarModal(false); setEditIndex(null); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevoUsuario({ ...nuevoUsuario, [name]: value });
  };

  const mostrarToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editIndex !== null) {
        const userId = usuariosPagina[editIndex].id;
        await actualizarCliente(userId, nuevoUsuario);
        mostrarToast("✅ Usuario actualizado");
      } else {
        const clienteCreado = await crearCliente(nuevoUsuario);
        
        if (clienteCreado && tieneAlerta && alertaMedica.name) {
          await crearAlertaMedica({
            user_id: clienteCreado.id,
            name: alertaMedica.name,
            severity: alertaMedica.severity,
            observation: alertaMedica.observation
          });
        }
        mostrarToast("✅ Usuario creado");
      }
      await fetchData();
      cerrarModal();
    } catch (error) {
      mostrarToast("❌ Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const editarUsuario = (u) => {
    setNuevoUsuario({ ...u, plan_id: u.plan_id || "" });
    const relativeIndex = usuariosPagina.findIndex(user => user.id === u.id);
    setEditIndex(relativeIndex);
    setMostrarModal(true);
  };

  const totalPaginas = Math.ceil(usuariosFiltrados.length / itemsPerPage);
  const usuariosPagina = usuariosFiltrados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      {toast.message && (
        <div className={`${styles.toast} ${toast.type === "error" ? styles.toastError : styles.toastSuccess}`}>
          {toast.message}
        </div>
      )}

      {mostrarModal && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && cerrarModal()}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{editIndex !== null ? "Editar Cliente" : "Nuevo Cliente"}</h3>
              <button className={styles.modalCloseBtn} onClick={cerrarModal}>&times;</button>
            </div>
            <form className={styles.modalBody} onSubmit={handleSubmit}>
              <div className={styles.inputGroup}><label>DNI</label><input type="text" name="dni" value={nuevoUsuario.dni} onChange={handleChange} required /></div>
              <div className={styles.row}>
                <div className={styles.inputGroup}><label>Nombre</label><input type="text" name="first_name" value={nuevoUsuario.first_name} onChange={handleChange} required /></div>
                <div className={styles.inputGroup}><label>Apellido</label><input type="text" name="last_name" value={nuevoUsuario.last_name} onChange={handleChange} required /></div>
              </div>
              <div className={styles.inputGroup}><label>Email</label><input type="email" name="email" value={nuevoUsuario.email} onChange={handleChange} required /></div>
              <div className={styles.inputGroup}><label>Teléfono</label><input type="text" name="phone" value={nuevoUsuario.phone} onChange={handleChange} /></div>
              <div className={styles.inputGroup}>
                <label>Plan</label>
                <select name="plan_id" value={nuevoUsuario.plan_id} onChange={handleChange} required>
                  <option value="">Seleccionar plan...</option>
                  {planesDisponibles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {editIndex === null && (
                <div className={styles.medicalSection}>
                  <div className={styles.medicalToggle}>
                    <input type="checkbox" id="medicalCheck" checked={tieneAlerta} onChange={(e) => setTieneAlerta(e.target.checked)} />
                    <label htmlFor="medicalCheck">¿Posee alertas médicas u observaciones?</label>
                  </div>
                  {tieneAlerta && (
                    <div className={styles.medicalFields}>
                      <div className={styles.row}>
                        <div className={styles.inputGroup}>
                          <label>Condición / Alerta</label>
                          <input type="text" placeholder="Ej: Asma, Diabetes..." value={alertaMedica.name} onChange={(e) => setAlertaMedica({...alertaMedica, name: e.target.value})} required={tieneAlerta} />
                        </div>
                        <div className={styles.inputGroup}>
                          <label>Gravedad</label>
                          <select value={alertaMedica.severity} onChange={(e) => setAlertaMedica({...alertaMedica, severity: e.target.value})}>
                            <option value="Baja">Baja (Amarillo)</option>
                            <option value="Media">Media (Naranja)</option>
                            <option value="Alta">Alta (Rojo)</option>
                          </select>
                        </div>
                      </div>
                      <div className={styles.inputGroup}>
                        <label>Observación</label>
                        <textarea rows="2" placeholder="Detalles sobre la condición..." value={alertaMedica.observation} onChange={(e) => setAlertaMedica({...alertaMedica, observation: e.target.value})} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnCancelar} onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className={styles.btnGuardar} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className={styles.customersContainer}>
        <div className={styles.header}>
          <h3 className={styles.sectionTitle}>Gestión de Usuarios</h3>
          <div className={styles.actionsHeader}>
            <div className={styles.searchContainer}>
              <span className={styles.searchIcon}><SearchIcon /></span>
              <input type="text" placeholder="Buscar cliente..." value={busqueda} onChange={(e) => {setBusqueda(e.target.value); setCurrentPage(1);}} className={styles.searchInput} />
            </div>
            <button className={styles.btnCrear} onClick={abrirModalCrear}>+ Nuevo usuario</button>
          </div>
        </div>

        {loading ? <div className={styles.loaderCenter}><Loader text="Sincronizando socios..." /></div> : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nombre y Apellido</th>
                    <th>DNI</th>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosPagina.map((u) => {
                    const nombrePlan = resolverNombrePlan(u);
                    const estado = resolverEstadoCuota(u);
                    
                    return (
                      <tr key={u.id}>
                        <td className={styles.nameCell}>
                          <div className={styles.avatar}>{u.first_name[0]}{u.last_name[0]}</div>
                          <div className={styles.nameText}>
                            <p>{u.first_name} {u.last_name}</p>
                            <span>Cliente</span>
                          </div>
                        </td>
                        <td>{u.dni || "-"}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`${styles.planBadge} ${getPlanClass(nombrePlan)}`}>{nombrePlan}</span>
                        </td>
                        <td>
                          <span className={estado.clase}>{estado.texto}</span>
                        </td>
                        <td className={styles.actionsCell}>
                          <button className={styles.actionBtn} onClick={() => onSelectCliente(u)} title="Ver Perfil"><EyeIcon /></button>
                          <button className={styles.actionBtn} onClick={() => editarUsuario(u)} title="Editar"><EditIcon /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={styles.paginador}>
              <button onClick={() => setCurrentPage(prev => prev - 1)} disabled={currentPage === 1}>Anterior</button>
              <span className={styles.paginaInfo}>Página {currentPage} de {totalPaginas}</span>
              <button onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage === totalPaginas}>Siguiente</button>
            </div>
          </>
        )}
      </section>
    </>
  );
};

export default CustomersTable;