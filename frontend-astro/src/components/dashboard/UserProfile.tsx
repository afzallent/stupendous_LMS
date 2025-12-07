import { useUser } from '@clerk/clerk-react';
import SignOutLink from '../auth/SignOutLink';

interface UserProfileProps {
  userType: 'student' | 'trainer';
}

export default function UserProfile({ userType }: UserProfileProps) {
  const { user } = useUser();
  
  return (
    <div className="p-4 border-t">
      <div className="flex items-center mb-3">
        <div className="w-10 h-10 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
          {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">
            {user?.firstName || user?.emailAddresses[0]?.emailAddress || userType === 'student' ? 'Student' : 'Trainer'}
          </p>
          <p className="text-xs text-gray-500">
            {user?.emailAddresses[0]?.emailAddress || 'user@example.com'}
          </p>
        </div>
      </div>
      <SignOutLink />
    </div>
  );
}
