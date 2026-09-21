import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { useAuth } from './hooks/useAuth';
import { Toaster } from './components/Toaster';

export default function App() {
  const { isAuthenticated } = useAuth();
  return (
    <>
      {isAuthenticated ? <Dashboard /> : <Login />}
      <Toaster />
    </>
  );
}
