import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'user' | 'admin' | 'subadmin';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const userStr = localStorage.getItem('user');
  const token = localStorage.getItem('token');

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);

    if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
      return <Navigate to="/" replace />;
    }

    return <>{children}</>;
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }
}
