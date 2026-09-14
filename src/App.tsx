import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Dashboard /> : <Login />;
}
