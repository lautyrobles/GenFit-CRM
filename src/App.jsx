import React from 'react'
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

import { useAuth } from './context/AuthContext'

// 👉 Importamos el nuevo componente notificador
import AccessNotifier from './Components/AccessNotifier/AccessNotifier'

const App = () => {
  const { user } = useAuth()

  return (
    <Router>
      <div className={styles.appContainer}>
        
        {/* 👉 El Notificador Global corre en segundo plano y muestra los pop-ups */}
        <AccessNotifier />

        {user && <Sidebar />}

        <main className={user ? styles.mainContent : styles.loginMain}>
          {user ? (
            <div className={styles.contentWrapper}>
              <Header />

              <Routes>
                <Route path="/" element={<Inicio />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/pagos" element={<Pagos />} />
                <Route path="/planes" element={<Planes />} />
                <Route path="/configuracion" element={<Configuracion />} />
                <Route path="/soporte" element={<Soporte />} />
                <Route path="/movimientos" element={<Movimientos />} />
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