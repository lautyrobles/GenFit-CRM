import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom' // 👈 Añadimos Navigate para protección
import styles from './App.module.css'

import Sidebar from './Components/Sidebar/Sidebar'
import Header from './Components/Header/Header'
import Inicio from './Pages/Inicio/Inicio'
import Clientes from './Pages/Clientes/Clientes'
import Pagos from './Pages/Pagos/Pagos'
import Planes from './Pages/Planes/Planes'
import Configuracion from './Pages/Configuracion/Configuracion'
import Soporte from './Pages/Soporte/Soporte'
import Login from './Pages/Login/Login'
import Movimientos from './Pages/Movimientos/Movimientos'
import RutinaNutricion from './Pages/Clientes/RutinaNutricion'
import Asistencia from './Pages/Asistencia/Asistencia' 
import CierreCaja from './Pages/CierreCaja/CierreCaja';
import GestionGimnasios from './Components/GestionGimnasios'; // 👈 IMPORTANTE: Verifica que la ruta del archivo sea correcta
import { useAuth } from './context/AuthContext'
import AccessNotifier from './Components/AccessNotifier/AccessNotifier'

const App = () => {
  const { user } = useAuth()
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const closeSidebar = () => setIsSidebarOpen(false)

  // Normalizamos el rol para validaciones de ruta
  const role = user?.role?.replace("ROLE_", "").toUpperCase() || "";

  return (
    <Router>
      <div className={styles.appContainer}>
        
        <AccessNotifier />

        {user && (
          <>
            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
            
            {isSidebarOpen && (
              <div className={styles.sidebarOverlay} onClick={closeSidebar}></div>
            )}
          </>
        )}

        <main className={user ? styles.mainContent : styles.loginMain}>
          {user ? (
            <div className={styles.contentWrapper}>
              <Header onOpenSidebar={toggleSidebar} />

              <Routes>
                <Route path="/" element={<Inicio />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/pagos" element={<Pagos />} />
                <Route path="/planes" element={<Planes />} />
                <Route path="/configuracion" element={<Configuracion />} />
                <Route path="/soporte" element={<Soporte />} />
                <Route path="/movimientos" element={<Movimientos />} />
                <Route path="/cierre-caja" element={<CierreCaja />} />
                <Route path="/rutinas" element={<RutinaNutricion />} />
                <Route path="/asistencia" element={<Asistencia />} />
                
                {/* 👑 RUTA EXCLUSIVA PARA SUPERADMIN */}
                <Route 
                  path="/gestion-gimnasios" 
                  element={
                    role === 'SUPER_ADMIN' 
                      ? <GestionGimnasios /> 
                      : <Navigate to="/" />
                  } 
                />

                {/* Redirección por si entran a una ruta que no existe */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          ) : (
            <Login />
          )}
        </main>
      </div>
    </Router>
  )
}

export default App