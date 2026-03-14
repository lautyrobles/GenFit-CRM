import React, { useState, useEffect } from "react";
import styles from "./Configuracion.module.css";
import Loader from "../../Components/Loader/Loader";
import {
  registerUser,
  getUsers,
  updateUser,
  deleteUser,
  toggleUserStatus,
} from "../../assets/services/authService";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../config/permissions"; // 👈 Crucial para la sincronización
import { Shield, Plus, X, Edit3, Trash2, CheckCircle, AlertCircle, Power, PowerOff, UserCog } from 'lucide-react';

const Configuracion = () => {
  const { user: currentUser } = useAuth();

  // --- Estados ---
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ msg: "", type: "" });
  const [editUser, setEditUser] = useState(null);
  
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "", apellido: "", dni: "", nombreUsuario: "", email: "", password: "", tipo: "",
  });

  // --- Mapeo de Roles UI <-> Sistema ---
  const mapRoleToTipo = (roleRaw) => {
    const role = roleRaw ? roleRaw.toUpperCase() : "";
    switch (role) {
      case ROLES.SUPER_ADMIN: return "Superadministrador";
      case ROLES.ADMIN: return "Administrador";
      case ROLES.SUPERVISOR: return "Supervisor";
      default: return "Personal";
    }
  };

  const mapTipoToRole = (tipo) => {
    switch (tipo) {
      case "Superadministrador": return ROLES.SUPER_ADMIN;
      case "Administrador": return ROLES.ADMIN;
      case "Supervisor": return ROLES.SUPERVISOR;
      default: return ROLES.SUPERVISOR;
    }
  };

  const getAllowedTipos = () => {
    const myRole = currentUser?.role?.toUpperCase();
    switch (myRole) {
      case ROLES.SUPER_ADMIN: return ["Superadministrador", "Administrador", "Supervisor"];
      case ROLES.ADMIN: return ["Administrador", "Supervisor"];
      default: return [];
    }
  };

  const allowedTipos = getAllowedTipos();
  const canCreateProfiles = allowedTipos.length > 0;

  const mostrarToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3000);
  };

  // --- Cargar Usuarios ---
  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      // Solo mostramos personal del staff (CRM)
      const staffRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPERVISOR];
      const filtered = data.filter(u => staffRoles.includes(u.role?.toUpperCase()));
      setUsuarios(filtered);
    } catch (e) {
      mostrarToast("Error al conectar con el servidor", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  // --- Handlers ---
  const limpiarFormulario = () => {
    setNuevoUsuario({ nombre: "", apellido: "", dni: "", nombreUsuario: "", email: "", password: "", tipo: allowedTipos[0] || "" });
    setErrors({});
    setEditUser(null);
  };

  const cerrarModal = () => {
    setMostrarFormulario(false);
    limpiarFormulario();
  };

  const abrirModalCrear = () => {
    limpiarFormulario();
    setMostrarFormulario(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevoUsuario(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const validarCampos = () => {
    const { nombre, apellido, dni, nombreUsuario, email, password, tipo } = nuevoUsuario;
    const newErrors = {};
    if (!nombre) newErrors.nombre = "Campo requerido";
    if (!apellido) newErrors.apellido = "Campo requerido";
    if (!dni) newErrors.dni = "Campo requerido";
    if (!nombreUsuario) newErrors.nombreUsuario = "Campo requerido";
    if (!email) newErrors.email = "Email requerido";
    if (!tipo) newErrors.tipo = "Seleccione un rol";
    if (!editUser && (!password || password.length < 6)) newErrors.password = "Mínimo 6 caracteres";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarCampos()) return;
    try {
      setSaving(true);
      const apiRole = mapTipoToRole(nuevoUsuario.tipo);

      if (editUser) {
        await updateUser(editUser.id, {
          first_name: nuevoUsuario.nombre,
          last_name: nuevoUsuario.apellido,
          dni: nuevoUsuario.dni,
          username: nuevoUsuario.nombreUsuario,
          email: nuevoUsuario.email,
          role: apiRole,
        });
        mostrarToast("Operador actualizado");
      } else {
        await registerUser(
          nuevoUsuario.nombre, nuevoUsuario.apellido, nuevoUsuario.email,
          nuevoUsuario.nombreUsuario, nuevoUsuario.password, apiRole, nuevoUsuario.dni 
        );
        mostrarToast("Operador registrado con éxito");
      }
      await cargarUsuarios();
      cerrarModal();
    } catch (err) {
      mostrarToast(err.message || "Error al procesar solicitud", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Deseas eliminar este acceso? Esta acción es permanente.")) return;
    try {
      await deleteUser(id);
      setUsuarios(prev => prev.filter(u => u.id !== id));
      mostrarToast("Usuario eliminado");
    } catch (err) { mostrarToast("Error al eliminar", "error"); }
  };

  const handleToggleEnabled = async (u) => {
    const newStatus = !u.enabled;
    try {
      await toggleUserStatus(u.id, newStatus);
      setUsuarios(prev => prev.map(x => (x.id === u.id ? { ...x, enabled: newStatus } : x)));
      mostrarToast(newStatus ? "Acceso restaurado" : "Acceso revocado");
    } catch (err) { mostrarToast("Error al cambiar estado", "error"); }
  };

  const startEdit = (u) => {
    setEditUser(u);
    setNuevoUsuario({
      nombre: u.first_name || "", apellido: u.last_name || "",
      dni: u.dni || "", email: u.email, nombreUsuario: u.username,
      tipo: mapRoleToTipo(u.role), password: "",
    });
    setMostrarFormulario(true);
  };

  return (
    <section className={styles.configLayout}>
      {toast.msg && (
        <div className={`${styles.toast} ${toast.type === "error" ? styles.toastError : styles.toastSuccess}`}>
          {toast.type === 'error' ? <AlertCircle size={18}/> : <CheckCircle size={18}/>}
          {toast.msg}
        </div>
      )}

      <div className={styles.topSection}>
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h2>Control de Accesos</h2>
            <p>Gestión del staff y niveles de seguridad del sistema.</p>
          </div>
          {canCreateProfiles && (
            <button className={styles.btnPrimary} onClick={abrirModalCrear}>
              <Plus size={16} /> Crear Operador
            </button>
          )}
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <h3><Shield size={18} className={styles.titleIcon}/> Personal Autorizado</h3>
        </div>

        <div className={styles.tableScrollArea}>
          {loading ? (
            <div className={styles.loaderArea}><Loader text="Cargando operadores..." /></div>
          ) : usuarios.length > 0 ? (
            <table className={styles.modernTable}>
              <thead>
                <tr>
                  <th>Operador</th>
                  <th>Credenciales</th>
                  <th>Nivel de Acceso</th>
                  <th>Estado</th>
                  <th className={styles.textRight}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => {
                  const targetRole = u.role?.toUpperCase();
                  const isMe = u.id === currentUser?.id;
                  
                  // Lógica de permisos visuales
                  const myRole = currentUser?.role?.toUpperCase();
                  const canEdit = myRole === ROLES.SUPER_ADMIN || (myRole === ROLES.ADMIN && (isMe || targetRole === ROLES.SUPERVISOR));
                  const canDelete = !isMe && (myRole === ROLES.SUPER_ADMIN || (myRole === ROLES.ADMIN && targetRole === ROLES.SUPERVISOR));

                  return (
                    <tr key={u.id} className={!u.enabled ? styles.rowDisabled : ""}>
                      <td>
                        <div className={styles.userProfile}>
                          <div className={`${styles.avatarMini} ${styles['avatar' + targetRole]}`}>
                            {(u.first_name?.[0] || '') + (u.last_name?.[0] || '')}
                          </div>
                          <div className={styles.cellName}>
                            <strong>{u.first_name} {u.last_name} {isMe && <span className={styles.itsMe}>(Tú)</span>}</strong>
                            <small>DNI: {u.dni || "-"}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.cellCreds}>
                          <span>{u.username}</span>
                          <small>{u.email}</small>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.roleBadge} ${styles['badge' + targetRole]}`}>
                          <Shield size={12}/> {mapRoleToTipo(u.role)}
                        </span>
                      </td>
                      <td>
                        <span className={u.enabled ? styles.statusActive : styles.statusInactive}>
                          {u.enabled ? "Habilitado" : "Revocado"}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          {canEdit && (
                            <button className={styles.btnAction} onClick={() => startEdit(u)} title="Editar"><Edit3 size={16} /></button>
                          )}
                          {canEdit && !isMe && (
                            <button className={`${styles.btnAction} ${u.enabled ? styles.btnPause : styles.btnPlay}`} onClick={() => handleToggleEnabled(u)}>
                              {u.enabled ? <PowerOff size={16}/> : <Power size={16}/>}
                            </button>
                          )}
                          {canDelete && (
                            <button className={`${styles.btnAction} ${styles.btnDelete}`} onClick={() => handleDelete(u.id)}><Trash2 size={16} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <UserCog size={48} className={styles.emptyIcon} />
              <p>No se encontraron operadores.</p>
            </div>
          )}
        </div>
      </div>

      {mostrarFormulario && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && cerrarModal()}>
          <div className={styles.largeModalCard}>
            <div className={styles.modalHeaderFlex}>
              <div>
                <h3 className={styles.modalTitle}>{editUser ? "Editar Operador" : "Nuevo Operador"}</h3>
                <p className={styles.modalSubtitle}>Configura los accesos del equipo.</p>
              </div>
              <button className={styles.closeIconButton} onClick={cerrarModal}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.formSplit}>
                <div className={styles.formColumn}>
                  <h4 className={styles.columnTitle}>Identidad</h4>
                  <div className={styles.formGroup}>
                    <label>Nombre</label>
                    <input type="text" name="nombre" value={nuevoUsuario.nombre} onChange={handleChange} className={errors.nombre ? styles.inputError : ""} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Apellido</label>
                    <input type="text" name="apellido" value={nuevoUsuario.apellido} onChange={handleChange} className={errors.apellido ? styles.inputError : ""} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>DNI</label>
                    <input type="text" name="dni" value={nuevoUsuario.dni} onChange={handleChange} className={errors.dni ? styles.inputError : ""} />
                  </div>
                </div>

                <div className={styles.formColumn}>
                  <h4 className={styles.columnTitle}>Accesos</h4>
                  <div className={styles.formGroup}>
                    <label>Nivel de Permisos</label>
                    <select name="tipo" value={nuevoUsuario.tipo} onChange={handleChange} className={errors.tipo ? styles.inputError : ""} disabled={!!editUser && editUser.id === currentUser.id}>
                      <option value="">Seleccionar rol...</option>
                      {allowedTipos.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>ID Usuario / Username</label>
                    <input type="text" name="nombreUsuario" value={nuevoUsuario.nombreUsuario} onChange={handleChange} className={errors.nombreUsuario ? styles.inputError : ""} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Email</label>
                    <input type="email" name="email" value={nuevoUsuario.email} onChange={handleChange} className={errors.email ? styles.inputError : ""} />
                  </div>
                  {!editUser && (
                    <div className={styles.formGroup}>
                      <label>Contraseña</label>
                      <input type="password" name="password" value={nuevoUsuario.password} onChange={handleChange} className={errors.password ? styles.inputError : ""} />
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.formFooter}>
                <button type="button" className={styles.btnCancelText} onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className={styles.btnSubmit} disabled={saving}>{saving ? "Guardando..." : "Guardar Operador"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Configuracion;