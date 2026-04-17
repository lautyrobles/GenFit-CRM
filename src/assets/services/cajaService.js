import { supabase } from './supabaseClient';

/* =========================================
    🔓 ABRIR CAJA (crear apertura en system_logs)
   ========================================= */
export const abrirCaja = async (montoInicial, userId, gymId = null) => {
  try {
    // Verificar que no haya ya una caja abierta hoy para este usuario/turno
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data: aperturaExistente } = await supabase
      .from('system_logs')
      .select('id')
      .eq('action', 'APERTURA_CAJA')
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString())
      .maybeSingle();

    if (aperturaExistente) {
      throw new Error('Ya existe una caja abierta por este operador hoy.');
    }

    const { data, error } = await supabase
      .from('system_logs')
      .insert([{
        module: 'CAJA',
        action: 'APERTURA_CAJA',
        details: `Apertura de turno — Fondo inicial: $${montoInicial}`,
        monto: parseFloat(montoInicial),
        user_id: userId,
        gym_id: gymId || null
      }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("❌ Error abriendo caja:", error.message);
    return { success: false, error: error.message };
  }
};

/* =========================================
    📉 REGISTRAR EGRESO
   ========================================= */
export const registrarEgreso = async (monto, categoria, descripcion, userId, gymId = null) => {
  try {
    const { data, error } = await supabase
      .from('system_logs')
      .insert([{
        module: 'CAJA',
        action: 'EGRESO_EFECTIVO',
        details: descripcion,
        monto: parseFloat(monto),
        categoria: categoria,
        user_id: userId,
        gym_id: gymId || null
      }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("❌ Error registrando egreso:", error.message);
    return { success: false, error: error.message };
  }
};

/* =========================================
    ⚖️ OBTENER BALANCE DEL DÍA (solo efectivo)
    Calcula ingresos en efectivo menos egresos desde la apertura de caja.
   ========================================= */
export const obtenerBalanceDelDia = async (desde = null) => {
  try {
    const startOfDay = desde || (() => {
      const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString();
    })();

    // Ingresos en efectivo desde la apertura
    const { data: pagos, error: errPagos } = await supabase
      .from('payments')
      .select('amount')
      .eq('payment_method', 'EFECTIVO')
      .gte('created_at', startOfDay);

    if (errPagos) throw errPagos;

    // Egresos de efectivo desde la apertura
    const { data: egresos, error: errEgresos } = await supabase
      .from('system_logs')
      .select('monto')
      .eq('action', 'EGRESO_EFECTIVO')
      .gte('created_at', startOfDay);

    if (errEgresos) throw errEgresos;

    const totalIngresos = pagos.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
    const totalEgresos = egresos.reduce((acc, e) => acc + parseFloat(e.monto || 0), 0);
    const totalEsperado = totalIngresos - totalEgresos;

    return { success: true, totalEsperado, totalIngresos, totalEgresos };
  } catch (error) {
    console.error("❌ Error obteniendo balance:", error.message);
    return { success: false, totalEsperado: 0, totalIngresos: 0, totalEgresos: 0 };
  }
};

/* =========================================
    🔒 REGISTRAR CIERRE DE CAJA
    Asocia el cierre al usuario (staff) que lo realiza.
   ========================================= */
export const registrarCierre = async (montoDeclarado, montoEsperado, userId, gymId = null) => {
  try {
    const diferencia = parseFloat(montoDeclarado) - parseFloat(montoEsperado);

    const { data, error } = await supabase
      .from('cierres_caja')
      .insert([{
        usuario_id: userId,
        monto_declarado: parseFloat(montoDeclarado),
        monto_esperado: parseFloat(montoEsperado),
        diferencia: diferencia,
        fecha_cierre: new Date().toISOString(),
        gym_id: gymId || null
      }])
      .select()
      .single();

    if (error) throw error;

    // Registrar log de cierre
    await supabase.from('system_logs').insert([{
      module: 'CAJA',
      action: 'CIERRE_CAJA',
      details: `Arqueo cerrado. Físico: $${montoDeclarado} | Sistema: $${montoEsperado} | Diferencia: $${diferencia}`,
      user_id: userId,
      gym_id: gymId || null
    }]);

    return { success: true, data };
  } catch (error) {
    console.error("❌ Error en cierre de caja:", error.message);
    return { success: false, error: error.message };
  }
};

/* =========================================
    📊 OBTENER SESIÓN ACTIVA DE CAJA
    Busca si el operador actual tiene caja abierta hoy.
   ========================================= */
export const obtenerSesionActiva = async (userId) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Buscar logs de hoy para este usuario (APERTURA o CIERRE)
    const { data: logs } = await supabase
      .from('system_logs')
      .select('id, action, created_at, monto')
      .eq('user_id', userId)
      .in('action', ['APERTURA_CAJA', 'CIERRE_CAJA'])
      .gte('created_at', startOfDay.toISOString())
      .order('created_at', { ascending: false });

    if (!logs || logs.length === 0) return null;

    // Si el último evento es APERTURA, la caja está abierta
    const ultimoEvento = logs[0];
    if (ultimoEvento.action === 'APERTURA_CAJA') {
      return {
        id: ultimoEvento.id,
        abierta_en: ultimoEvento.created_at,
        monto_inicial: ultimoEvento.monto || 0
      };
    }

    return null; // Última acción fue CIERRE
  } catch (error) {
    console.error("❌ Error obteniendo sesión activa:", error.message);
    return null;
  }
};

/* =========================================
    📜 OBTENER HISTORIAL DE CIERRES
    Solo los cierres del operador logueado, o todos si es Admin/SuperAdmin.
   ========================================= */
export const obtenerHistorialCierres = async (userId, role, gymId = null) => {
  try {
    const isAdmin = ['SUPER_ADMIN', 'SUPERADMINISTRADOR', 'ADMIN', 'ADMINISTRADOR'].includes(
      (role || '').toUpperCase().replace('ROLE_', '')
    );

    let queryCierres = supabase
      .from('cierres_caja')
      .select('*, staff:usuario_id(first_name, last_name, role)')
      .order('fecha_cierre', { ascending: false })
      .limit(30);

    // Supervisores solo ven sus propios cierres; admins ven todos
    if (!isAdmin) {
      queryCierres = queryCierres.eq('usuario_id', userId);
    } else if (gymId) {
      queryCierres = queryCierres.eq('gym_id', gymId);
    }

    const { data: cierres, error } = await queryCierres;
    if (error) throw error;

    // Enriquecer con datos de apertura
    const startLookback = new Date();
    startLookback.setDate(startLookback.getDate() - 30);

    const { data: aperturas } = await supabase
      .from('system_logs')
      .select('created_at, monto, user_id')
      .eq('action', 'APERTURA_CAJA')
      .gte('created_at', startLookback.toISOString())
      .order('created_at', { ascending: false });

    const historial = (cierres || []).map(c => {
      // Encontrar la apertura más cercana ANTES de este cierre
      const apertura = (aperturas || []).find(a => {
        const mismoUsuario = isAdmin ? true : a.user_id === c.usuario_id;
        return mismoUsuario && new Date(a.created_at) <= new Date(c.fecha_cierre);
      });

      return {
        id: c.id,
        abierta_en: apertura ? apertura.created_at : c.fecha_cierre,
        cerrada_en: c.fecha_cierre,
        monto_inicial: apertura ? apertura.monto : 0,
        monto_final: c.monto_declarado,
        monto_esperado: c.monto_esperado,
        diferencia: c.diferencia,
        operador: c.staff
          ? `${c.staff.first_name} ${c.staff.last_name}`
          : 'Operador desconocido'
      };
    });

    return historial;
  } catch (error) {
    console.error("❌ Error obteniendo historial de cierres:", error.message);
    return [];
  }
};