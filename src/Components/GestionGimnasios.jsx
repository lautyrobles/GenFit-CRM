import React, { useState, useEffect } from 'react';
import styles from './GestionGimnasios.module.css';
import { 
  crearNuevoGimnasio, 
  obtenerTodosLosGimnasios, 
  obtenerTodosLosSuperAdmins,
  actualizarSuperAdmin,
  toggleStatusSuperAdmin 
} from '../assets/services/superAdminService';
import { registerUser } from '../assets/services/authService';
import Loader from '../Components/Loader/Loader';
import { Building2, ShieldCheck, UserPlus, Globe, ShieldAlert, Trash2, Edit2, Power, PowerOff, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const GestionGimnasios = () => {
  const { user: currentUser } = useAuth();
  const [gyms, setGyms] = useState([]);
  const [superAdmins, setSuperAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [esNuevoSuperAdmin, setEsNuevoSuperAdmin] = useState(false);
  const [editMode, setEditMode] = useState(null);

  const [formData, setFormData] = useState({
    gymName: '', adminNombre: '', adminApellido: '', adminEmail: '', adminPassword: '', adminDni: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [gymsData, saData] = await Promise.all([
        obtenerTodosLosGimnasios(),
        obtenerTodosLosSuperAdmins()
      ]);
      setGyms(gymsData);
      setSuperAdmins(saData);
    } catch (e) {
      console.error("Error al sincronizar ecosistema:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const abrirEdicionSA = (sa) => {
    setEditMode(sa.id);
    setEsNuevoSuperAdmin(true);
    setFormData({
      gymName: '',
      adminNombre: sa.first_name,
      adminApellido: sa.last_name,
      adminEmail: sa.email,
      adminPassword: '', // Se deja vacío para que solo cambie si se escribe algo nuevo
      adminDni: sa.dni || ''
    });
    setShowModal(true);
  };

  const handleToggleSA = async (sa) => {
    if (sa.email === currentUser.email) return alert("No podés bloquear tu propia cuenta.");
    const accion = sa.enabled ? "bloquear" : "activar";
    if (!window.confirm(`¿Estás seguro de ${accion} al SuperAdmin ${sa.email}?`)) return;
    
    try {
      setLoading(true);
      await toggleStatusSuperAdmin(sa.id, !sa.enabled);
      alert(`Usuario ${sa.enabled ? 'bloqueado' : 'activado'} correctamente.`);
      cargarDatos();
    } catch (e) {
      alert("Error al cambiar estado: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAltaCompleta = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editMode) {
        await actualizarSuperAdmin(editMode, {
          first_name: formData.adminNombre,
          last_name: formData.adminApellido,
          dni: formData.adminDni,
          username: formData.adminEmail,
          email: formData.adminEmail,
          password: formData.adminPassword // Se envía (puede ir vacío)
        });
        alert("Perfil actualizado correctamente");
      } else {
        let targetGymId = null;
        const targetRole = esNuevoSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN';

        if (!esNuevoSuperAdmin) {
          const gym = await crearNuevoGimnasio({ name: formData.gymName });
          targetGymId = gym.id;
        }

        await registerUser(
          formData.adminNombre,
          formData.adminApellido,
          formData.adminEmail,
          formData.adminEmail,
          formData.adminPassword,
          targetRole,
          formData.adminDni,
          targetGymId 
        );
        alert(esNuevoSuperAdmin ? "👑 SuperAdmin creado" : "🚀 Franquicia configurada");
      }

      setShowModal(false);
      resetForm();
      cargarDatos();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setEditMode(null);
    setFormData({ gymName: '', adminNombre: '', adminApellido: '', adminEmail: '', adminPassword: '', adminDni: '' });
    setEsNuevoSuperAdmin(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2>Panel de Control Global</h2>
          <p style={{color: '#64748b', margin: 0}}>Gestión de infraestructura y accesos de alto nivel.</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className={styles.btnMain}>
          <UserPlus size={18} /> Registrar Nuevo Acceso
        </button>
      </header>

      {loading ? (
        <div style={{padding: '100px'}}><Loader text="Sincronizando ecosistema..." /></div>
      ) : (
        <>
          <div className={styles.sectionDivider} style={{color: '#dc2626'}}>
            <ShieldAlert size={18} /> <h3>Administradores Globales (Desarrolladores)</h3>
          </div>
          
          <div className={styles.gymGrid} style={{marginBottom: '40px'}}>
            {superAdmins.map(sa => (
              <div key={sa.id} className={`${styles.gymCard} ${styles.saCard} ${!sa.enabled ? styles.saCardDisabled : ''}`}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div className={styles.saInfo}>
                    <h4>{sa.first_name} {sa.last_name}</h4>
                    <p>{sa.email}</p>
                  </div>
                  <div className={styles.saActions}>
                    <button onClick={() => abrirEdicionSA(sa)} className={styles.btnIconEdit} title="Editar">
                        <Edit2 size={16} />
                    </button>
                    {sa.email !== currentUser.email && (
                        <button 
                          onClick={() => handleToggleSA(sa)} 
                          className={`${styles.btnIconStatus} ${sa.enabled ? styles.btnEnabled : styles.btnDisabled}`} 
                          title={sa.enabled ? "Bloquear Acceso" : "Habilitar Acceso"}
                        >
                          {sa.enabled ? <PowerOff size={16} /> : <Power size={16} />}
                        </button>
                    )}
                  </div>
                </div>
                <code>ID: {sa.id}</code>
              </div>
            ))}
          </div>

          <div className={styles.sectionDivider}>
            <Globe size={18} /> <h3>Franquicias Activas</h3>
          </div>
          
          {gyms.length === 0 ? (
            <div className={styles.emptyState}>
              <Building2 size={48} opacity={0.3} />
              <p>No hay gimnasios registrados.</p>
            </div>
          ) : (
            <div className={styles.gymGrid}>
              {gyms.map(g => (
                <div key={g.id} className={styles.gymCard}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                    <h3>{g.name}</h3>
                    <span className={styles.badge}>{g.enabled ? "ACTIVO" : "SUSPENDIDO"}</span>
                  </div>
                  <p style={{margin: '8px 0', fontSize: '0.8rem', color: '#64748b'}}>ID DE INSTANCIA:</p>
                  <code>{g.id}</code>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>
                {editMode ? "Editar Perfil SuperAdmin" : "Configuración de Credenciales"}
            </h3>
            
            <form onSubmit={handleAltaCompleta}>
              <div className={styles.formGroup}>
                <label>Nivel de Autorización</label>
                <select 
                  className={styles.selectInput}
                  value={esNuevoSuperAdmin ? "SA" : "G"} 
                  disabled={!!editMode}
                  onChange={(e) => setEsNuevoSuperAdmin(e.target.value === "SA")}
                >
                  <option value="G">Administrador de Gimnasio (Nueva Franquicia)</option>
                  <option value="SA">SuperAdmin Global (Desarrollador / Soporte)</option>
                </select>
              </div>

              {!esNuevoSuperAdmin && !editMode && (
                <div className={styles.formGroup}>
                  <label>Nombre de la Franquicia</label>
                  <input name="gymName" required onChange={handleChange} placeholder="Ej: Central Perk Fitness" />
                </div>
              )}

              <div className={styles.divider}>
                <span>Información Personal</span>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                <div className={styles.formGroup}>
                  <label>Nombre</label>
                  <input name="adminNombre" value={formData.adminNombre} required onChange={handleChange} />
                </div>
                <div className={styles.formGroup}>
                  <label>Apellido</label>
                  <input name="adminApellido" value={formData.adminApellido} required onChange={handleChange} />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>Correo Electrónico</label>
                <input name="adminEmail" value={formData.adminEmail} type="email" required onChange={handleChange} />
              </div>
              
              <div className={styles.formGroup}>
                  <label>
                    {editMode ? "Nueva Contraseña (dejar vacío para mantener)" : "Contraseña de Acceso"}
                  </label>
                  <div style={{position: 'relative'}}>
                    <input 
                      name="adminPassword" 
                      type="password" 
                      required={!editMode} 
                      value={formData.adminPassword}
                      onChange={handleChange} 
                      placeholder={editMode ? "Cambiar contraseña..." : "Mínimo 6 caracteres"} 
                    />
                  </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>DNI / Documento</label>
                <input name="adminDni" value={formData.adminDni} required onChange={handleChange} />
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnCancel} onClick={() => {setShowModal(false); resetForm();}}>Cancelar</button>
                <button type="submit" className={styles.btnMain} disabled={isSaving}>
                  {isSaving ? "Procesando..." : (editMode ? "Guardar Cambios" : (esNuevoSuperAdmin ? "Crear SuperAdmin" : "Crear Ecosistema"))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionGimnasios;