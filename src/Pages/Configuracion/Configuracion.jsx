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

const Configuracion = () => {
  const { user } = useAuth();

  // Usuario persistido
  const storedUser = JSON.parse(localStorage.getItem("fitseoUser") || "null");

  // Normalizar rol
  const normalizeRole = (r) =>
    r ? r.replace("ROLE_", "").toUpperCase() : "";

  // Rol del usuario actual
  const currentUserRole =
    normalizeRole(user?.role) || normalizeRole(storedUser?.role) || "";

  // --- Estados ---
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ msg: "", type: "" });
  
  const [editUser, setEditUser] = useState(null);
  
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    nombreUsuario: "",
    email: "",
    password: "",
    tipo: "",
  });

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

  // --- Permisos de Creación ---
  const getAllowedTipos = () => {
    switch (currentUserRole) {
      case "SUPER_ADMIN":
        return ["Superadministrador", "Administrador", "Supervisor"];
      case "ADMIN":
        return ["Supervisor"];
      default:
        return [];
    }
  };

  const allowedTipos = getAllowedTipos();
  const canCreateProfiles = allowedTipos.length > 0;

  // --- Helpers ---
  const mostrarToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3000);
  };

  // --- Cargar Usuarios ---
  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await getUsers();
        // Filtramos solo staff (Super Admin, Admin, Supervisor)
        const staffUsers = data.filter(u => {
            const r = normalizeRole(u.role);
            return ["SUPER_ADMIN", "ADMIN", "SUPERVISOR"].includes(r);
        });

        setUsuarios(
          staffUsers.map((u) => ({
            ...u,
            normalizedRole: normalizeRole(u.role),
          }))
        );
      } catch (e) {
        console.error(e);
        mostrarToast("Error al cargar usuarios", "error");
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  // --- Form Handlers ---
  const limpiarFormulario = () => {
    setNuevoUsuario({
      nombre: "",
      apellido: "",
      dni: "",
      nombreUsuario: "",
      email: "",
      password: "",
      tipo: allowedTipos[0] || "",
    });
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

    if (!nombre) newErrors.nombre = "Nombre requerido.";
    if (!apellido) newErrors.apellido = "Apellido requerido.";
    if (!dni) newErrors.dni = "DNI requerido.";
    if (!nombreUsuario) newErrors.nombreUsuario = "Usuario requerido.";
    if (!email) newErrors.email = "Email requerido.";
    if (!tipo) newErrors.tipo = "Rol requerido.";
    if (!editUser && !password) newErrors.password = "Contraseña requerida.";

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
        // EDITAR
        await updateUser(editUser.id, {
          first_name: nuevoUsuario.nombre,
          last_name: nuevoUsuario.apellido,
          dni: nuevoUsuario.dni,
          username: nuevoUsuario.nombreUsuario,
          email: nuevoUsuario.email,
          role: apiRole,
        });

        setUsuarios((prev) =>
          prev.map((u) =>
            u.id === editUser.id
              ? {
                  ...u,
                  first_name: nuevoUsuario.nombre,
                  last_name: nuevoUsuario.apellido,
                  dni: nuevoUsuario.dni,
                  username: nuevoUsuario.nombreUsuario,
                  email: nuevoUsuario.email,
                  role: apiRole,
                  normalizedRole: normalizeRole(apiRole),
                }
              : u
          )
        );
        mostrarToast("Usuario actualizado correctamente");
      } else {
        // CREAR
        const created = await registerUser(
            nuevoUsuario.nombre,
            nuevoUsuario.apellido,
            nuevoUsuario.email,
            nuevoUsuario.nombreUsuario,
            nuevoUsuario.password,
            apiRole,
            nuevoUsuario.dni 
        );

        setUsuarios((prev) => [
          { 
              ...created, 
              first_name: nuevoUsuario.nombre,
              last_name: nuevoUsuario.apellido,
              normalizedRole: normalizeRole(apiRole) 
          },
          ...prev,
        ]);
        mostrarToast("Perfil creado correctamente");
      }

      cerrarModal();
    } catch (err) {
      console.error(err);
      mostrarToast(err.message || "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  // --- Acciones Usuario ---
  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que querés eliminar este perfil?")) return;
    try {
      await deleteUser(id);
      setUsuarios((prev) => prev.filter((u) => u.id !== id));
      mostrarToast("Usuario eliminado");
    } catch (err) {
      mostrarToast("Error al eliminar", "error");
    }
  };

  const handleToggleEnabled = async (u) => {
    const newStatus = !u.enabled;
    try {
      await toggleUserStatus(u.id, newStatus);
      setUsuarios((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, enabled: newStatus } : x))
      );
      mostrarToast(newStatus ? "Usuario habilitado" : "Usuario deshabilitado");
    } catch (err) {
      mostrarToast("Error al cambiar estado", "error");
    }
  };

  const startEdit = (u) => {
    setEditUser(u);
    setNuevoUsuario({
      nombre: u.first_name || u.name || "", 
      apellido: u.last_name || u.lastName || "",
      dni: u.dni || "",
      email: u.email,
      nombreUsuario: u.username,
      tipo: mapRoleToTipo(u.role),
      password: "",
    });
    setMostrarFormulario(true);
  };

  // --- Render ---
  return (
    <section className={styles.configContainer}>
      
      {/* Toast Notification */}
      {toast.msg && (
        <div className={`${styles.toast} ${toast.type === "error" ? styles.toastError : styles.toastSuccess}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h2>Configuración y Permisos</h2>
          <p>Gestión del personal y accesos administrativos.</p>
        </div>
        
        {canCreateProfiles && (
          <button className={styles.btnPrimary} onClick={abrirModalCrear}>
            + Crear Perfil
          </button>
        )}
      </div>

      {/* MODAL POPUP */}
      {mostrarFormulario && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            
            <div className={styles.modalHeader}>
              <h3>{editUser ? "📝 Editar Perfil" : "✨ Nuevo Perfil"}</h3>
              <button className={styles.btnClose} onClick={cerrarModal}>&times;</button>
            </div>

            <div className={styles.modalBody}>
              <form onSubmit={handleSubmit} id="userForm">
                <div className={styles.formGrid}>
                  
                  {/* Fila 1 */}
                  <div className={styles.formGroup}>
                    <label>Nombre</label>
                    <input
                      type="text"
                      name="nombre"
                      value={nuevoUsuario.nombre}
                      onChange={handleChange}
                      className={errors.nombre ? styles.inputError : ""}
                    />
                    {errors.nombre && <span className={styles.errorText}>{errors.nombre}</span>}
                  </div>

                  <div className={styles.formGroup}>
                    <label>Apellido</label>
                    <input
                      type="text"
                      name="apellido"
                      value={nuevoUsuario.apellido}
                      onChange={handleChange}
                      className={errors.apellido ? styles.inputError : ""}
                    />
                    {errors.apellido && <span className={styles.errorText}>{errors.apellido}</span>}
                  </div>

                  {/* Fila 2 */}
                  <div className={styles.formGroup}>
                    <label>DNI</label>
                    <input
                      type="text"
                      name="dni"
                      value={nuevoUsuario.dni}
                      onChange={handleChange}
                      className={errors.dni ? styles.inputError : ""}
                    />
                    {errors.dni && <span className={styles.errorText}>{errors.dni}</span>}
                  </div>

                  <div className={styles.formGroup}>
                    <label>Rol / Permisos</label>
                    <select
                      name="tipo"
                      value={nuevoUsuario.tipo}
                      onChange={handleChange}
                      className={errors.tipo ? styles.inputError : ""}
                      disabled={!!editUser && editUser.id === user.id} 
                    >
                      <option value="">Seleccionar rol...</option>
                      {allowedTipos.map((tipo) => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                      {/* Caso especial: admin editandose a si mismo */}
                      {editUser && editUser.id === user.id && !allowedTipos.includes(mapRoleToTipo(editUser.role)) && (
                          <option value={mapRoleToTipo(editUser.role)}>{mapRoleToTipo(editUser.role)}</option>
                      )}
                    </select>
                    {errors.tipo && <span className={styles.errorText}>{errors.tipo}</span>}
                  </div>

                  {/* Fila 3 */}
                  <div className={styles.formGroup}>
                    <label>Nombre de Usuario</label>
                    <input
                      type="text"
                      name="nombreUsuario"
                      value={nuevoUsuario.nombreUsuario}
                      onChange={handleChange}
                      className={errors.nombreUsuario ? styles.inputError : ""}
                    />
                    {errors.nombreUsuario && <span className={styles.errorText}>{errors.nombreUsuario}</span>}
                  </div>

                  <div className={styles.formGroup}>
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={nuevoUsuario.email}
                      onChange={handleChange}
                      className={errors.email ? styles.inputError : ""}
                    />
                    {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                  </div>

                  {/* Password (Solo crear) */}
                  {!editUser && (
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                      <label>Contraseña</label>
                      <input
                        type="password"
                        name="password"
                        value={nuevoUsuario.password}
                        onChange={handleChange}
                        className={errors.password ? styles.inputError : ""}
                        placeholder="Mínimo 6 caracteres"
                      />
                      {errors.password && <span className={styles.errorText}>{errors.password}</span>}
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={cerrarModal}>Cancelar</button>
              <button type="submit" form="userForm" className={styles.btnPrimary} disabled={saving}>
                {saving ? "Guardando..." : (editUser ? "Guardar Cambios" : "Crear Usuario")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABLA DE USUARIOS */}
      <div className={styles.tableWrapper}>
        {loading ? (
          <div className={styles.loaderArea}>
            <Loader text="Cargando staff..." />
          </div>
        ) : usuarios.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th style={{textAlign: 'right'}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const targetRole = normalizeRole(u.role);
                const isMe = u.id === user.id;
                
                // Lógica de permisos para botones
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
                      <div className={styles.cellName}>
                        <strong>{u.first_name || u.name} {u.last_name || u.lastName}</strong>
                        <small>{u.dni || "-"}</small>
                      </div>
                    </td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`${styles.badge} ${
                        targetRole === 'SUPER_ADMIN' ? styles.badgeSuper : 
                        targetRole === 'ADMIN' ? styles.badgeAdmin : 
                        styles.badgeSupervisor
                      }`}>
                        {mapRoleToTipo(targetRole)}
                      </span>
                    </td>
                    <td>
                      <span className={u.enabled ? styles.statusActive : styles.statusInactive}>
                        {u.enabled ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        {canEdit && (
                          <>
                            <button className={styles.btnIcon} onClick={() => startEdit(u)} title="Editar">
                              ✏️
                            </button>
                            
                            {!isMe && (
                              <button 
                                className={styles.btnIcon} 
                                onClick={() => handleToggleEnabled(u)}
                                title={u.enabled ? "Deshabilitar" : "Habilitar"}
                              >
                                {u.enabled ? "🚫" : "✅"}
                              </button>
                            )}
                          </>
                        )}
                        
                        {canDelete && (
                          <button className={`${styles.btnIcon} ${styles.btnDelete}`} onClick={() => handleDelete(u.id)} title="Eliminar">
                            🗑️
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
            <p>⚙️ No hay personal registrado.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Configuracion;