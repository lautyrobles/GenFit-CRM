import React, { useState, useEffect } from "react";
import styles from "./Configuracion.module.css";
import Loader from "../../Components/Loader/Loader";
import {
  registerUser,
  getUsers,
  updateUser,
  deleteUser,
  toggleUserStatus,
} from "../../assets/services/staffService";
import { useAuth } from "../../context/AuthContext";
import { Shield, Plus, X, Edit3, Trash2, CheckCircle, AlertCircle, Power, PowerOff, UserCog } from 'lucide-react';

const Configuracion = () => {
  const { user } = useAuth();
  const storedUser = JSON.parse(localStorage.getItem("fitseoUser") || "null");

  const normalizeRole = (r) => r ? r.replace("ROLE_", "").toUpperCase() : "";
  const currentUserRole = normalizeRole(user?.role) || normalizeRole(storedUser?.role) || "";
  
  const isSuperAdminLogueado = currentUserRole === "SUPER_ADMIN" || currentUserRole === "SUPERADMINISTRADOR";
  const isAdminLogueado = currentUserRole === "ADMIN" || currentUserRole === "ADMINISTRADOR";

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
  const itemsPerPage = 5;

  const totalPaginas = Math.ceil(usuarios.length / itemsPerPage);
  const usuariosPagina = usuarios.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  const mapRoleToTipo = (roleRaw) => {
    const role = normalizeRole(roleRaw);
    if (role === "SUPER_ADMIN" || role === "SUPERADMINISTRADOR") return "Superadministrador";
    if (role === "ADMIN" || role === "ADMINISTRADOR") return "Administrador";
    if (role === "SUPERVISOR") return "Supervisor";
    return role;
  };

  const mapTipoToRole = (tipo) => {
    switch (tipo) {
      case "Superadministrador": return "SUPER_ADMIN";
      case "Administrador": return "ADMIN";
      case "Supervisor": return "SUPERVISOR";
      default: return "CLIENT";
    }
  };

  const getAllowedTipos = () => {
    if (isSuperAdminLogueado || isAdminLogueado) {
      return ["Administrador", "Supervisor"];
    }
    return [];
  };

  const allowedTipos = getAllowedTipos();
  const canCreateProfiles = allowedTipos.length > 0;

  const mostrarToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3000);
  };

  const cargar = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      const staffUsers = data.filter(u => {
        const r = normalizeRole(u.role);
        return ["SUPER_ADMIN", "SUPERADMINISTRADOR", "ADMIN", "ADMINISTRADOR", "SUPERVISOR"].includes(r);
      });
      const mappendUsers = staffUsers.map((u) => ({ 
        ...u, 
        normalizedRole: normalizeRole(u.role) 
      }));
      setUsuarios(mappendUsers);
    } catch (e) {
      mostrarToast("Error al cargar la lista de staff", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const cerrarModal = () => {
    setMostrarFormulario(false);
    setNuevoUsuario({ nombre: "", apellido: "", dni: "", nombreUsuario: "", email: "", password: "", tipo: allowedTipos[0] || "" });
    setErrors({});
    setEditUser(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevoUsuario((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validarCampos = () => {
    const { nombre, apellido, dni, nombreUsuario, email, password, tipo } = nuevoUsuario;
    const newErrors = {};
    if (!nombre) newErrors.nombre = "Requerido.";
    if (!apellido) newErrors.apellido = "Requerido.";
    if (!dni) newErrors.dni = "Requerido.";
    if (!nombreUsuario) newErrors.nombreUsuario = "Requerido.";
    if (!email) newErrors.email = "Requerido.";
    if (!tipo) newErrors.tipo = "Requerido.";
    if (!editUser && !password) newErrors.password = "Requerido.";
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
        // ... lógica de update igual ...
      } else {
        // PASAMOS TODO EL OBJETO nuevoUsuario y agregamos el apiRole
        await registerUser({
            ...nuevoUsuario,
            role: apiRole
        });
        mostrarToast("Perfil creado correctamente");
      }
      
      // IMPORTANTE: Recargar después de crear
      if (typeof cargar === 'function') {
        await cargar(); 
      } else {
        window.location.reload(); // Fallback por si la función cargar no está al alcance
      }
      
      cerrarModal();
    } catch (err) { 
      // Si el error es 422, suele ser por email duplicado o password corta
      const msg = err.message.includes("already registered") 
        ? "El email ya está registrado" 
        : "Error al crear: revisa los datos";
      mostrarToast(msg, "error"); 
    } 
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que querés eliminar este perfil?")) return;
    try {
      await deleteUser(id);
      setUsuarios((prev) => prev.filter((u) => u.id !== id));
      mostrarToast("Usuario eliminado");
    } catch (err) { mostrarToast("Error al eliminar", "error"); }
  };

  const handleToggleEnabled = async (u) => {
    const newStatus = !u.enabled;
    try {
      await toggleUserStatus(u.id, newStatus);
      setUsuarios((prev) => prev.map((x) => (x.id === u.id ? { ...x, enabled: newStatus } : x)));
      mostrarToast(newStatus ? "Usuario habilitado" : "Usuario deshabilitado");
    } catch (err) { mostrarToast("Error al cambiar estado", "error"); }
  };

  const startEdit = (u) => {
    setEditUser(u);
    setNuevoUsuario({
      nombre: u.first_name || u.name || "", apellido: u.last_name || u.lastName || "",
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
            <p>Gestión del staff, niveles de seguridad y permisos de la plataforma.</p>
          </div>
          {canCreateProfiles && (
            <button className={styles.btnPrimary} onClick={() => setMostrarFormulario(true)}><Plus size={16} /> Crear Operador</button>
          )}
        </div>
      </div>
      <div className={styles.tableCard}>
        <div className={styles.tableToolbar}><h3><Shield size={18} className={styles.titleIcon}/> Personal Autorizado</h3></div>
        <div className={styles.tableScrollArea}>
          {loading ? (
            <div className={styles.loaderArea}><Loader text="Verificando identidades..." /></div>
          ) : usuarios.length > 0 ? (
            <table className={styles.modernTable}>
              <thead>
                <tr><th>Operador</th><th>Credenciales</th><th>Nivel de Acceso</th><th>Estado</th><th className={styles.textRight}>Acciones</th></tr>
              </thead>
              <tbody>
                {usuariosPagina.map((u) => {
                  const targetRole = normalizeRole(u.role);
                  const isMe = u.id === user?.id;
                  const targetIsSuperAdmin = targetRole === "SUPER_ADMIN" || targetRole === "SUPERADMINISTRADOR";
                  let canEdit = isSuperAdminLogueado || (isAdminLogueado && !targetIsSuperAdmin);
                  let canDelete = (isSuperAdminLogueado && !isMe) || (isAdminLogueado && !targetIsSuperAdmin && !isMe);
                  
                  return (
                    <tr key={u.id} className={!u.enabled ? styles.rowDisabled : ""}>
                      <td>
                        <div className={styles.userProfile}>
                          <div className={`${styles.avatarMini} ${targetIsSuperAdmin ? styles.avatarSuper : (targetRole === 'ADMIN' || targetRole === 'ADMINISTRADOR') ? styles.avatarAdmin : styles.avatarSupervisor}`}>
                            {(u.first_name?.[0] || '') + (u.last_name?.[0] || '')}
                          </div>
                          <div className={styles.cellName}>
                            <strong>{u.first_name} {u.last_name} {isMe && <span className={styles.itsMe}>(Tú)</span>}</strong>
                            <small>DNI: {u.dni || "-"}</small>
                          </div>
                        </div>
                      </td>
                      <td><div className={styles.cellCreds}><span>{u.username}</span><small>{u.email}</small></div></td>
                      <td><span className={`${styles.roleBadge} ${targetIsSuperAdmin ? styles.badgeSuper : (targetRole === 'ADMIN' || targetRole === 'ADMINISTRADOR') ? styles.badgeAdmin : styles.badgeSupervisor}`}><Shield size={12}/> {mapRoleToTipo(targetRole)}</span></td>
                      <td><span className={u.enabled ? styles.statusActive : styles.statusInactive}>{u.enabled ? "Habilitado" : "Revocado"}</span></td>
                      <td>
                        <div className={styles.actions}>
                          {canEdit && <button className={styles.btnAction} onClick={() => startEdit(u)}><Edit3 size={16} /></button>}
                          {canEdit && !isMe && <button className={`${styles.btnAction} ${u.enabled ? styles.btnPause : styles.btnPlay}`} onClick={() => handleToggleEnabled(u)}>{u.enabled ? <PowerOff size={16}/> : <Power size={16}/>}</button>}
                          {canDelete && <button className={`${styles.btnAction} ${styles.btnDelete}`} onClick={() => handleDelete(u.id)}><Trash2 size={16} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (<div className={styles.emptyState}><UserCog size={48} className={styles.emptyIcon} /><p>No hay personal registrado.</p></div>)}
        </div>
      </div>
      {mostrarFormulario && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && cerrarModal()}>
          <div className={styles.largeModalCard}>
            <div className={styles.modalHeaderFlex}>
              <div><h3>{editUser ? "Modificar" : "Alta"} de Operador</h3><p className={styles.modalSubtitle}>Asigna roles y accesos seguros.</p></div>
              <button className={styles.closeIconButton} onClick={cerrarModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} id="userForm">
              <div className={styles.formSplit}>
                <div className={styles.formColumn}>
                  <h4 className={styles.columnTitle}>Identidad</h4>
                  <div className={styles.formGroup}><label>Nombre</label><input type="text" name="nombre" value={nuevoUsuario.nombre} onChange={handleChange} required /></div>
                  <div className={styles.formGroup}><label>Apellido</label><input type="text" name="apellido" value={nuevoUsuario.apellido} onChange={handleChange} required /></div>
                  <div className={styles.formGroup}><label>DNI</label><input type="text" name="dni" value={nuevoUsuario.dni} onChange={handleChange} required /></div>
                </div>
                <div className={styles.formColumn}>
                  <h4 className={styles.columnTitle}>Sistema</h4>
                  <div className={styles.formGroup}><label>Rol</label><select name="tipo" value={nuevoUsuario.tipo} onChange={handleChange} disabled={!!editUser && editUser.id === user.id}><option value="">Seleccionar...</option>{allowedTipos.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}</select></div>
                  <div className={styles.rowTwo}>
                    <div className={styles.formGroup}><label>ID</label><input type="text" name="nombreUsuario" value={nuevoUsuario.nombreUsuario} onChange={handleChange} required /></div>
                    <div className={styles.formGroup}><label>Email</label><input type="email" name="email" value={nuevoUsuario.email} onChange={handleChange} required /></div>
                  </div>
                  {!editUser && <div className={styles.formGroup}><label>Clave</label><input type="password" name="password" value={nuevoUsuario.password} onChange={handleChange} required /></div>}
                </div>
              </div>
              <div className={styles.formFooter}><button type="button" className={styles.btnCancelText} onClick={cerrarModal}>Cancelar</button><button type="submit" className={styles.btnSubmit} disabled={saving}>{saving ? "Guardando..." : "Confirmar"}</button></div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Configuracion;