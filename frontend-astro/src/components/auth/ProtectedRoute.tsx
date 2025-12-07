import { useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'student' | 'trainer';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isLoaded, isSignedIn, userId } = useAuth();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      // Redirect to appropriate login page
      const loginUrl = requiredRole === 'trainer' ? '/login/trainer' : '/login/student';
      window.location.href = loginUrl;
    }
  }, [isLoaded, isSignedIn, requiredRole]);

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If not signed in, don't render children (redirect will happen in useEffect)
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    );
  }

  // User is authenticated, render children
  return <>{children}</>;
}
