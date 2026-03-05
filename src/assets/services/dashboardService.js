import { supabase } from "./supabaseClient";

/**
 * Trae los 4 números clave para las StatCards
 */
export const getSummaryStats = async () => {
  try {
    const today = new Date();
    const todayISO = today.toISOString();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekISO = nextWeek.toISOString();

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    // 1. Conteo de Socios Activos
    const { count: activeUsers, error: err1 } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('enabled', true)
      .eq('role', 'CLIENT');

    // 2. Ingresos del mes actual (Desde la tabla PAYMENTS)
    const { data: payments, error: err2 } = await supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', startOfMonth);

    const monthlyIncome = payments?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;

    // 3. Vencimientos en los próximos 7 días
    const { count: dueSoon, error: err3 } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .gte('due_date', todayISO.split('T')[0])
      .lte('due_date', nextWeekISO.split('T')[0])
      .eq('active', true);

    // 4. Alertas Médicas
    const { count: medicalAlerts, error: err4 } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('medical_observations', 'is', null)
      .neq('medical_observations', 'Sin observaciones')
      .neq('medical_observations', '');

    if (err1 || err2 || err3 || err4) throw new Error("Error en alguna métrica");

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

/**
 * Trae datos para el IncomeChart (Histórico de 6 meses desde PAYMENTS)
 */
export const getIncomeHistory = async () => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data, error } = await supabase
      .from('payments')
      .select('amount, payment_date')
      .gte('payment_date', sixMonthsAgo.toISOString())
      .order('payment_date', { ascending: true });

    if (error) throw error;

    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    
    // Inicializar los últimos 6 meses con 0 para que el gráfico no esté vacío
    const last6Months = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      last6Months[months[d.getMonth()]] = 0;
    }

    const grouped = data.reduce((acc, curr) => {
      const date = new Date(curr.payment_date);
      const monthName = months[date.getMonth()];
      if (acc.hasOwnProperty(monthName)) {
        acc[monthName] += Number(curr.amount);
      }
      return acc;
    }, last6Months);

    return Object.entries(grouped).map(([name, ingresos]) => ({ name, ingresos }));
  } catch (error) {
    console.error("Income History Error:", error);
    return [];
  }
};

/**
 * Trae datos para el PlansChart
 */
export const getPlansDistribution = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('plan_id, plans(name)')
      .eq('enabled', true)
      .eq('role', 'CLIENT');

    if (error) throw error;

    const distribution = data.reduce((acc, curr) => {
      const planName = curr.plans?.name || 'Sin Plan';
      const existing = acc.find(item => item.name === planName);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: planName, value: 1 });
      }
      return acc;
    }, []);

    return distribution;
  } catch (error) {
    console.error("Plans Distribution Error:", error);
    return [];
  }
};