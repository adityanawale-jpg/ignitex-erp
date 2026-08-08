import { useEffect } from 'react'
import { useAppDispatch } from './hooks'
import { fetchAppConfig } from './redux/slices/appConfigSlice'
import AppRoutes from './routes/AppRoutes'

function App() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(fetchAppConfig())
  }, [dispatch])

  return <AppRoutes />
}

export default App
