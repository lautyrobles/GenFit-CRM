import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import styles from './App.module.css'

// 🧱 Componentes globales
import Sidebar from './Components/Sidebar/Sidebar'
import Header from './Components/Header/Header'

// 📄 Páginas
import Inicio from './Pages/Inicio/Inicio'
import Clientes from './Pages/Clientes/Clientes'
import Pagos from './Pages/Pagos/Pagos'
import Planes from './Pages/Planes/Planes'
import Configuracion from './Pages/Configuracion/Configuracion'
import Soporte from './Pages/Soporte/Soporte'
import Login from './Pages/Login/Login'

// 🆕 Solo Movimientos (si corresponde)
import Movimientos from './Pages/Movimientos/Movimientos'

// ⚙️ Contexto
import { useAuth } from './context/AuthContext'

const App = () => {
  const { user } = useAuth()

  return (
    <Router>
      <div className={styles.appContainer}>
        <Sidebar />

        <main className={styles.mainContent}>
          {user ? (
            <>
              <Header />

              <Routes>
                <Route path="/" element={<Inicio />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/pagos" element={<Pagos />} />
                <Route path="/planes" element={<Planes />} />
                <Route path="/configuracion" element={<Configuracion />} />
                <Route path="/soporte" element={<Soporte />} />

                {/* ⚠️ Mantengo solo Movimientos */}
                <Route path="/movimientos" element={<Movimientos />} />
              </Routes>
            </>
          ) : (
            <Login />
          )}
        </main>
      </div>
    </Router>
  )
}

export default App
