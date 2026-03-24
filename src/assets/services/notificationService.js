// src/assets/services/notificationService.js
import { supabase } from "./supabaseClient";

export const getRecentActivity = async () => {
  try {
    // 1. Traemos los últimos 8 ingresos
    const { data: accesos, error: errAcc } = await supabase
      .from('access_logs')
      .select('user_id, check_in_time, access_granted')
      .order('check_in_time', { ascending: false })
      .limit(8);

    if (errAcc) throw errAcc;

    // 2. Traemos los últimos 8 logs de sistema
    const { data: logsSistema, error: errSys } = await supabase
      .from('system_logs')
      .select('id, created_at, action, details, user_id, module')
      .order('created_at', { ascending: false })
      .limit(8);

    if (errSys) throw errSys;

    // 3. Recolectamos IDs para nombres
    const userIds = [...new Set([
      ...(accesos?.map(a => a.user_id) || []),
      ...(logsSistema?.map(l => l.user_id) || [])
    ])].filter(id => id != null);

    const { data: userData } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('id', userIds);

    const userMap = {};
    userData?.forEach(u => {
      userMap[u.id] = `${u.first_name} ${u.last_name}`;
    });

    // 4. Formateamos Asistencias
    const formatoAsistencias = (accesos || []).map(a => ({
      id: `acc-${a.check_in_time}-${a.user_id}`,
      tipo: 'ASISTENCIA',
      titulo: userMap[a.user_id] || 'Socio Desconocido',
      subtitulo: a.access_granted ? 'registró su ingreso' : 'intento de ingreso denegado',
      fecha: new Date(a.check_in_time),
    }));

    // 5. Formateamos Logs (FILTRANDO SOLO CREACIÓN)
    const formatoLogs = (logsSistema || [])
      .filter(l => l.action === 'CREACIÓN' && l.module === 'Clientes')
      .map(l => ({
        id: `sys-${l.id}`,
        tipo: 'SISTEMA',
        titulo: 'Nuevo Socio Registrado',
        subtitulo: l.details || `Por ${userMap[l.user_id] || 'Staff'}`,
        fecha: new Date(l.created_at),
      }));

    // 6. Unificamos y ordenamos por fecha (Histórico reciente)
    return [...formatoAsistencias, ...formatoLogs]
      .sort((a, b) => b.fecha - a.fecha)
      .slice(0, 15);

  } catch (error) {
    console.error("❌ Error en getRecentActivity:", error.message);
    return [];
  }
};