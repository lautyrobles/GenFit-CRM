import React, { useState, useEffect } from "react";
import styles from "./Configuracion.module.css";
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

  /* ===================================================
     🔹 Normalizar rol
     =================================================== */
  const normalizeRole = (r) =>
    r ? r.replace("ROLE_", "").toUpperCase() : "";

  // Rol del usuario que está logueado actualmente
  const currentUserRole =
    normalizeRole(user?.role) || normalizeRole(storedUser?.role) || "";

  /* ===================================================
     🔹 Estados
     =================================================== */
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [toastError, setToastError] = useState("");
  const [success, setSuccess] = useState("");
  const [editUser, setEditUser] = useState(null);
  const [editUserId, setEditUserId] = useState(null);

  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    nombreUsuario: "",
    email: "",
    password: "",
    tipo: "",
  });

  /* ===================================================
     🔹 Mapeo de Roles UI <-> API
     Solo mostramos lo que pediste
     =================================================== */
  const mapRoleToTipo = (roleRaw) => {
    const role = normalizeRole(roleRaw);
    switch (role) {
      case "SUPER_ADMIN": return "Superadministrador";
      case "ADMIN": return "Administrador";
      case "SUPERVISOR": return "Supervisor";
      default: return role; // Por si aparece algún legacy
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

  /* ===================================================
     🔹 LÓGICA DE PERMISOS DE CREACIÓN (Dropdown)
     =================================================== */
  const getAllowedTipos = () => {
    switch (currentUserRole) {
      case "SUPER_ADMIN":
        // El Super Admin puede crear a cualquiera de los 3 niveles
        return ["Superadministrador", "Administrador", "Supervisor"];
      case "ADMIN":
        // El Dueño solo puede crear Supervisores
        return ["Supervisor"];
      default:
        // El Supervisor no configura staff
        return [];
    }
  };

  const allowedTipos = getAllowedTipos();
  const canCreateProfiles = allowedTipos.length > 0;

  /* ===================================================
     🔹 Toasts
     =================================================== */
  const mostrarToast = (texto, tipo = "success") => {
    if (tipo === "success") {
      setSuccess(texto);
      setToastError("");
    } else {
      setToastError(texto);
      setSuccess("");
    }
    setTimeout(() => {
      setSuccess("");
      setToastError("");
    }, 4000);
  };

  /* ===================================================
     🔹 Obtener usuarios
     =================================================== */
  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await getUsers();
        
        // Filtramos para que en esta pantalla NO aparezcan los clientes,
        // solo el staff (Super Admin, Admin, Supervisor)
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

  /* ===================================================
     🔹 Form handlers
     =================================================== */
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
    setEditUserId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevoUsuario((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validarCampos = () => {
    const { nombre, apellido, dni, nombreUsuario, email, password, tipo } = nuevoUsuario;
    const newErrors = {};

    if (!nombre) newErrors.nombre = "El nombre es obligatorio.";
    if (!apellido) newErrors.apellido = "El apellido es obligatorio.";
    if (!dni) newErrors.dni = "El DNI es obligatorio.";
    if (!nombreUsuario) newErrors.nombreUsuario = "El usuario es obligatorio.";
    if (!email) newErrors.email = "El correo es obligatorio.";
    if (!tipo) newErrors.tipo = "Seleccioná un rol.";
    if (!editUser && !password) newErrors.password = "La contraseña es obligatoria.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ===================================================
     🔹 Submit
     =================================================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarCampos()) return;

    try {
      const apiRole = mapTipoToRole(nuevoUsuario.tipo);

      if (editUser) {
        // --- EDITAR ---
        await updateUser(editUser.id, {
          first_name: nuevoUsuario.nombre,
          last_name: nuevoUsuario.apellido,
          dni: nuevoUsuario.dni,
          username: nuevoUsuario.nombreUsuario,
          email: nuevoUsuario.email,
          role: apiRole,
        });

        // Actualizar UI localmente
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
        // --- CREAR ---
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

      limpiarFormulario();
      setMostrarFormulario(false);
    } catch (err) {
      console.error(err);
      mostrarToast(err.message || "Error al guardar", "error");
    }
  };

  /* ===================================================
     🔹 Eliminar
     =================================================== */
  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que querés eliminar este perfil?")) return;
    try {
      await deleteUser(id);
      setUsuarios((prev) => prev.filter((u) => u.id !== id));
      mostrarToast("Usuario eliminado correctamente");
    } catch (err) {
      mostrarToast("Error al eliminar usuario", "error");
    }
  };

  /* ===================================================
     🔹 Toggle Status
     =================================================== */
  const handleToggleEnabled = async (u) => {
    const newStatus = !u.enabled;
    try {
      await toggleUserStatus(u.id, newStatus);
      setUsuarios((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, enabled: newStatus } : x))
      );
      mostrarToast(newStatus ? "Usuario habilitado" : "Usuario deshabilitado");
    } catch (err) {
      mostrarToast(err.message, "error");
    }
  };

  /* ===================================================
     🔹 Iniciar Edición
     =================================================== */
  const startEdit = (u) => {
    setEditUser(u);
    setEditUserId(u.id);
    setMostrarFormulario(true);

    setNuevoUsuario({
      nombre: u.first_name || u.name || "", 
      apellido: u.last_name || u.lastName || "",
      dni: u.dni || "",
      email: u.email,
      nombreUsuario: u.username,
      tipo: mapRoleToTipo(u.role),
      password: "",
    });
  };

  return (
    <>
      <div className={styles.toastContainer}>
        {success && <div className={`${styles.toast} ${styles.toastSuccess}`}>{success}</div>}
        {toastError && <div className={`${styles.toast} ${styles.toastError}`}>{toastError}</div>}
      </div>

      <section className={styles.configContainer}>
        <div className={styles.header}>
          <h2>Configuración y permisos</h2>
          {canCreateProfiles && (
            <button
              className={styles.btnCrear}
              onClick={() => {
                limpiarFormulario();
                setMostrarFormulario(!mostrarFormulario);
              }}
            >
              {mostrarFormulario ? "Cancelar" : "+ Crear perfil"}
            </button>
          )}
        </div>

        <p>Gestión del personal del gimnasio.</p>

        {/* FORMULARIO */}
        {mostrarFormulario && (
          <form className={styles.formContainer} onSubmit={handleSubmit}>
            <div style={{display: 'flex', gap: '10px'}}>
                <div style={{flex: 1}}>
                    <input
                    type="text"
                    name="nombre"
                    placeholder="Nombre"
                    value={nuevoUsuario.nombre}
                    onChange={handleChange}
                    className={errors.nombre ? styles.inputError : ""}
                    />
                    {errors.nombre && <p className={styles.errorInline}>{errors.nombre}</p>}
                </div>
                <div style={{flex: 1}}>
                    <input
                    type="text"
                    name="apellido"
                    placeholder="Apellido"
                    value={nuevoUsuario.apellido}
                    onChange={handleChange}
                    className={errors.apellido ? styles.inputError : ""}
                    />
                    {errors.apellido && <p className={styles.errorInline}>{errors.apellido}</p>}
                </div>
            </div>

            <input
              type="text"
              name="dni"
              placeholder="DNI (Sin puntos)"
              value={nuevoUsuario.dni}
              onChange={handleChange}
              className={errors.dni ? styles.inputError : ""}
            />
            {errors.dni && <p className={styles.errorInline}>{errors.dni}</p>}

            <input
              type="text"
              name="nombreUsuario"
              placeholder="Nombre de usuario"
              value={nuevoUsuario.nombreUsuario}
              onChange={handleChange}
              className={errors.nombreUsuario ? styles.inputError : ""}
            />
            {errors.nombreUsuario && <p className={styles.errorInline}>{errors.nombreUsuario}</p>}

            <input
              type="email"
              name="email"
              placeholder="Correo electrónico"
              value={nuevoUsuario.email}
              onChange={handleChange}
              className={errors.email ? styles.inputError : ""}
            />
            {errors.email && <p className={styles.errorInline}>{errors.email}</p>}

            {!editUser && (
              <>
                <input
                  type="password"
                  name="password"
                  placeholder="Contraseña"
                  value={nuevoUsuario.password}
                  onChange={handleChange}
                  className={errors.password ? styles.inputError : ""}
                />
                {errors.password && <p className={styles.errorInline}>{errors.password}</p>}
              </>
            )}

            <label style={{fontSize: '0.9rem', marginBottom: '5px', display: 'block'}}>Rol del usuario:</label>
            <select
              name="tipo"
              value={nuevoUsuario.tipo}
              onChange={handleChange}
              className={errors.tipo ? styles.inputError : ""}
              // 🔒 REGLA: Si el Admin se edita a sí mismo, NO puede cambiar su rol.
              disabled={!!editUser && editUser.id === user.id} 
            >
              <option value="">Seleccionar rol</option>
              {allowedTipos.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
              {/* Si estamos editando un usuario que tiene un rol que yo no puedo crear (ej: admin editandose a sí mismo),
                  necesitamos que aparezca la opción en el select para que no se rompa, aunque esté disabled */}
              {editUser && editUser.id === user.id && !allowedTipos.includes(mapRoleToTipo(editUser.role)) && (
                  <option value={mapRoleToTipo(editUser.role)}>{mapRoleToTipo(editUser.role)}</option>
              )}
            </select>
            {errors.tipo && <p className={styles.errorInline}>{errors.tipo}</p>}

            <button type="submit" className={styles.btnConfirmar}>
              {editUser ? "Guardar cambios" : "Confirmar"}
            </button>
          </form>
        )}

        {/* TABLA */}
        {loading ? (
          <div className={styles.placeholderBox}>
            <p>Cargando personal...</p>
          </div>
        ) : usuarios.length > 0 ? (
          <table className={styles.tablaUsuarios}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>DNI</th>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const targetRole = normalizeRole(u.role);
                const isMe = u.id === user.id;

                /* =============================================
                   🔒 LÓGICA DE PERMISOS DE EDICIÓN / BORRADO
                   ============================================= */
                let canEdit = false;
                let canDelete = false;

                if (currentUserRole === "SUPER_ADMIN") {
                    // Super Admin: Puede editar y borrar a todos (menos borrarse a sí mismo)
                    canEdit = true;
                    canDelete = !isMe;
                } 
                else if (currentUserRole === "ADMIN") {
                    // Admin: 
                    // 1. Puede editarse a sí mismo
                    // 2. Puede editar/borrar Supervisores
                    // 3. NO puede tocar a otros Admins ni Super Admins
                    if (isMe) {
                        canEdit = true;
                        canDelete = false;
                    } else if (targetRole === "SUPERVISOR") {
                        canEdit = true;
                        canDelete = true;
                    }
                }

                return (
                  <tr key={u.id} className={editUserId === u.id ? styles.rowEditing : ""}>
                    <td>{u.first_name || u.name}</td>
                    <td>{u.last_name || u.lastName}</td>
                    <td>{u.dni || "-"}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>
                        <span className={
                            targetRole === 'SUPER_ADMIN' ? styles.badgeSuper : 
                            targetRole === 'ADMIN' ? styles.badgeAdmin : 
                            styles.badgeSupervisor
                        }>
                            {mapRoleToTipo(targetRole)}
                        </span>
                    </td>
                    <td>
                      {canEdit && (
                        <button className={styles.btnEditar} onClick={() => startEdit(u)}>
                          Editar
                        </button>
                      )}

                      {/* Botón Habilitar/Deshabilitar (Solo si tienes permiso de editar y no eres tú mismo) */}
                      {canEdit && !isMe && (
                          <button
                            style={{
                              backgroundColor: u.enabled ? "#b03a2e" : "#27ae60",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              padding: "5px 10px",
                              cursor: "pointer",
                              marginRight: "4px",
                              fontSize: "13px",
                            }}
                            onClick={() => handleToggleEnabled(u)}
                          >
                            {u.enabled ? "Deshabilitar" : "Habilitar"}
                          </button>
                        )}

                      {canDelete && (
                        <button
                          className={styles.btnEliminar}
                          onClick={() => handleDelete(u.id)}
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className={styles.placeholderBox}>
            <p>⚙️ No hay personal registrado.</p>
          </div>
        )}
      </section>
    </>
  );
};

export default Configuracion;