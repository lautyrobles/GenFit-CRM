import { supabase } from "./supabaseClient";
import { registerUser } from "./authService"; // 👈 IMPORTANTE: Usamos la lógica segura de creación

/* ===================================================
   🔹 OBTENER TODOS LOS CLIENTES
   =================================================== */
export const obtenerClientes = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'CLIENT')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error al obtener clientes:", error.message);
    throw error;
  }
};

/* ===================================================
   🔹 CREAR UN NUEVO CLIENTE (Conectado a Auth)
   =================================================== */
export const crearCliente = async (cliente) => {
  try {
    console.log("📦 Creando cliente en Auth y DB...", cliente);

    // Llamamos a registerUser que ejecuta la función SQL 'crear_usuario_crm'
    // Esto asegura que el usuario se cree en el sistema de Login y en la tabla de datos
    // Parámetros: (nombre, apellido, email, username, password, role, dni)
    
    const nuevoUsuario = await registerUser(
        cliente.first_name,
        cliente.last_name,
        cliente.email,
        cliente.dni,
        cliente.phone,
        cliente.plan_id,          // Username = DNI
        String(cliente.dni),  // Password = DNI (Para que pueda entrar solo con DNI)
        'CLIENT',             // Rol forzado a CLIENTE
        cliente.dni           // DNI real
    );

    return nuevoUsuario;

  } catch (error) {
    console.error("❌ Error crear cliente:", error.message);
    throw error;
  }
};

/* ===================================================
   🔹 ACTUALIZAR CLIENTE
   =================================================== */
export const actualizarCliente = async (id, datos) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(datos)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error actualizar cliente:", error.message);
    throw error;
  }
};

/* ===================================================
   🔹 BUSCAR POR DNI (Auxiliar)
   =================================================== */
export const obtenerClientePorDocumento = async (dni) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('dni', dni)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    return null;
  }
};