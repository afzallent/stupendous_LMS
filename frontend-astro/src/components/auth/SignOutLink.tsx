import { useClerk } from '@clerk/clerk-react';
import { Icon } from '@iconify/react';

export default function SignOutLink() {
  const { signOut } = useClerk();

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Clear legacy authentication
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Sign out from Clerk and redirect to home page
    await signOut({ redirectUrl: '/' });
  };

  return (
    <a 
      href="#" 
      onClick={handleSignOut}
      className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center transition-colors"
    >
      <Icon icon="mdi:logout" className="w-5 h-5 mr-3" />
      <span>Sign Out</span>
    </a>
  );
}
