import React, { useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: 'student' | 'trainer';
  redirectPath?: string;
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  redirectPath = '/login/student'
}) => {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        // Not signed in, redirect to login
        window.location.href = redirectPath;
        return;
      }

      // Check if user has the required role
      const userRole = user?.publicMetadata?.role as string;
      
      if (userRole !== requiredRole) {
        // User doesn't have the required role, redirect to appropriate dashboard
        if (userRole === 'student') {
          window.location.href = '/dashboard/student';
        } else if (userRole === 'trainer') {
          window.location.href = '/dashboard/trainer';
        } else {
          // No role set, redirect to login
          window.location.href = redirectPath;
        }
      }
    }
  }, [isLoaded, isSignedIn, user, requiredRole, redirectPath]);

  // Show loading state while checking auth
  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render content until we've verified the role
  if (!isSignedIn || user?.publicMetadata?.role !== requiredRole) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
