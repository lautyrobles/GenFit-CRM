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
import { Shield, Plus, X, Edit3, Trash2, CheckCircle, AlertCircle, Power, PowerOff, UserCog } from 'lucide-react';

const Configuracion = () => {
  const { user } = useAuth();
  const storedUser = JSON.parse(localStorage.getItem("fitseoUser") || "null");

  const normalizeRole = (r) => r ? r.replace("ROLE_", "").toUpperCase() : "";
  const currentUserRole = normalizeRole(user?.role) || normalizeRole(storedUser?.role) || "";

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
  const itemsPerPage = 5;

  // Lógica de Paginación
  const totalPaginas = Math.ceil(usuarios.length / itemsPerPage);
  const usuariosPagina = usuarios.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  // --- Mapeo de Roles UI <-> API ---
  const mapRoleToTipo = (roleRaw) => {
    const role = normalizeRole(roleRaw);
    switch (role) {
      case "SUPER_ADMIN": return "Superadministrador";
      case "ADMIN": return "Administrador";
      case "SUPERVISOR": return "Supervisor";
      default: return role;
    }
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
    switch (currentUserRole) {
      case "SUPER_ADMIN": return ["Superadministrador", "Administrador", "Supervisor"];
      case "ADMIN": return ["Supervisor"];
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
  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const data = await getUsers();
        
        // Filtramos solo el personal del staff
        const staffUsers = data.filter(u => {
          const r = normalizeRole(u.role);
          return ["SUPER_ADMIN", "ADMIN", "SUPERVISOR"].includes(r);
        });

        const mappendUsers = staffUsers.map((u) => ({ 
          ...u, 
          normalizedRole: normalizeRole(u.role) 
        }));

        setUsuarios(mappendUsers);

        // 🎯 LÓGICA DE AUTO-APERTURA (Opcional, por consistencia con Clientes)
        const autoOpenId = location.state?.autoOpenUserId;
        if (autoOpenId) {
          const userToEdit = mappendUsers.find(u => u.id === autoOpenId);
          if (userToEdit) {
            startEdit(userToEdit);
            window.history.replaceState({}, document.title);
          }
        }

      } catch (e) {
        console.error(e);
        mostrarToast("Error al cargar la lista de staff", "error");
      } finally {
        setLoading(false);
      }
    };
    
    cargar();
  }, []);

  // --- Form Handlers ---
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

  // --- Submit (Crear/Editar) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarCampos()) return;
    try {
      setSaving(true);
      const apiRole = mapTipoToRole(nuevoUsuario.tipo);

      if (editUser) {
        await updateUser(editUser.id, {
          first_name: nuevoUsuario.nombre, last_name: nuevoUsuario.apellido,
          dni: nuevoUsuario.dni, username: nuevoUsuario.nombreUsuario,
          email: nuevoUsuario.email, role: apiRole,
        });

        setUsuarios((prev) => prev.map((u) => u.id === editUser.id ? {
            ...u, first_name: nuevoUsuario.nombre, last_name: nuevoUsuario.apellido,
            dni: nuevoUsuario.dni, username: nuevoUsuario.nombreUsuario,
            email: nuevoUsuario.email, role: apiRole, normalizedRole: normalizeRole(apiRole),
          } : u
        ));
        mostrarToast("Usuario actualizado correctamente");
      } else {
        const created = await registerUser(
            nuevoUsuario.nombre, nuevoUsuario.apellido, nuevoUsuario.email,
            nuevoUsuario.nombreUsuario, nuevoUsuario.password, apiRole, nuevoUsuario.dni 
        );

        setUsuarios((prev) => [
          { ...created, first_name: nuevoUsuario.nombre, last_name: nuevoUsuario.apellido, normalizedRole: normalizeRole(apiRole) },
          ...prev,
        ]);
        mostrarToast("Perfil creado correctamente");
      }
      cerrarModal();
    } catch (err) { mostrarToast(err.message || "Error al guardar", "error"); } 
    finally { setSaving(false); }
  };

  // --- Acciones Usuario ---
  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que querés eliminar este perfil? Esta acción no se puede deshacer.")) return;
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
            <div className={styles.loaderArea}><Loader text="Verificando identidades..." /></div>
          ) : usuarios.length > 0 ? (
            <table className={styles.modernTable}>
              <thead>
                <tr>
                  <th>Operador</th>
                  <th>Credenciales</th>
                  <th>Nivel de Acceso</th>
                  <th>Estado</th>
                  <th className={styles.textRight}>Acciones de Seguridad</th>
                </tr>
              </thead>
              <tbody>
                {usuariosPagina.map((u) => {
                  const targetRole = normalizeRole(u.role);
                  const isMe = u.id === user.id;
                  
                  let canEdit = false;
                  let canDelete = false;

                  if (currentUserRole === "SUPER_ADMIN") {
                      canEdit = true;
                      canDelete = !isMe;
                  } else if (currentUserRole === "ADMIN") {
                      if (isMe) {
                          canEdit = true;
                          canDelete = false;
                      } else if (targetRole === "SUPERVISOR") {
                          canEdit = true;
                          canDelete = true;
                      }
                  }

                  return (
                    <tr key={u.id} className={!u.enabled ? styles.rowDisabled : ""}>
                      <td>
                        <div className={styles.userProfile}>
                          <div className={`${styles.avatarMini} ${
                            targetRole === 'SUPER_ADMIN' ? styles.avatarSuper : 
                            targetRole === 'ADMIN' ? styles.avatarAdmin : styles.avatarSupervisor
                          }`}>
                            {(u.first_name?.[0] || u.name?.[0] || '') + (u.last_name?.[0] || u.lastName?.[0] || '')}
                          </div>
                          <div className={styles.cellName}>
                            <strong>{u.first_name || u.name} {u.last_name || u.lastName} {isMe && <span className={styles.itsMe}>(Tú)</span>}</strong>
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
                        <span className={`${styles.roleBadge} ${
                          targetRole === 'SUPER_ADMIN' ? styles.badgeSuper : 
                          targetRole === 'ADMIN' ? styles.badgeAdmin : styles.badgeSupervisor
                        }`}>
                          <Shield size={12}/> {mapRoleToTipo(targetRole)}
                        </span>
                      </td>
                      <td>
                        <span className={u.enabled ? styles.statusActive : styles.statusInactive}>
                          {u.enabled ? "Habilitado" : "Acceso Revocado"}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          {canEdit && (
                            <button className={styles.btnAction} onClick={() => startEdit(u)} title="Modificar Permisos">
                              <Edit3 size={16} />
                            </button>
                          )}
                          
                          {canEdit && !isMe && (
                            <button 
                              className={`${styles.btnAction} ${u.enabled ? styles.btnPause : styles.btnPlay}`} 
                              onClick={() => handleToggleEnabled(u)}
                              title={u.enabled ? "Revocar Acceso" : "Restaurar Acceso"}
                            >
                              {u.enabled ? <PowerOff size={16}/> : <Power size={16}/>}
                            </button>
                          )}
                          
                          {canDelete && (
                            <button className={`${styles.btnAction} ${styles.btnDelete}`} onClick={() => handleDelete(u.id)} title="Eliminar Registro">
                              <Trash2 size={16} />
                            </button>
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
              <p>No hay personal registrado en el sistema.</p>
            </div>
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
              Página {currentPage} de {totalPaginas}
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
                <h3 className={styles.modalTitle}>{editUser ? "Modificar Credenciales" : "Alta de Operador"}</h3>
                <p className={styles.modalSubtitle}>Asigna roles y accesos seguros para el equipo.</p>
              </div>
              <button className={styles.closeIconButton} onClick={cerrarModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} id="userForm">
              <div className={styles.formSplit}>
                
                {/* Columna Izquierda: Identidad */}
                <div className={styles.formColumn}>
                  <h4 className={styles.columnTitle}>Identidad Personal</h4>
                  <div className={styles.formGroup}>
                    <label>Nombre</label>
                    <input type="text" name="nombre" value={nuevoUsuario.nombre} onChange={handleChange} className={errors.nombre ? styles.inputError : ""} autoFocus />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Apellido</label>
                    <input type="text" name="apellido" value={nuevoUsuario.apellido} onChange={handleChange} className={errors.apellido ? styles.inputError : ""} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Documento (DNI)</label>
                    <input type="text" name="dni" value={nuevoUsuario.dni} onChange={handleChange} className={errors.dni ? styles.inputError : ""} />
                  </div>
                </div>

                {/* Columna Derecha: Sistema */}
                <div className={styles.formColumn}>
                  <h4 className={styles.columnTitle}>Accesos al Sistema</h4>
                  
                  <div className={styles.formGroup}>
                    <label>Nivel de Permisos</label>
                    <select name="tipo" value={nuevoUsuario.tipo} onChange={handleChange} className={errors.tipo ? styles.inputError : ""} disabled={!!editUser && editUser.id === user.id}>
                      <option value="">Seleccionar rol...</option>
                      {allowedTipos.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                      {editUser && editUser.id === user.id && !allowedTipos.includes(mapRoleToTipo(editUser.role)) && (
                          <option value={mapRoleToTipo(editUser.role)}>{mapRoleToTipo(editUser.role)}</option>
                      )}
                    </select>
                  </div>

                  <div className={styles.rowTwo}>
                    <div className={styles.formGroup}>
                      <label>ID Usuario</label>
                      <input type="text" name="nombreUsuario" value={nuevoUsuario.nombreUsuario} onChange={handleChange} className={errors.nombreUsuario ? styles.inputError : ""} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Correo Electrónico</label>
                      <input type="email" name="email" value={nuevoUsuario.email} onChange={handleChange} className={errors.email ? styles.inputError : ""} />
                    </div>
                  </div>

                  {!editUser && (
                    <div className={styles.formGroup}>
                      <label>Contraseña Maestra</label>
                      <input type="password" name="password" value={nuevoUsuario.password} onChange={handleChange} className={errors.password ? styles.inputError : ""} placeholder="Mínimo 6 caracteres" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className={styles.formFooter}>
                <button type="button" className={styles.btnCancelText} onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className={styles.btnSubmit} disabled={saving}>
                  {saving ? "Procesando..." : (editUser ? "Actualizar Accesos" : "Generar Credencial")}
                </button>
              </div>
            </form>
            
          </div>
        </div>
      )}
    </section>
  );
};

export default Configuracion;