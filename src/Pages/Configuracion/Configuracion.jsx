import React, { useState, useEffect } from "react";
import styles from "./Configuracion.module.css";
import Loader from "../../Components/Loader/Loader";
import {
  registerUser,
  getUsers,
  updateUser,
  deleteUser,
  toggleUserStatus,
  logout
} from "../../assets/services/authService";
import { registrarMovimiento } from "../../assets/services/movimientosService";
import { useAuth } from "../../context/AuthContext";
import { 
  Shield, Plus, X, Edit3, Trash2, CheckCircle, 
  AlertCircle, Power, PowerOff, UserCog, LogOut 
} from 'lucide-react';

const Configuracion = () => {
  // 🎯 Traemos selectedGymId para el filtrado multi-tenant
  const { user, selectedGymId } = useAuth();
  
  const normalizeRole = (r) => {
    if (!r) return "";
    return r.replace("ROLE_", "").replace("_", "").toUpperCase();
  };

  const currentUserRole = normalizeRole(user?.role) || "";
  const isSuperAdmin = currentUserRole === "SUPERADMIN";

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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  // --- Helpers ---
  const totalPaginas = Math.ceil(usuarios.length / itemsPerPage);
  const usuariosPagina = usuarios.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const mostrarToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3000);
  };

  const mapRoleToTipo = (roleRaw) => {
    const role = normalizeRole(roleRaw);
    if (role === "SUPERADMIN") return "Superadministrador";
    if (role === "ADMIN") return "Administrador";
    if (role === "SUPERVISOR") return "Supervisor";
    return "Staff";
  };

  const mapTipoToRole = (tipo) => {
    if (tipo === "Superadministrador") return "SUPER_ADMIN";
    if (tipo === "Administrador") return "ADMIN";
    if (tipo === "Supervisor") return "SUPERVISOR";
    return "STAFF";
  };

  const getAllowedTipos = () => {
    if (currentUserRole === "SUPERADMIN") return ["Superadministrador", "Administrador", "Supervisor"];
    if (currentUserRole === "ADMIN") return ["Supervisor", "Staff"];
    return [];
  };

  const allowedTipos = getAllowedTipos();
  const canCreateProfiles = allowedTipos.length > 0;

  // --- Cargar Staff (Sincronizado con el Selector Global) ---
  useEffect(() => {
    const cargar = async () => {
      // 🛡️ Si no hay un gimnasio seleccionado (y no es carga inicial), salimos
      if (!selectedGymId) return;

      try {
        setLoading(true);
        // 🎯 Usamos selectedGymId en lugar de user.gym_id para permitir el "Modo Dios"
        const data = await getUsers(selectedGymId);
        
        const staffUsers = data.filter(u => {
          const r = normalizeRole(u.role);
          // Los SuperAdmins no se gestionan desde aquí, sino desde Gestión de Gimnasios
          return ["ADMIN", "SUPERVISOR", "STAFF", "ENCARGADO"].includes(r);
        });

        setUsuarios(staffUsers.map(u => ({ ...u, normalizedRole: normalizeRole(u.role) })));
      } catch (e) {
        mostrarToast("Error al cargar staff", "error");
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [selectedGymId]); // 🔄 Se vuelve a ejecutar cuando cambias de gimnasio en el Header

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevoUsuario(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const validarCampos = () => {
    const { nombre, apellido, email, tipo, password, nombreUsuario } = nuevoUsuario;
    const newErrors = {};
    if (!nombre) newErrors.nombre = "Campo obligatorio";
    if (!apellido) newErrors.apellido = "Campo obligatorio";
    if (!email) newErrors.email = "Email obligatorio";
    if (!nombreUsuario) newErrors.nombreUsuario = "ID de usuario obligatorio";
    if (!tipo) newErrors.tipo = "Selecciona un rango";
    if (!editUser && (!password || password.length < 6)) newErrors.password = "Mínimo 6 caracteres";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarCampos()) return;
    
    setSaving(true);
    try {
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

        setUsuarios(prev => prev.map(u => u.id === editUser.id ? {
          ...u, first_name: nuevoUsuario.nombre, last_name: nuevoUsuario.apellido,
          dni: nuevoUsuario.dni, username: nuevoUsuario.nombreUsuario,
          email: nuevoUsuario.email, role: apiRole, normalizedRole: normalizeRole(apiRole),
        } : u));

        await registrarMovimiento(user.id, "Configuración", "ACTUALIZACIÓN", `Modificó al operador ${nuevoUsuario.nombre}`, selectedGymId);
        mostrarToast("Cambios guardados con éxito");
      } else {
        const created = await registerUser(
            nuevoUsuario.nombre, 
            nuevoUsuario.apellido, 
            nuevoUsuario.email,
            nuevoUsuario.nombreUsuario, 
            nuevoUsuario.password, 
            apiRole, 
            nuevoUsuario.dni, 
            selectedGymId // 🎯 Se registra en el gimnasio actualmente seleccionado
        );

        setUsuarios(prev => [{ ...created, normalizedRole: normalizeRole(apiRole) }, ...prev]);
        await registrarMovimiento(user.id, "Configuración", "ALTA", `Registró al nuevo operador: ${nuevoUsuario.nombre}`, selectedGymId);
        mostrarToast("Operador registrado");
      }
      cerrarModal();
    } catch (err) {
      mostrarToast(err.message || "Error al procesar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (u) => {
    const newStatus = !u.enabled;
    try {
      await toggleUserStatus(u.id, newStatus);
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, enabled: newStatus } : x));
      mostrarToast(newStatus ? "Acceso restaurado" : "Acceso bloqueado");
    } catch (err) { mostrarToast("No se pudo cambiar el estado", "error"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este perfil? Se perderá el rastro del operador.")) return;
    try {
      await deleteUser(id);
      setUsuarios(prev => prev.filter(u => u.id !== id));
      mostrarToast("Perfil eliminado permanentemente");
    } catch (err) { mostrarToast("Error al eliminar", "error"); }
  };

  const startEdit = (u) => {
    setEditUser(u);
    setNuevoUsuario({
      nombre: u.first_name || "", 
      apellido: u.last_name || "",
      dni: u.dni || "", 
      email: u.email, 
      nombreUsuario: u.username,
      tipo: mapRoleToTipo(u.role), 
      password: "",
    });
    setMostrarFormulario(true);
  };

  const cerrarModal = () => { 
    setMostrarFormulario(false); 
    setEditUser(null); 
    setNuevoUsuario({ nombre: "", apellido: "", dni: "", nombreUsuario: "", email: "", password: "", tipo: "" });
    setErrors({});
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
            <h2>Configuración de Staff</h2>
            <p>Panel administrativo de <strong>{user?.gym_name || "la sucursal"}</strong></p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.btnLogout} onClick={logout}>
              <LogOut size={16} /> Salir
            </button>
            {canCreateProfiles && (
              <button className={styles.btnPrimary} onClick={() => setMostrarFormulario(true)}>
                <Plus size={16} /> Crear Operador
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <h3><Shield size={18} className={styles.titleIcon}/> Personal Autorizado</h3>
        </div>

        <div className={styles.tableScrollArea}>
          {loading ? (
            <div className={styles.loaderArea}><Loader text="Sincronizando perfiles..." /></div>
          ) : (
            <table className={styles.modernTable}>
              <thead>
                <tr>
                  <th>Nombre y Apellido</th>
                  <th>Credenciales</th>
                  <th>Rango</th>
                  <th>Estado</th>
                  <th className={styles.textRight}>Gestión</th>
                </tr>
              </thead>
              <tbody>
                {usuariosPagina.map((u) => {
                  const targetRole = normalizeRole(u.role);
                  const isMe = u.id === user?.id;
                  const canEdit = currentUserRole === "SUPER_ADMIN" || (currentUserRole === "ADMIN" && (isMe || targetRole === "SUPERVISOR" || targetRole === "STAFF"));

                  return (
                    <tr key={u.id} className={!u.enabled ? styles.rowDisabled : ""}>
                      <td>
                        <div className={styles.userProfile}>
                          <div className={`${styles.avatarMini} ${styles[`avatar${targetRole}`] || styles.avatarSupervisor}`}>
                            {(u.first_name?.[0] || '') + (u.last_name?.[0] || '')}
                          </div>
                          <div className={styles.cellName}>
                            <strong>{u.first_name} {u.last_name} {isMe && <span className={styles.itsMe}>TÚ</span>}</strong>
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
                        <span className={`${styles.roleBadge} ${styles[`badge${targetRole}`] || styles.badgeSupervisor}`}>
                          <Shield size={12}/> {mapRoleToTipo(targetRole)}
                        </span>
                      </td>
                      <td>
                        <span className={u.enabled ? styles.statusActive : styles.statusInactive}>
                          {u.enabled ? "Activo" : "Bloqueado"}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          {canEdit && (
                            <>
                              <button className={styles.btnAction} onClick={() => startEdit(u)} title="Editar"><Edit3 size={16} /></button>
                              {!isMe && (
                                <button 
                                  className={`${styles.btnAction} ${u.enabled ? styles.btnPause : styles.btnPlay}`} 
                                  onClick={() => handleToggleEnabled(u)}
                                  title={u.enabled ? "Deshabilitar" : "Habilitar"}
                                >
                                  {u.enabled ? <PowerOff size={16}/> : <Power size={16}/>}
                                </button>
                              )}
                              {!isMe && currentUserRole === "SUPER_ADMIN" && (
                                <button className={`${styles.btnAction} ${styles.btnDelete}`} onClick={() => handleDelete(u.id)} title="Borrar"><Trash2 size={16} /></button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
{usuarios.length > itemsPerPage && (
  <div className={styles.paginador}>
    <button 
      onClick={() => setCurrentPage(prev => prev - 1)} 
      disabled={currentPage === 1}
    >
      Anterior
    </button>
    <span className={styles.paginaInfo}>
      Página <strong>{currentPage}</strong> de {totalPaginas}
    </span>
    <button 
      onClick={() => setCurrentPage(prev => prev + 1)} 
      disabled={currentPage === totalPaginas}
    >
      Siguiente
    </button>
  </div>
)}
      </div>

      {mostrarFormulario && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && cerrarModal()}>
          <div className={styles.largeModalCard}>
            <div className={styles.modalHeaderFlex}>
              <div>
                <h3 className={styles.modalTitle}>{editUser ? "Editar Operador" : "Nuevo Operador de Staff"}</h3>
                <p className={styles.modalSubtitle}>Configura las credenciales y el nivel de acceso al CRM.</p>
              </div>
              <button className={styles.closeIconButton} onClick={cerrarModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.formSplit}>
                <div className={styles.formColumn}>
                  <h4 className={styles.columnTitle}>Datos de Identidad</h4>
                  <div className={styles.formGroup}>
                    <label>Nombre</label>
                    <input type="text" name="nombre" value={nuevoUsuario.nombre} onChange={handleChange} className={errors.nombre ? styles.inputError : ""} />
                    {errors.nombre && <small className={styles.errorText}>{errors.nombre}</small>}
                  </div>
                  <div className={styles.formGroup}>
                    <label>Apellido</label>
                    <input type="text" name="apellido" value={nuevoUsuario.apellido} onChange={handleChange} className={errors.apellido ? styles.inputError : ""} />
                    {errors.apellido && <small className={styles.errorText}>{errors.apellido}</small>}
                  </div>
                  <div className={styles.formGroup}>
                    <label>Número de DNI</label>
                    <input type="text" name="dni" value={nuevoUsuario.dni} onChange={handleChange} />
                  </div>
                </div>
                <div className={styles.formColumn}>
                  <h4 className={styles.columnTitle}>Credenciales y Rol</h4>
                  <div className={styles.formGroup}>
                    <label>Rango Administrativo</label>
                    <select name="tipo" value={nuevoUsuario.tipo} onChange={handleChange} className={errors.tipo ? styles.inputError : ""} disabled={editUser?.id === user.id}>
                      <option value="">Seleccionar rango...</option>
                      {allowedTipos.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>ID de Usuario (Username)</label>
                    <input type="text" name="nombreUsuario" value={nuevoUsuario.nombreUsuario} onChange={handleChange} className={errors.nombreUsuario ? styles.inputError : ""} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Email de Acceso</label>
                    <input type="email" name="email" value={nuevoUsuario.email} onChange={handleChange} className={errors.email ? styles.inputError : ""} />
                  </div>
                  {!editUser && (
                    <div className={styles.formGroup}>
                      <label>Contraseña Temporal</label>
                      <input type="password" name="password" value={nuevoUsuario.password} onChange={handleChange} className={errors.password ? styles.inputError : ""} placeholder="Min. 6 caracteres" />
                      {errors.password && <small className={styles.errorText}>{errors.password}</small>}
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.formFooter}>
                <button type="button" className={styles.btnCancelText} onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className={styles.btnSubmit} disabled={saving}>{saving ? "Procesando..." : "Guardar Operador"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Configuracion;