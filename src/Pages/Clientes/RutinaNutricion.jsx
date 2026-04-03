import React, { useState, useEffect } from "react";
import localStyles from "./RutinaNutricion.module.css";
import { supabase } from "../../assets/services/supabaseClient";
import { useAuth } from "../../context/AuthContext"; // 👈 Importante
import { FiCalendar, FiActivity, FiUser, FiCheckCircle, FiLoader, FiTrash2, FiPlus, FiEdit3 } from "react-icons/fi";
import {
  obtenerRutinaPorUsuario,
  obtenerTodasLasPendientes,
  eliminarRutinaPorUsuario
} from "../../assets/services/rutinasService";

const RutinaNutricion = ({ cliente }) => {
  const { user } = useAuth(); // 👈 Obtenemos el gym_id del staff
  const [pendientes, setPendientes] = useState([]);
  const [rutinaIndividual, setRutinaIndividual] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [editingData, setEditingData] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

useEffect(() => {
  const cargarDatos = async () => {
    if (!user?.gym_id) return;
    setLoading(true);
    try {
      if (cliente) {
        // Usamos el service
        const data = await obtenerRutinaPorUsuario(cliente.id);
        setRutinaIndividual(data);
      } else {
        // Usamos el service (que ya corregimos con .order('id'))
        const data = await obtenerTodasLasPendientes(user.gym_id);
        setPendientes(data || []);
      }
    } catch (err) {
      console.error("Error cargando rutinas:", err);
      // Opcional: mostrar un mensaje al usuario en lugar de solo consola
    } finally {
      setLoading(false);
    }
  };

  cargarDatos();
}, [cliente, user?.gym_id]);

  const handleEliminarRutina = async () => {
    try {
      setIsSaving(true);
      const targetId = cliente ? cliente.id : selectedRoutine.user_id;
      await eliminarRutinaPorUsuario(targetId);
      
      if (cliente) {
        setRutinaIndividual(null);
      } else {
        setPendientes(prev => prev.filter(r => r.id !== selectedRoutine.id));
      }
      
      setShowDeleteConfirm(false);
      setFeedback("✅ Rutina eliminada");
      setTimeout(() => setFeedback(""), 2000);
    } catch (err) {
      setFeedback("❌ Error al eliminar");
    } finally {
      setIsSaving(false);
    }
  };

  const revisarRutina = (routine) => {
    setSelectedRoutine(routine);
    const days = (routine.routine_days || []).sort((a, b) => a.order_index - b.order_index);
    const generated = days.map(d => ({
      dia: d.day_name,
      grupos: (d.muscle_blocks || []).sort((a, b) => a.order_index - b.order_index).map(b => ({
        label: b.muscle_name,
        exercises: (b.exercises || []).map(ex => {
          let reps = ex.reps || "";
          let rest = "";
          if (reps.includes("| Descanso:")) {
            [reps, rest] = reps.split("| Descanso:").map(s => s.trim());
          }
          return { name: ex.name, sets: ex.sets, reps, rest };
        })
      }))
    }));
    setEditingData(generated);
    setFeedback("");
    setShowModal(true);
  };

  // ... (Funciones auxiliares updateExercise, addExercise, removeExercise se mantienen igual)
  const updateExercise = (dayIdx, groupIdx, exIdx, field, value) => {
    const newData = [...editingData];
    newData[dayIdx].grupos[groupIdx].exercises[exIdx][field] = value;
    setEditingData(newData);
  };

  const addExercise = (dayIdx, groupIdx) => {
    const newData = [...editingData];
    newData[dayIdx].grupos[groupIdx].exercises.push({ name: "", sets: "", reps: "", rest: "" });
    setEditingData(newData);
  };

  const removeExercise = (dayIdx, groupIdx, exIdx) => {
    const newData = [...editingData];
    newData[dayIdx].grupos[groupIdx].exercises.splice(exIdx, 1);
    setEditingData(newData);
  };

  const aprobarRutina = async () => {
    if (!selectedRoutine?.user_id || !user?.gym_id) return;
    setIsSaving(true);
    setFeedback("Sincronizando con la App...");

    try {
      const userId = selectedRoutine.user_id;
      
      // 1. Limpiamos la rutina vieja para insertar la nueva versión validada
      await supabase.from('routines').delete().eq('user_id', userId);

      // 2. Insertamos la cabecera con is_active: true y el GYM_ID
      const { data: routineData, error: routineError } = await supabase
        .from('routines')
        .insert({ 
          user_id: userId, 
          gym_id: user.gym_id, // 👈 Vínculo multi-tenant
          name: `Plan Entrenamiento (Validado)`, 
          is_active: true 
        })
        .select().single();

      if (routineError) throw routineError;
      const routineId = routineData.id;

      // 3. Iteración de Días, Bloques y Ejercicios (Se mantiene tu lógica funcional)
      for (let dIdx = 0; dIdx < editingData.length; dIdx++) {
        const day = editingData[dIdx];
        const { data: dayData } = await supabase.from('routine_days').insert({ routine_id: routineId, day_name: day.dia, order_index: dIdx }).select().single();
        const dayId = dayData.id;

        for (let gIdx = 0; gIdx < day.grupos.length; gIdx++) {
          const group = day.grupos[gIdx];
          const { data: blockData } = await supabase.from('muscle_blocks').insert({ day_id: dayId, muscle_name: group.label.replace('_', ' '), order_index: gIdx }).select().single();
          const blockId = blockData.id;

          const exercisesToInsert = group.exercises
            .filter(ex => ex.name.trim() !== "")
            .map((ex) => ({
              block_id: blockId,
              name: ex.name,
              sets: String(ex.sets),
              reps: ex.rest ? `${ex.reps} | Descanso: ${ex.rest}` : ex.reps,
              video_url: null
            }));

          if (exercisesToInsert.length > 0) {
            await supabase.from('exercises').insert(exercisesToInsert);
          }
        }
      }

      // Refrescar UI
      if (cliente) {
        const refreshed = await obtenerRutinaPorUsuario(cliente.id);
        setRutinaIndividual(refreshed);
      } else {
        setPendientes(prev => prev.filter(r => r.id !== selectedRoutine.id));
      }

      setFeedback("¡Rutina validada y enviada al cliente!");
      setTimeout(() => {
        setShowModal(false);
        setFeedback("");
        setIsSaving(false);
      }, 1500);

    } catch (e) {
      console.error(e);
      setFeedback("Error en la sincronización.");
      setIsSaving(false);
    }
  };

  // ... (renderModal y renderDeleteModal se mantienen igual con tus estilos)
  const renderModal = () => (
    <div className={localStyles.modalOverlay} onClick={() => setShowModal(false)}>
      <div className={localStyles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={localStyles.modalHeader}>
          <h3 style={{ margin: 0, color: '#0f172a', fontWeight: '800' }}>🏋️ Gestionar Rutina</h3>
          <button className={localStyles.modalCloseBtn} onClick={() => setShowModal(false)}>×</button>
        </div>
        <div className={localStyles.modalBody}>
          {editingData.map((dia, dayIdx) => (
            <div key={dayIdx} className={localStyles.editableCard}>
              <div className={localStyles.editableHeader}>{dia.dia}</div>
              {dia.grupos.map((grupo, groupIdx) => (
                <React.Fragment key={groupIdx}>
                  <div className={localStyles.groupLabel}>{grupo.label.replace('_', ' ')}</div>
                  {grupo.exercises.length > 0 && (
                    <div style={{ display: 'flex', gap: '12px', padding: '0 4px', marginBottom: '8px', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                      <span style={{ flex: 1 }}>Ejercicio</span>
                      <span style={{ width: '70px', textAlign: 'center' }}>Series</span>
                      <span style={{ width: '90px', textAlign: 'center' }}>Reps</span>
                      <span style={{ width: '120px', textAlign: 'center' }}>Descanso</span>
                      <span style={{ width: '36px' }}></span>
                    </div>
                  )}
                  {grupo.exercises.map((ex, exIdx) => (
                    <div key={exIdx} className={localStyles.editableRow}>
                      <input className={localStyles.inputClean} style={{ flex: 1 }} value={ex.name} onChange={(e) => updateExercise(dayIdx, groupIdx, exIdx, 'name', e.target.value)} />
                      <input className={localStyles.inputClean} style={{ textAlign: 'center', width: '70px', flex: 'none' }} value={ex.sets} onChange={(e) => updateExercise(dayIdx, groupIdx, exIdx, 'sets', e.target.value)} />
                      <input className={localStyles.inputClean} style={{ textAlign: 'center', width: '90px', flex: 'none' }} value={ex.reps} onChange={(e) => updateExercise(dayIdx, groupIdx, exIdx, 'reps', e.target.value)} />
                      <input className={localStyles.inputClean} style={{ textAlign: 'center', width: '120px', flex: 'none' }} value={ex.rest} onChange={(e) => updateExercise(dayIdx, groupIdx, exIdx, 'rest', e.target.value)} />
                      <button className={localStyles.btnRemoveExercise} onClick={() => removeExercise(dayIdx, groupIdx, exIdx)}><FiTrash2 /></button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                    <button className={localStyles.btnAddExercise} onClick={() => addExercise(dayIdx, groupIdx)}><FiPlus /> Agregar Ejercicio</button>
                  </div>
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>
        <div className={localStyles.modalFooter}>
          <div style={{ marginRight: 'auto', fontWeight: '600', color: feedback.includes('Error') ? '#dc2626' : '#059669' }}>{feedback}</div>
          <button className={localStyles.btnCancel} onClick={() => setShowModal(false)} disabled={isSaving}>Cancelar</button>
          <button className={localStyles.btnSave} onClick={aprobarRutina} disabled={isSaving}>{isSaving ? "Guardando..." : "Validar y Publicar"}</button>
        </div>
      </div>
    </div>
  );

  const renderDeleteModal = () => (
    <div className={localStyles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
      <div className={localStyles.deleteModal} onClick={e => e.stopPropagation()}>
        <div className={localStyles.deleteIconBox}>
          <FiTrash2 size={30} />
        </div>
        <h3>¿Eliminar rutina?</h3>
        <p>Esta acción quitará el plan de entrenamiento. No se puede deshacer.</p>
        <div className={localStyles.deleteActions}>
          <button className={localStyles.btnCancelDelete} onClick={() => setShowDeleteConfirm(false)} disabled={isSaving}>Cancelar</button>
          <button className={localStyles.btnConfirmDelete} onClick={handleEliminarRutina} disabled={isSaving}>
            {isSaving ? "Eliminando..." : "Sí, eliminar"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {cliente ? (
        <div className={localStyles.perfilModule}>
          <div className={localStyles.perfilHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiActivity color="#7c3aed" />
              <h4 style={{ margin: 0, color: '#1e293b' }}>Estado de Rutina</h4>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}><FiLoader className={localStyles.spinner} /></div>
          ) : !rutinaIndividual ? (
            <div className={localStyles.emptyStateSmall}>
              <p>No posee rutinas registradas.</p>
            </div>
          ) : (
            <div className={localStyles.rutinaPreview}>
              <div className={localStyles.previewTop}>
                <div className={rutinaIndividual.is_active ? localStyles.statusActive : localStyles.statusPending}>
                  {rutinaIndividual.is_active ? "✅ Rutina Validada" : "⏳ Pendiente"}
                </div>
                <div className={localStyles.previewActions}>
                  <button className={localStyles.btnIconManage} onClick={() => revisarRutina(rutinaIndividual)} title="Gestionar">
                    <FiEdit3 size={14} />
                  </button>
                  <button className={localStyles.btnIconDelete} onClick={() => setShowDeleteConfirm(true)} title="Eliminar">
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
              <p className={localStyles.planNameText}>{rutinaIndividual.name}</p>
              <small className={localStyles.daysCount}>{rutinaIndividual.routine_days?.length || 0} días asignados</small>
            </div>
          )}
        </div>
      ) : (
        <div className={localStyles.pageContainer}>
          <div className={localStyles.header}>
            <h2>Bandeja de Solicitudes</h2>
            <p>Rutinas generadas por clientes esperando revisión en <strong>{user?.gym_name}</strong>.</p>
          </div>
          {loading ? (
            <div className={localStyles.loadingContainer}><FiLoader className={localStyles.spinner} /><p>Sincronizando...</p></div>
          ) : pendientes.length === 0 ? (
            <div className={localStyles.emptyState}>
              <div className={localStyles.emptyIconWrapper}>
                 <FiCheckCircle size={60} color="#10b981" />
              </div>
              <h3>¡Todo al día!</h3>
              <p>No hay solicitudes pendientes en esta sucursal.</p>
            </div>
          ) : (
            <div className={localStyles.grid}>
              {pendientes.map((rutina) => (
                <div key={rutina.id} className={localStyles.card}>
                  <span className={localStyles.badge}>NUEVA SOLICITUD</span>
                  <p className={localStyles.clientName}><FiUser color="#3b82f6" /> {rutina.users?.first_name} {rutina.users?.last_name}</p>
                  <p className={localStyles.routineName}><FiActivity color="#94a3b8" /> {rutina.name}</p>
                  <p className={localStyles.dateText}><FiCalendar color="#94a3b8" /> Ingresada recientemente</p>
                  <button className={localStyles.btnPrimary} onClick={() => revisarRutina(rutina)}>Revisar y Validar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && renderModal()}
      {showDeleteConfirm && renderDeleteModal()}
    </>
  );
};

export default RutinaNutricion;