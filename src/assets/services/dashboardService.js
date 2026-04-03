import { supabase } from "./supabaseClient";

export const getSummaryStats = async (gymId) => {
  if (!gymId) return null;
  try {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('enabled', true)
      .eq('role', 'CLIENT');

    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('gym_id', gymId)
      .gte('payment_date', startOfMonth);

    const monthlyIncome = payments?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;

    const { count: dueSoon } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', nextWeek.toISOString().split('T')[0])
      .eq('active', true);

    const { count: medicalAlerts } = await supabase
      .from('medical_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId);

    return {
      activeUsers: activeUsers || 0,
      monthlyIncome,
      dueSoon: dueSoon || 0,
      medicalAlerts: medicalAlerts || 0
    };
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return { activeUsers: 0, monthlyIncome: 0, dueSoon: 0, medicalAlerts: 0 };
  }
};

export const getIncomeHistory = async (gymId) => {
  if (!gymId) return [];
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data, error } = await supabase
      .from('payments')
      .select('amount, payment_date')
      .eq('gym_id', gymId)
      .gte('payment_date', sixMonthsAgo.toISOString())
      .order('payment_date', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Income History Error:", error);
    return [];
  }
};

export const getPlansDistribution = async (gymId) => {
  if (!gymId) return [];
  try {
    const { data, error } = await supabase
      .from('users')
      .select('plan_id, plans(name)')
      .eq('gym_id', gymId)
      .eq('enabled', true)
      .eq('role', 'CLIENT');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Plans Distribution Error:", error);
    return [];
  }
};

export const obtenerConteoAlertasMedicas = async (gymId) => {
  if (!gymId) return 0;
  try {
    const { count, error } = await supabase
      .from('medical_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error al obtener conteo de alertas:', error.message);
    return 0;
  }
};