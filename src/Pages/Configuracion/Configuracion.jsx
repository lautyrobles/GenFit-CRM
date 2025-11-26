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
    dni: "", // 🆕 Agregado DNI
    nombreUsuario: "",
    email: "",
    password: "",
    tipo: "",
  });

  /* ===================================================
     🔹 Mapeo de Roles UI <-> API
     =================================================== */
  const mapRoleToTipo = (roleRaw) => {
    const role = normalizeRole(roleRaw);
    switch (role) {
      case "SUPER_ADMIN": return "Super Admin";
      case "ADMIN": return "Admin";
      case "SUPERVISOR": return "Encargado"; // O Shift Manager
      case "TRAINER": return "Entrenador";
      case "CLIENT": return "Usuario Cliente";
      default: return "Usuario";
    }
  };

  const mapTipoToRole = (tipo) => {
    switch (tipo) {
      case "Super Admin": return "SUPER_ADMIN";
      case "Admin": return "ADMIN";
      case "Encargado": return "SUPERVISOR";
      case "Entrenador": return "TRAINER";
      default: return "CLIENT";
    }
  };

  /* ===================================================
     🔹 Permisos de creación
     =================================================== */
  const getAllowedTipos = () => {
    switch (currentUserRole) {
      case "SUPER_ADMIN":
        return ["Super Admin", "Admin", "Encargado", "Entrenador"];
      case "ADMIN":
        return ["Encargado", "Entrenador"];
      default:
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
        // Supabase devuelve first_name / last_name, mapeamos si es necesario
        // o usamos los campos directos en el render.
        setUsuarios(
          data.map((u) => ({
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
     🔹 Submit (Crear / Editar)
     =================================================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarCampos()) return;

    try {
      const apiRole = mapTipoToRole(nuevoUsuario.tipo);

      if (editUser) {
        // --- EDITAR ---
        // Mapeamos a las columnas de Supabase (first_name, last_name)
        await updateUser(editUser.id, {
          first_name: nuevoUsuario.nombre,
          last_name: nuevoUsuario.apellido,
          dni: nuevoUsuario.dni,
          username: nuevoUsuario.nombreUsuario,
          email: nuevoUsuario.email,
          role: apiRole, // Enviamos el rol limpio
        });

        // Actualizamos estado local
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
        // Nota: registerUser en authService debe soportar DNI o pasar un objeto
        // Si tu authService.js original no tiene DNI, asegúrate de pasarlo
        // Aquí asumimos que authService recibe (nombre, apellido, email, user, pass, rol, dni)
        // Ojo: adaptaremos la llamada para que sea robusta
        const created = await registerUser(
            nuevoUsuario.nombre,
            nuevoUsuario.apellido,
            nuevoUsuario.email,
            nuevoUsuario.nombreUsuario,
            nuevoUsuario.password,
            apiRole
            // Si modificaste el registerUser para aceptar DNI como 7mo parametro, agrégalo aquí:
            //, nuevoUsuario.dni 
        );

        // Si registerUser no acepta DNI, hacemos un update inmediato (parche rápido)
        if (nuevoUsuario.dni) {
             await updateUser(created.id || created.user?.id, { dni: nuevoUsuario.dni });
             created.dni = nuevoUsuario.dni;
        }

        setUsuarios((prev) => [
          ...prev,
          { 
              ...created, 
              first_name: nuevoUsuario.nombre, // Aseguramos que el estado local tenga los datos
              last_name: nuevoUsuario.apellido,
              normalizedRole: normalizeRole(apiRole) 
          },
        ]);

        mostrarToast("Usuario creado correctamente");
      }

      limpiarFormulario();
      setMostrarFormulario(false);
    } catch (err) {
      console.error(err);
      mostrarToast(err.message || "Error al guardar usuario", "error");
    }
  };

  /* ===================================================
     🔹 Eliminar
     =================================================== */
  const handleDelete = async (id, roleRaw) => {
    const role = normalizeRole(roleRaw);

    if (!window.confirm("¿Seguro que querés eliminar esta cuenta?")) return;
    if (currentUserRole === "SUPERVISOR") return mostrarToast("No tenés permisos", "error");
    if (id === user.id) return mostrarToast("No podés eliminarte a vos mismo", "error");
    if (currentUserRole === "ADMIN" && ["ADMIN", "SUPER_ADMIN"].includes(role))
      return mostrarToast("No podés eliminar este usuario", "error");

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
    const newStatus = !u.enabled; // Supabase usa 'enabled' (boolean)
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
      // Usamos first_name / last_name que vienen de Supabase
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
      {/* TOASTS */}
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

        <p>Gestión del personal según jerarquía de roles.</p>

        {/* FORMULARIO */}
        {mostrarFormulario && (
          <form className={styles.formContainer} onSubmit={handleSubmit}>
            <input
              type="text"
              name="nombre"
              placeholder="Nombre"
              value={nuevoUsuario.nombre}
              onChange={handleChange}
              className={errors.nombre ? styles.inputError : ""}
            />
            {errors.nombre && <p className={styles.errorInline}>{errors.nombre}</p>}

            <input
              type="text"
              name="apellido"
              placeholder="Apellido"
              value={nuevoUsuario.apellido}
              onChange={handleChange}
              className={errors.apellido ? styles.inputError : ""}
            />
            {errors.apellido && <p className={styles.errorInline}>{errors.apellido}</p>}

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

            <select
              name="tipo"
              value={nuevoUsuario.tipo}
              onChange={handleChange}
              className={errors.tipo ? styles.inputError : ""}
              disabled={!!editUser}
            >
              <option value="">Seleccionar rol</option>
              {allowedTipos.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
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
            <p>Cargando usuarios...</p>
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
                const realRole = normalizeRole(u.role);
                // Permisos de edición (Igual lógica que tenías)
                const canEdit =
                  u.id === user.id ||
                  currentUserRole === "SUPER_ADMIN" ||
                  (currentUserRole === "ADMIN" && ["SUPERVISOR", "CLIENT", "TRAINER"].includes(realRole));

                const canDelete =
                  currentUserRole === "SUPER_ADMIN" &&
                  realRole !== "SUPER_ADMIN" &&
                  u.id !== user.id;

                return (
                  <tr key={u.id} className={editUserId === u.id ? styles.rowEditing : ""}>
                    {/* Renderizamos first_name / last_name */}
                    <td>{u.first_name || u.name}</td>
                    <td>{u.last_name || u.lastName}</td>
                    <td>{u.dni || "-"}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{mapRoleToTipo(realRole)}</td>
                    <td>
                      {canEdit && (
                        <button className={styles.btnEditar} onClick={() => startEdit(u)}>
                          Editar
                        </button>
                      )}

                      {(currentUserRole === "SUPER_ADMIN" || currentUserRole === "ADMIN") &&
                        u.id !== user.id &&
                        ["SUPERVISOR", "CLIENT", "TRAINER"].includes(realRole) && (
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
                          onClick={() => handleDelete(u.id, realRole)}
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
            <p>⚙️ No hay perfiles creados todavía...</p>
          </div>
        )}
      </section>
    </>
  );
};

export default Configuracion;