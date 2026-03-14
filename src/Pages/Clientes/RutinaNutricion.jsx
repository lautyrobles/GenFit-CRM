import React, { useState, useEffect } from "react";
import localStyles from "./RutinaNutricion.module.css";
// 👉 Ajustá la ruta a tu supabaseClient si es necesario
import { supabase } from "../../assets/services/supabaseClient"; 
import { FiCalendar, FiActivity, FiUser, FiCheckCircle, FiLoader } from "react-icons/fi";

const RutinaNutricion = () => {
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados del Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [editingData, setEditingData] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // --- OBTENER TODAS LAS SOLICITUDES GLOBALES ---
  useEffect(() => {
    const fetchTodasLasPendientes = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('routines')
          .select(`
            id, name, is_active, user_id,
            users (first_name, last_name),
            routine_days (
              id, day_name, order_index,
              muscle_blocks (
                id, muscle_name, order_index,
                exercises (id, name, sets, reps, video_url)
              )
            )
          `)
          .eq('is_active', false) 
          .order('id', { ascending: true }); 

        if (error) throw error;
        setPendientes(data || []);
      } catch (err) {
        console.error("Error obteniendo solicitudes globales:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTodasLasPendientes();
  }, []);

  /* ==================== ABRIR MODAL ==================== */
  const revisarRutina = (routine) => {
    setSelectedRoutine(routine);

    const days = routine.routine_days.sort((a,b) => a.order_index - b.order_index);
    const generated = days.map(d => {
      const groups = d.muscle_blocks.sort((a,b) => a.order_index - b.order_index).map(b => {
        return {
          label: b.muscle_name,
          exercises: b.exercises.map(ex => {
            let repsStr = ex.reps || "";
            let reps = repsStr;
            let rest = "";
            if (repsStr.includes("| Descanso:")) {
              [reps, rest] = repsStr.split("| Descanso:").map(s => s.trim());
            }
            return { name: ex.name, sets: ex.sets, reps, rest };
          })
        };
      });
      return { dia: d.day_name, grupos: groups };
    });

    setEditingData(generated);
    setFeedback("");
    setShowModal(true);
  };

  /* ==================== EDITAR EN MODAL ==================== */
  const updateExercise = (dayIdx, groupIdx, exIdx, field, value) => {
    const newData = [...editingData];
    newData[dayIdx].grupos[groupIdx].exercises[exIdx][field] = value;
    setEditingData(newData);
  };

  /* ==================== GUARDAR Y APROBAR ==================== */
  const aprobarRutina = async () => {
    if (!selectedRoutine?.user_id) return;
    
    setIsSaving(true);
    setFeedback("Aprobando y enviando al cliente...");
    
    try {
        const userId = selectedRoutine.user_id;

        // 1. ELIMINAR rutinas anteriores de ESE usuario específico
        await supabase.from('routines').delete().eq('user_id', userId);

        // 2. INSERTAR la nueva rutina con is_active: TRUE (Aprobada)
        const { data: routineData, error: routineError } = await supabase
          .from('routines')
          .insert({
            user_id: userId,
            name: `Plan Entrenamiento (Aprobado)`,
            is_active: true
          })
          .select()
          .single();

        if (routineError) throw routineError;
        const routineId = routineData.id;

        // 3. Insertar la estructura corregida
        for (let dIdx = 0; dIdx < editingData.length; dIdx++) {
            const day = editingData[dIdx];
            const { data: dayData } = await supabase.from('routine_days').insert({ routine_id: routineId, day_name: day.dia, order_index: dIdx }).select().single();
            const dayId = dayData.id;

            for (let gIdx = 0; gIdx < day.grupos.length; gIdx++) {
                const group = day.grupos[gIdx];
                const { data: blockData } = await supabase.from('muscle_blocks').insert({ day_id: dayId, muscle_name: group.label.replace('_', ' '), order_index: gIdx }).select().single();
                const blockId = blockData.id;

                const exercisesToInsert = group.exercises.map((ex) => ({
                    block_id: blockId,
                    name: ex.name,
                    sets: String(ex.sets), 
                    reps: `${ex.reps} | Descanso: ${ex.rest}`, 
                    video_url: null 
                }));

                if (exercisesToInsert.length > 0) {
                    await supabase.from('exercises').insert(exercisesToInsert);
                }
            }
        }
        
        // 4. Sacar la tarjeta de la fila visualmente
        setPendientes(prev => prev.filter(r => r.id !== selectedRoutine.id));
        setFeedback("¡Aprobada exitosamente!");
        
        setTimeout(() => {
            setShowModal(false);
            setFeedback("");
            setIsSaving(false);
        }, 1500);

    } catch (e) {
        console.error(e);
        setFeedback("Error al aprobar.");
        setIsSaving(false);
    }
  };

  /* ==================== RENDER ==================== */
  return (
    <div className={localStyles.pageContainer}>
      <div className={localStyles.header}>
        <h2>Bandeja de Solicitudes</h2>
        <p>Rutinas generadas por tus clientes esperando revisión y aprobación.</p>
      </div>

      {loading ? (
        <div className={localStyles.loadingContainer}>
          <FiLoader className={localStyles.spinner} />
          <p>Sincronizando con la base de datos...</p>
        </div>
      ) : pendientes.length === 0 ? (
        <div className={localStyles.emptyState}>
          <div className={localStyles.emptyIconWrapper}>
             <FiCheckCircle size={60} color="#10b981" />
          </div>
          <h3>¡Bandeja Limpia!</h3>
          <p>No hay usuarios esperando aprobación de rutina en este momento.</p>
        </div>
      ) : (
        <div className={localStyles.grid}>
          {pendientes.map((rutina, index) => (
            // 👇 Le agregamos un delay dinámico para que entren en cascada (escalonadas)
            <div key={rutina.id} className={localStyles.card} style={{ animationDelay: `${index * 0.15}s` }}>
              <div style={{ marginBottom: '12px' }}>
                <span className={localStyles.badge}>NUEVA SOLICITUD</span>
              </div>
              <p className={localStyles.clientName}>
                <FiUser color="#3b82f6" /> {rutina.users?.first_name} {rutina.users?.last_name}
              </p>
              <p className={localStyles.routineName}>
                <FiActivity color="#94a3b8" /> {rutina.name}
              </p>
              <p className={localStyles.dateText}>
                <FiCalendar color="#94a3b8" /> Ingresada recientemente
              </p>
              <button className={localStyles.btnPrimary} onClick={() => revisarRutina(rutina)}>
                Revisar y Aprobar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ==================== MODAL DE EDICIÓN ==================== */}
      {showModal && editingData && (
        <div className={localStyles.modalOverlay}>
          <div className={localStyles.modalContent}>
            <div className={localStyles.modalHeader}>
              <h3 style={{margin:0, color: '#0f172a', fontWeight: '800'}}>
                 🏋️ Revisar Rutina de {selectedRoutine?.users?.first_name}
              </h3>
              <button className={localStyles.modalCloseBtn} onClick={() => setShowModal(false)} title="Cerrar">×</button>
            </div>

            <div className={localStyles.modalBody}>
                {editingData.map((dia, dayIdx) => (
                    <div key={dayIdx} className={localStyles.editableCard}>
                        <div className={localStyles.editableHeader}>{dia.dia}</div>
                        {dia.grupos.map((grupo, groupIdx) => (
                            <React.Fragment key={groupIdx}>
                                <div className={localStyles.groupLabel}>{grupo.label.replace('_',' ')}</div>
                                {grupo.exercises.map((ex, exIdx) => (
                                    <div key={exIdx} className={localStyles.editableRow}>
                                        <input className={localStyles.inputClean} value={ex.name} onChange={(e) => updateExercise(dayIdx, groupIdx, exIdx, 'name', e.target.value)} placeholder="Ejercicio" />
                                        <input className={localStyles.inputClean} style={{textAlign: 'center', width: '70px'}} value={ex.sets} onChange={(e) => updateExercise(dayIdx, groupIdx, exIdx, 'sets', e.target.value)} placeholder="Sets" />
                                        <input className={localStyles.inputClean} style={{textAlign: 'center', width: '90px'}} value={ex.reps} onChange={(e) => updateExercise(dayIdx, groupIdx, exIdx, 'reps', e.target.value)} placeholder="Reps" />
                                        <input className={localStyles.inputClean} style={{width: '120px'}} value={ex.rest} onChange={(e) => updateExercise(dayIdx, groupIdx, exIdx, 'rest', e.target.value)} placeholder="Descanso" />
                                    </div>
                                ))}
                            </React.Fragment>
                        ))}
                    </div>
                ))}
            </div>

            <div className={localStyles.modalFooter}>
                <div style={{marginRight:'auto', fontWeight:'600', color: feedback.includes('Error') ? '#dc2626' : '#059669'}}>
                    {feedback}
                </div>
                <button className={localStyles.btnCancel} onClick={() => setShowModal(false)} disabled={isSaving}>
                    Cancelar
                </button>
                <button className={localStyles.btnSave} onClick={aprobarRutina} disabled={isSaving}>
                    {isSaving ? "Aprobando..." : "Aprobar y Enviar"}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RutinaNutricion;