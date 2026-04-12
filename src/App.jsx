import React, { useState } from 'react' // 👈 Añadimos useState
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
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
import { useAuth } from './context/AuthContext'
import AccessNotifier from './Components/AccessNotifier/AccessNotifier'

const App = () => {
  const { user } = useAuth()
  
  // 🍔 ESTADO PARA EL MENÚ HAMBURGUESA
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const closeSidebar = () => setIsSidebarOpen(false)

  return (
    <Router>
      <div className={styles.appContainer}>
        
        <AccessNotifier />

        {/* Pasamos el estado y la función de cierre al Sidebar */}
        {user && (
          <>
            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
            
            {/* Capa oscura que aparece solo en móvil cuando el sidebar está abierto */}
            {isSidebarOpen && (
              <div className={styles.sidebarOverlay} onClick={closeSidebar}></div>
            )}
          </>
        )}

        <main className={user ? styles.mainContent : styles.loginMain}>
          {user ? (
            <div className={styles.contentWrapper}>
              {/* Pasamos la función de apertura al Header */}
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