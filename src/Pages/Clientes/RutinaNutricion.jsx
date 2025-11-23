import React, { useState } from "react"
import { Tab } from "@headlessui/react"
import localStyles from "./RutinaNutricion.module.css"

/* ==========================================================================
   CONFIGURACIÓN & DATA POOLS
   ========================================================================== */
const API_BASE_URL = "https://crmgym-api-test-czbbe4hkdpcaaqhk.chilecentral-01.azurewebsites.net";

// --- POOLS DE EJERCICIOS ---
const pools = {
  pecho_sup: [
    { name: "Press inclinado con mancuernas", joints: ["pecho", "hombro"], riskyTags: [], equipment: "manc" },
    { name: "Aperturas inclinadas", joints: ["pecho", "hombro"], riskyTags: [], equipment: "manc" },
    { name: "Press inclinado en máquina", joints: ["pecho", "hombro"], riskyTags: ["machine_safe"], equipment: "maquina" },
  ],
  pecho_mid: [
    { name: "Press plano con mancuernas", joints: ["pecho", "hombro"], riskyTags: [], equipment: "manc" },
    { name: "Press en máquina sentado", joints: ["pecho", "hombro"], riskyTags: ["machine_safe"], equipment: "maquina" },
    { name: "Press plano con barra", joints: ["pecho", "hombro"], riskyTags: ["barbell", "axial_load"], equipment: "barra" },
  ],
  pecho_inf: [
    { name: "Press declinado en máquina", joints: ["pecho", "hombro"], riskyTags: ["machine_safe"], equipment: "maquina" },
    { name: "Fondos asistidos", joints: ["pecho", "hombro", "codo"], riskyTags: ["bodyweight"], equipment: "bodyweight" },
  ],
  espalda_altas: [
    { name: "Jalón en polea al pecho", joints: ["espalda", "hombro"], riskyTags: ["machine_safe"], equipment: "maquina" },
    { name: "Remo sentado en máquina", joints: ["espalda", "codo"], riskyTags: ["machine_safe"], equipment: "maquina" },
    { name: "Remo con mancuerna", joints: ["espalda", "codo"], riskyTags: [], equipment: "manc" },
  ],
  espalda_baja: [
    { name: "Remo con mancuerna (unilateral)", joints: ["espalda", "codo"], riskyTags: [], equipment: "manc" },
    { name: "Extensiones lumbares suaves", joints: ["espalda"], riskyTags: ["extension", "lumbar_load"], equipment: "bench" },
    { name: "Peso muerto rumano (mancuernas)", joints: ["espalda", "cadera"], riskyTags: ["lumbar_load", "hip_hinge"], equipment: "manc" },
  ],
  quads: [
    { name: "Prensa de piernas", joints: ["rodilla", "cadera"], riskyTags: ["machine_safe"], equipment: "maquina" },
    { name: "Sentadilla Goblet (mancuerna)", joints: ["rodilla", "cadera"], riskyTags: ["axial_load"], equipment: "manc" },
    { name: "Sillón de cuádriceps", joints: ["rodilla"], riskyTags: ["isolation"], equipment: "maquina" },
  ],
  femorales_gluteos: [
    { name: "Hip Thrust (Puente glúteo)", joints: ["cadera", "gluteo"], riskyTags: ["hip_thrust_safe"], equipment: "manc" },
    { name: "Sillón femoral sentado", joints: ["rodilla"], riskyTags: ["machine_safe"], equipment: "maquina" },
    { name: "Estocadas estáticas", joints: ["rodilla", "cadera"], riskyTags: [], equipment: "bodyweight" },
  ],
  gemelos: [
    { name: "Elevación de talones sentado", joints: ["tobillo"], riskyTags: ["machine_safe"], equipment: "maquina" },
    { name: "Elevación de talones parado", joints: ["tobillo"], riskyTags: [], equipment: "bodyweight" },
  ],
  deltoides: [
    { name: "Press de hombros con mancuernas", joints: ["hombro"], riskyTags: [], equipment: "manc" },
    { name: "Vuelos laterales", joints: ["hombro"], riskyTags: [], equipment: "manc" },
    { name: "Face-pull (polea)", joints: ["hombro", "escapula"], riskyTags: [], equipment: "cable" },
  ],
  biceps: [
    { name: "Curl con mancuernas", joints: ["codo"], riskyTags: [], equipment: "manc" },
    { name: "Curl martillo", joints: ["codo", "antebrazo"], riskyTags: [], equipment: "manc" },
    { name: "Curl en máquina scott", joints: ["codo"], riskyTags: ["machine_safe"], equipment: "maquina" },
  ],
  triceps: [
    { name: "Tríceps en polea (cuerda)", joints: ["codo"], riskyTags: ["machine_safe"], equipment: "cable" },
    { name: "Fondos en paralela asistidos", joints: ["codo", "hombro"], riskyTags: ["bodyweight"], equipment: "bodyweight" },
  ],
  core: [
    { name: "Plancha abdominal (isométrico)", joints: ["core"], riskyTags: ["isometric"], equipment: "bodyweight" },
    { name: "Crunch abdominal corto", joints: ["core"], riskyTags: ["motor_control"], equipment: "bodyweight" },
  ],
};

const safeByGroup = {
  espalda_baja: [{ name: "Remo en máquina con respaldo", joints: ["espalda", "codo"], riskyTags: ["machine_safe"], equipment: "maquina" }],
  pecho_sup: [{ name: "Press inclinado en máquina", joints: ["pecho", "hombro"], riskyTags: ["machine_safe"], equipment: "maquina" }],
  quads: [{ name: "Prensa de piernas (recorrido corto)", joints: ["rodilla", "cadera"], riskyTags: ["machine_safe"], equipment: "maquina" }],
};

const safeGeneral = {
  rodilla: [{ name: "Bicicleta estática", joints: [], riskyTags: ["cardio_lowimpact"], equipment: "bike" }],
  espalda: [{ name: "Plancha isométrica", joints: ["core"], riskyTags: ["motor_control"], equipment: "bodyweight" }],
  hombro: [{ name: "Vuelos laterales (liviano)", joints: ["hombro"], riskyTags: [], equipment: "manc" }],
};

const splits = {
  2: [
    ["pecho_mid", "espalda_altas", "quads", "femorales_gluteos", "deltoides", "biceps", "triceps", "core"],
    ["pecho_sup", "pecho_inf", "espalda_baja", "gemelos", "deltoides", "biceps", "triceps", "core"],
  ],
  3: [
    ["pecho_sup", "pecho_mid", "deltoides", "triceps"],
    ["espalda_altas", "espalda_baja", "biceps", "core"],
    ["quads", "femorales_gluteos", "gemelos"],
  ],
  4: [
    ["pecho_mid", "espalda_altas", "deltoides", "biceps"],
    ["quads", "femorales_gluteos", "core", "gemelos"],
    ["pecho_sup", "espalda_baja", "deltoides", "triceps"],
    ["quads", "femorales_gluteos", "core", "gemelos"],
  ],
  5: [
    ["pecho_sup", "pecho_mid", "deltoides"],
    ["espalda_altas", "espalda_baja", "biceps"],
    ["quads", "femorales_gluteos", "gemelos"],
    ["pecho_mid", "espalda_altas", "deltoides"],
    ["biceps", "triceps", "core"],
  ],
};

// --- POOLS DE COMIDAS ---
const FOOD_POOLS = {
  desayuno: [
    { name: "Avena con leche", kcal: 300, tags: ["dairy", "higher_carb"] },
    { name: "Yogur natural con frutas", kcal: 200, tags: ["dairy"] },
    { name: "Tostadas integrales con palta", kcal: 320, tags: ["gluten"] },
    { name: "Huevos revueltos (2 u)", kcal: 180, tags: ["protein_rich"] },
    { name: "Omelette claras y espinaca", kcal: 150, tags: ["protein_rich", "low_carb"] },
  ],
  almuerzo: [
    { name: "Pechuga de pollo con arroz", kcal: 450, tags: ["meat", "higher_carb"] },
    { name: "Merluza al horno con puré", kcal: 420, tags: ["fish"] },
    { name: "Bowl garbanzos y verduras", kcal: 460, tags: ["vegetarian", "gluten_free"] },
    { name: "Fideos con salsa fileto", kcal: 500, tags: ["gluten", "vegetarian", "higher_carb"] },
  ],
  cena: [
    { name: "Ensalada con atún al natural", kcal: 300, tags: ["fish", "protein_rich"] },
    { name: "Tortilla de acelga/espinaca", kcal: 260, tags: ["vegetarian"] },
    { name: "Salmón grillado con brócoli", kcal: 380, tags: ["fish", "protein_rich"] },
    { name: "Pollo al horno con calabaza", kcal: 400, tags: ["meat"] },
  ],
  colacion: [
    { name: "Puñado de frutos secos", kcal: 180, tags: ["higher_fat"] },
    { name: "Yogur griego", kcal: 100, tags: ["dairy", "protein_rich"] },
    { name: "Manzana verde", kcal: 70, tags: ["low_sugar"] },
    { name: "Barrita de cereal", kcal: 120, tags: ["gluten", "higher_sugar"] },
  ],
};

const SUBSTITUTIONS = {
  lactosa: { avoidTags: ["dairy"], preferTags: ["dairy_free"] },
  celiaca: { avoidTags: ["gluten"], preferTags: ["gluten_free"] },
  diabetes: { avoidTags: ["higher_sugar"], preferTags: ["low_sugar"] },
  vegetariano: { avoidTags: ["meat", "fish"], preferTags: ["vegetarian"] },
  vegano: { avoidTags: ["meat", "fish", "dairy", "egg"], preferTags: ["vegan"] },
};

/* ==========================================================================
   HELPERS
   ========================================================================== */
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const containsAny = (haystack = [], needles = []) => {
  if (!needles) return false;
  return needles.some(n => haystack.includes(n));
};

const planForMuscle = (edadNum, nivel) => {
  let weeklyTarget = nivel === "avanzado" ? 15 : nivel === "intermedio" ? 11 : 8;
  if (edadNum >= 60) weeklyTarget = Math.round(weeklyTarget * 0.8);
  
  const repsRange = edadNum >= 60 ? "12-15" : nivel === "avanzado" ? "6-10" : "8-12";
  const rest = edadNum >= 60 ? "90s" : "60-90s";
  return { sets: 3, repsRange, rest };
};

/* ==========================================================================
   COMPONENTE PRINCIPAL
   ========================================================================== */
const RutinaNutricion = ({ cliente, styles: parentStyles }) => {
  
  // ---------------- STATE: RUTINA ----------------
  const [rutinaForm, setRutinaForm] = useState({
    edad: "",
    nivel: "principiante",
    dias: 3,
    hasLesion: "no",
  });
  const [lesiones, setLesiones] = useState([]);

  // ---------------- STATE: DIETA ----------------
  const [dietaForm, setDietaForm] = useState({
    objetivo: "",
    peso: "",
    dias: 7,
    hasCondicion: "no",
  });
  const [condiciones, setCondiciones] = useState([]);

  // ---------------- STATE: MODAL & EDICIÓN ----------------
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState(null); // 'rutina' | 'dieta'
  const [editingData, setEditingData] = useState(null); // El JSON que se edita en vivo
  const [feedback, setFeedback] = useState("");

  // --- Handlers UI Formularios ---
  const handleAddLesion = () => setLesiones(prev => [...prev, ""]);
  const handleUpdateLesion = (i, val) => setLesiones(prev => prev.map((l, idx) => idx === i ? val : l));
  const handleRemoveLesion = (i) => setLesiones(prev => prev.filter((_, idx) => idx !== i));
  const handleAddCondicion = () => setCondiciones(prev => [...prev, ""]);
  const handleUpdateCondicion = (i, val) => setCondiciones(prev => prev.map((c, idx) => idx === i ? val : c));
  const handleRemoveCondicion = (i) => setCondiciones(prev => prev.filter((_, idx) => idx !== i));

  /* ==================== GENERACIÓN: RUTINA ==================== */
  const previsualizarRutina = () => {
    const edadNum = parseInt(rutinaForm.edad) || 30;
    const template = splits[rutinaForm.dias] || splits[3];
    const lesionesActivas = rutinaForm.hasLesion === "si" ? lesiones.filter(Boolean) : [];
    const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    
    const generated = [];

    template.forEach((dayGroups, idx) => {
      const gruposHoy = [];
      dayGroups.forEach(gKey => {
        const pool = pools[gKey] || [];
        const plan = planForMuscle(edadNum, rutinaForm.nivel);
        
        // Filtrar ejercicios peligrosos para las lesiones
        let candidates = pool.filter(ex => {
            if (!lesionesActivas.length) return true;
            // Si la articulacion lesionada esta en los 'joints' del ejercicio, se descarta
            return !lesionesActivas.some(lesion => (ex.joints || []).includes(lesion));
        });

        // Si nos quedamos sin ejercicios, buscar en 'safeGeneral' o 'safeByGroup'
        if (candidates.length === 0 && lesionesActivas.length > 0) {
            const fallback = (safeByGroup[gKey] || []).concat(safeGeneral[lesionesActivas[0]] || []);
            candidates = fallback;
        }

        // Seleccionar 2 ejercicios random del pool filtrado
        const selected = shuffle(candidates).slice(0, 2).map(ex => ({
          name: ex.name,
          sets: plan.sets,
          reps: plan.repsRange,
          rest: plan.rest,
        }));
        
        if (selected.length > 0) {
            gruposHoy.push({ label: gKey, exercises: selected });
        }
      });
      
      generated.push({ dia: dayNames[idx] || `Día ${idx+1}`, grupos: gruposHoy });
    });

    setEditingData(generated);
    setModalMode('rutina');
    setFeedback("");
    setShowModal(true);
  };

  /* ==================== GENERACIÓN: DIETA ==================== */
  const previsualizarDieta = () => {
    const condsActivas = dietaForm.hasCondicion === "si" ? condiciones.filter(Boolean) : [];
    const daysNum = parseInt(dietaForm.dias) || 7;
    const meals = ["desayuno", "almuerzo", "cena", "colacion"];
    const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    
    const plan = {}; // Objeto: { "Lunes": { "desayuno": [...] }, ... }

    for (let d = 0; d < daysNum; d++) {
        const dayPlan = {};
        meals.forEach(mealKey => {
            const pool = shuffle(FOOD_POOLS[mealKey] || []);
            const selected = [];
            let i = 0;

            // Seleccionar hasta 2 comidas que cumplan condiciones
            while (selected.length < 2 && i < pool.length) {
                const raw = pool[i++];
                const tags = raw.tags || [];
                
                // Verificar conflicto con condiciones
                const conflict = condsActivas.some(c => containsAny(tags, SUBSTITUTIONS[c]?.avoidTags));
                
                if (!conflict) {
                    selected.push({ food: { name: raw.name, kcal: raw.kcal } });
                } else {
                    // Intentar buscar sustituto (lógica simplificada para demo)
                    // Si es conflicto, tratamos de buscar uno que NO tenga conflicto en todo el pool
                    // En un caso real, esto sería más complejo.
                }
            }
            
            // Si no encontramos suficientes (ej. filtros muy estrictos), rellenamos con algo genérico
            if (selected.length === 0 && pool.length > 0) {
                selected.push({ food: { name: pool[0].name + " (Revisar intolerancia)", kcal: pool[0].kcal } });
            }

            dayPlan[mealKey] = selected;
        });
        plan[dayNames[d % 7]] = dayPlan;
    }

    setEditingData(plan);
    setModalMode('dieta');
    setFeedback("");
    setShowModal(true);
  };

  /* ==================== EDICIÓN (MODAL) ==================== */
  const updateExercise = (dayIdx, groupIdx, exIdx, field, value) => {
    const newData = [...editingData];
    const day = { ...newData[dayIdx] };
    const group = { ...day.grupos[groupIdx] };
    const exercises = [...group.exercises];
    
    exercises[exIdx] = { ...exercises[exIdx], [field]: value };
    group.exercises = exercises;
    day.grupos[groupIdx] = group;
    newData[dayIdx] = day;
    setEditingData(newData);
  };

  const updateFood = (dayKey, mealKey, foodIdx, field, value) => {
    const newData = { ...editingData };
    const dayMeals = { ...newData[dayKey] };
    const items = [...dayMeals[mealKey]];
    
    const item = { ...items[foodIdx] };
    const food = { ...item.food, [field]: value };
    
    item.food = food;
    items[foodIdx] = item;
    dayMeals[mealKey] = items;
    newData[dayKey] = dayMeals;
    setEditingData(newData);
  };

  /* ==================== GUARDAR API ==================== */
  const guardarCambios = async () => {
    if (!cliente?.id) {
        setFeedback("Error: No se detectó un ID de cliente válido.");
        return;
    }
    setFeedback("Guardando...");
    
    try {
        if (modalMode === 'rutina') {
            const payload = {
                clientId: cliente.id,
                age: parseInt(rutinaForm.edad) || 0,
                level: rutinaForm.nivel,
                daysPerWeek: rutinaForm.dias,
                physicalConditions: lesiones.filter(Boolean),
                rutinaJson: JSON.stringify(editingData) // Guardamos la estructura editada
            };
            
            // Ajustar endpoint según tu API real
            await fetch(`${API_BASE_URL}/api/client-state`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            setFeedback("¡Rutina guardada en historial!");
        } 
        else if (modalMode === 'dieta') {
             const payload = {
                clientId: cliente.id,
                goal: dietaForm.objetivo,
                weightKg: Number(dietaForm.peso) || 0,
                conditionsJson: JSON.stringify({ condiciones: condiciones.filter(Boolean) }),
                dietDays: parseInt(dietaForm.dias),
                menuJson: JSON.stringify(editingData)
            };

            await fetch(`${API_BASE_URL}/api/diet-states`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            setFeedback("¡Dieta guardada en historial!");
        }
        
        setTimeout(() => {
            setShowModal(false);
            setFeedback("");
        }, 1500);

    } catch (e) {
        console.error(e);
        setFeedback("Error de conexión al guardar.");
    }
  };

  /* ==================== RENDER ==================== */
  return (
    <>
      {/* TARJETA PRINCIPAL (FORMULARIOS) */}
      <div className={`${localStyles.rutinaNutricionCard} ${parentStyles?.rutinaNutricionCard || ""}`}>
        <div className={localStyles.sectionHeaderRow}>
          <h3>Generador IA</h3>
          <span className={localStyles.badgeSecondary}>Configuración</span>
        </div>

        <Tab.Group>
          <Tab.List className={localStyles.tabList}>
            <Tab className={({ selected }) => `${localStyles.tabItem} ${selected ? localStyles.tabItemActive : ""}`}>
              Rutina
            </Tab>
            <Tab className={({ selected }) => `${localStyles.tabItem} ${selected ? localStyles.tabItemActive : ""}`}>
              Nutrición
            </Tab>
          </Tab.List>

          <Tab.Panels className={localStyles.tabPanels}>
            
            {/* PANEL RUTINA */}
            <Tab.Panel>
              <div className={localStyles.formGrid}>
                <div className={localStyles.formField}>
                  <label>Edad</label>
                  <input type="number" value={rutinaForm.edad} onChange={e => setRutinaForm({...rutinaForm, edad: e.target.value})} placeholder="Ej: 30" />
                </div>
                <div className={localStyles.formField}>
                  <label>Nivel</label>
                  <select value={rutinaForm.nivel} onChange={e => setRutinaForm({...rutinaForm, nivel: e.target.value})}>
                    <option value="principiante">Principiante</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="avanzado">Avanzado</option>
                  </select>
                </div>
                <div className={localStyles.formField}>
                  <label>Días / semana</label>
                  <select value={rutinaForm.dias} onChange={e => setRutinaForm({...rutinaForm, dias: Number(e.target.value)})}>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                </div>
                <div className={localStyles.formField}>
                  <label>¿Lesiones?</label>
                  <select value={rutinaForm.hasLesion} onChange={e => setRutinaForm({...rutinaForm, hasLesion: e.target.value})}>
                    <option value="no">No</option>
                    <option value="si">Sí</option>
                  </select>
                </div>

                {rutinaForm.hasLesion === "si" && (
                  <div className={`${localStyles.formField} ${localStyles.formFieldFull}`}>
                     <label>Zonas lesionadas:</label>
                     <div className={localStyles.dynamicList}>
                       {lesiones.map((l, idx) => (
                         <div key={idx} className={localStyles.dynamicItem}>
                           <select value={l} onChange={e => handleUpdateLesion(idx, e.target.value)}>
                              <option value="">Seleccionar...</option>
                              <option value="rodilla">Rodilla</option>
                              <option value="espalda">Espalda / Lumbar</option>
                              <option value="hombro">Hombro</option>
                              <option value="codo">Codo</option>
                           </select>
                           <button type="button" onClick={() => handleRemoveLesion(idx)} className={localStyles.btnSmallRemove}>✕</button>
                         </div>
                       ))}
                       <button type="button" onClick={handleAddLesion} className={localStyles.btnSmallAdd}>+ Agregar</button>
                     </div>
                  </div>
                )}

                <div className={localStyles.formActions}>
                  <button type="button" className={localStyles.btnPrimary} onClick={previsualizarRutina}>
                    Previsualizar Rutina
                  </button>
                </div>
              </div>
            </Tab.Panel>

            {/* PANEL NUTRICIÓN */}
            <Tab.Panel>
              <div className={localStyles.formGrid}>
                <div className={localStyles.formField}>
                  <label>Objetivo</label>
                  <select value={dietaForm.objetivo} onChange={e => setDietaForm({...dietaForm, objetivo: e.target.value})}>
                    <option value="">Seleccionar...</option>
                    <option value="definicion">Definición (Perder grasa)</option>
                    <option value="volumen">Volumen (Ganar masa)</option>
                    <option value="mantenimiento">Mantenimiento</option>
                  </select>
                </div>
                <div className={localStyles.formField}>
                  <label>Peso (kg)</label>
                  <input type="number" value={dietaForm.peso} onChange={e => setDietaForm({...dietaForm, peso: e.target.value})} placeholder="Ej: 75" />
                </div>
                <div className={localStyles.formField}>
                  <label>Duración Plan</label>
                  <select value={dietaForm.dias} onChange={e => setDietaForm({...dietaForm, dias: e.target.value})}>
                    <option value="3">3 días</option>
                    <option value="5">5 días</option>
                    <option value="7">7 días</option>
                  </select>
                </div>
                <div className={localStyles.formField}>
                  <label>Condiciones</label>
                  <select value={dietaForm.hasCondicion} onChange={e => setDietaForm({...dietaForm, hasCondicion: e.target.value})}>
                    <option value="no">No</option>
                    <option value="si">Sí</option>
                  </select>
                </div>

                {dietaForm.hasCondicion === "si" && (
                  <div className={`${localStyles.formField} ${localStyles.formFieldFull}`}>
                     <label>Condiciones / Intolerancias:</label>
                     <div className={localStyles.dynamicList}>
                       {condiciones.map((c, idx) => (
                         <div key={idx} className={localStyles.dynamicItem}>
                           <select value={c} onChange={e => handleUpdateCondicion(idx, e.target.value)}>
                              <option value="">Seleccionar...</option>
                              <option value="lactosa">Intolerancia Lactosa</option>
                              <option value="celiaca">Celiaquía</option>
                              <option value="diabetes">Diabetes</option>
                              <option value="vegetariano">Vegetariano</option>
                              <option value="vegano">Vegano</option>
                           </select>
                           <button type="button" onClick={() => handleRemoveCondicion(idx)} className={localStyles.btnSmallRemove}>✕</button>
                         </div>
                       ))}
                       <button type="button" onClick={handleAddCondicion} className={localStyles.btnSmallAdd}>+ Agregar</button>
                     </div>
                  </div>
                )}

                <div className={localStyles.formActions}>
                  <button type="button" className={localStyles.btnPrimary} onClick={previsualizarDieta}>
                    Previsualizar Dieta
                  </button>
                </div>
              </div>
            </Tab.Panel>

          </Tab.Panels>
        </Tab.Group>
      </div>

      {/* ==================== MODAL (POP-UP) ==================== */}
      {showModal && editingData && (
        <div className={localStyles.modalOverlay}>
          <div className={localStyles.modalContent}>
            
            {/* Modal Header */}
            <div className={localStyles.modalHeader}>
              <div className={localStyles.modalTitle}>
                 {modalMode === 'rutina' ? '🏋️ Editar Rutina Generada' : '🥗 Editar Menú Generado'}
              </div>
              <button className={localStyles.modalCloseBtn} onClick={() => setShowModal(false)}>×</button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className={localStyles.modalBody}>
                
                {/* --- MODO RUTINA --- */}
                {modalMode === 'rutina' && editingData.map((dia, dayIdx) => (
                    <div key={dayIdx} className={localStyles.editableCard}>
                        <div className={localStyles.editableHeader}>{dia.dia}</div>
                        {dia.grupos.map((grupo, groupIdx) => (
                            <React.Fragment key={groupIdx}>
                                <div className={localStyles.groupLabel}>{grupo.label.replace('_',' ')}</div>
                                {grupo.exercises.map((ex, exIdx) => (
                                    <div key={exIdx} className={localStyles.editableRow}>
                                        <input 
                                            className={localStyles.inputClean} 
                                            value={ex.name} 
                                            onChange={(e) => updateExercise(dayIdx, groupIdx, exIdx, 'name', e.target.value)}
                                            placeholder="Ejercicio"
                                        />
                                        <input 
                                            className={localStyles.inputClean} 
                                            style={{textAlign: 'center'}}
                                            value={ex.sets} 
                                            onChange={(e) => updateExercise(dayIdx, groupIdx, exIdx, 'sets', e.target.value)}
                                            placeholder="Sets"
                                        />
                                        <input 
                                            className={localStyles.inputClean} 
                                            style={{textAlign: 'center'}}
                                            value={ex.reps} 
                                            onChange={(e) => updateExercise(dayIdx, groupIdx, exIdx, 'reps', e.target.value)}
                                            placeholder="Reps"
                                        />
                                        <input 
                                            className={localStyles.inputClean} 
                                            value={ex.rest} 
                                            onChange={(e) => updateExercise(dayIdx, groupIdx, exIdx, 'rest', e.target.value)}
                                            placeholder="Descanso"
                                        />
                                    </div>
                                ))}
                            </React.Fragment>
                        ))}
                    </div>
                ))}

                {/* --- MODO DIETA --- */}
                {modalMode === 'dieta' && Object.entries(editingData).map(([dayKey, meals]) => (
                    <div key={dayKey} className={localStyles.editableCard}>
                         <div className={localStyles.editableHeader}>{dayKey}</div>
                         {Object.entries(meals).map(([mealKey, items]) => (
                             <React.Fragment key={mealKey}>
                                 <div className={localStyles.groupLabel} style={{color: '#6b7280'}}>{mealKey}</div>
                                 {items.map((it, idx) => (
                                     <div key={idx} className={localStyles.editableRowDiet}>
                                         <input 
                                            className={localStyles.inputClean}
                                            value={it.food.name}
                                            onChange={(e) => updateFood(dayKey, mealKey, idx, 'name', e.target.value)}
                                         />
                                         <div style={{display:'flex', alignItems:'center'}}>
                                            <input 
                                                className={localStyles.inputClean}
                                                style={{textAlign:'right'}}
                                                value={it.food.kcal}
                                                type="number"
                                                onChange={(e) => updateFood(dayKey, mealKey, idx, 'kcal', e.target.value)}
                                            />
                                            <span style={{fontSize:'12px', color:'#9ca3af', marginLeft:'4px'}}>kcal</span>
                                         </div>
                                     </div>
                                 ))}
                             </React.Fragment>
                         ))}
                    </div>
                ))}
            </div>

            {/* Modal Footer */}
            <div className={localStyles.modalFooter}>
                <div style={{marginRight:'auto', fontWeight:'600', color: feedback.includes('Error') ? 'crimson' : '#059669'}}>
                    {feedback}
                </div>
                <button className={localStyles.btnCancel} onClick={() => setShowModal(false)}>
                    Cancelar
                </button>
                <button className={localStyles.btnSave} onClick={guardarCambios}>
                    Confirmar y Guardar
                </button>
            </div>
          
          </div>
        </div>
      )}
    </>
  )
}

export default RutinaNutricion