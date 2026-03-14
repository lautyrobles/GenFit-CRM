import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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

import { useAuth } from './context/AuthContext'
import { PERMISOS } from './config/permissions' // Asegúrate de crear este archivo
import ProtectedRoute from './Components/ProtectedRoute' // Asegúrate de crear este componente
import AccessNotifier from './Components/AccessNotifier/AccessNotifier'

const App = () => {
  const { user } = useAuth()

  return (
    <Router>
      <div className={styles.appContainer}>
        
        <AccessNotifier />

        {user && <Sidebar />}

        <main className={user ? styles.mainContent : styles.loginMain}>
          {user ? (
            <div className={styles.contentWrapper}>
              <Header />

              <Routes>
                {/* 🏠 Rutas Comunes (Admin, SuperAdmin, Supervisor) */}
                <Route path="/" element={<Inicio />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/pagos" element={<Pagos />} />
                <Route path="/planes" element={<Planes />} />
                <Route path="/asistencia" element={<Asistencia />} />
                <Route path="/rutinas" element={<RutinaNutricion />} />
                <Route path="/soporte" element={<Soporte />} />

                {/* 🔐 Rutas Protegidas (Solo ADMIN y SUPER_ADMIN) */}
                <Route element={<ProtectedRoute permisoRequerido={PERMISOS.VER_MOVIMIENTOS} />}>
                  <Route path="/movimientos" element={<Movimientos />} />
                </Route>

                <Route element={<ProtectedRoute permisoRequerido={PERMISOS.GESTIONAR_PERMISOS} />}>
                  <Route path="/configuracion" element={<Configuracion />} />
                </Route>

                {/* Redirección por defecto si la ruta no existe */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          ) : (
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </Router>
  )
}

export default App