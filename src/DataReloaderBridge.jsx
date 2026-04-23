// INSTRUCCIÓN: Agrega este componente dentro de tu App.jsx
// Va inmediatamente DENTRO de <DataProvider> y <AuthProvider>, 
// justo antes de las rutas.
//
// Ejemplo de estructura en App.jsx:
//
//   <AuthProvider>
//     <DataProvider>
//       <DataReloaderBridge />   ← agregar aquí
//       <Router>
//         ... tus rutas ...
//       </Router>
//     </DataProvider>
//   </AuthProvider>
//
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { useData }           from './contexts/DataContext';
import { setDataReloader }   from './contexts/AuthContext';

// Este componente no renderiza nada.
// Solo inyecta la función reloadClientsAndPets del DataContext
// en el AuthContext para que register() la pueda llamar.
export const DataReloaderBridge = () => {
    const { reloadClientsAndPets } = useData();
    useEffect(() => {
        setDataReloader(reloadClientsAndPets);
        return () => setDataReloader(null);
    }, [reloadClientsAndPets]);
    return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Si ya tienes un App.jsx y no quieres mover cosas, la forma más simple
// es agregarlo así:
//
// import { DataReloaderBridge } from './DataReloaderBridge';  // o donde lo pongas
//
// function App() {
//   return (
//     <AuthProvider>
//       <DataProvider>
//         <DataReloaderBridge />
//         <BrowserRouter>
//           <Routes>
//             ...
//           </Routes>
//         </BrowserRouter>
//       </DataProvider>
//     </AuthProvider>
//   );
// }