import React from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';

export default function UserInfo() {
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();

  // Also check localStorage for legacy auth
  const legacyToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const legacyUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

  if (!authLoaded || !userLoaded) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-yellow-800">Loading authentication info...</p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <h3 className="font-semibold text-blue-900 mb-2">Current User Information</h3>
      
      <div className="space-y-2 text-sm">
        {/* Clerk Authentication Status */}
        <div className="bg-white rounded p-3 border border-blue-100">
          <h4 className="font-medium text-blue-800 mb-1">Clerk Authentication:</h4>
          <p><span className="font-medium">Status:</span> {isSignedIn ? '✅ Signed In' : '❌ Not Signed In'}</p>
          {isSignedIn && (
            <>
              <p><span className="font-medium">User ID:</span> <code className="bg-gray-100 px-1 rounded">{userId}</code></p>
              <p><span className="font-medium">Email:</span> {user?.primaryEmailAddress?.emailAddress || 'Not available'}</p>
              <p><span className="font-medium">Name:</span> {user?.fullName || user?.firstName || 'Not set'}</p>
              <p><span className="font-medium">Role:</span> {user?.publicMetadata?.role as string || 'Not set'}</p>
              <p><span className="font-medium">Username:</span> {user?.username || 'Not set'}</p>
            </>
          )}
        </div>

        {/* Legacy Authentication Status */}
        <div className="bg-white rounded p-3 border border-blue-100">
          <h4 className="font-medium text-blue-800 mb-1">Legacy Authentication (localStorage):</h4>
          <p><span className="font-medium">Token:</span> {legacyToken ? '✅ Present' : '❌ Not Present'}</p>
          {legacyUser && (
            <p><span className="font-medium">User Data:</span> <code className="bg-gray-100 px-1 rounded text-xs">{legacyUser.substring(0, 50)}...</code></p>
          )}
        </div>

        {/* Sign Out Button */}
        <div className="mt-4">
          <button 
            onClick={() => {
              // Clear both Clerk and legacy auth
              if (window.Clerk) {
                window.Clerk.signOut();
              }
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/';
            }}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Sign Out (Clear All Sessions)
          </button>
        </div>
      </div>
    </div>
  );
}
