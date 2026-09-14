import { useEffect, useState } from 'react';
import { pb } from '../services/pocketbase';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid);

  useEffect(() => {
    return pb.authStore.onChange(() => {
      setIsAuthenticated(pb.authStore.isValid);
    });
  }, []);

  return {
    isAuthenticated,
    user: pb.authStore.record,
    logout: () => pb.authStore.clear(),
  };
}
