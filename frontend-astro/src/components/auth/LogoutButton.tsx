import { useClerk } from '@clerk/clerk-react';
import { useEffect } from 'react';

export default function LogoutButton() {
  const { signOut } = useClerk();

  useEffect(() => {
    // Sign out immediately when component mounts
    const performSignOut = async () => {
      try {
        await signOut({ redirectUrl: '/login' });
      } catch (error) {
        console.error('Sign out error:', error);
        // Fallback redirect
        window.location.href = '/login';
      }
    };
    
    performSignOut();
  }, []);

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">Signing out...</h1>
      <p className="text-gray-600">You will be redirected to the login page.</p>
      <div className="mt-4">
        <div className="inline-flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    </div>
  );
}
