import { ClerkProvider } from '@clerk/clerk-react';

// You can use environment variables for the Clerk publishable key
const clerkPubKey = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function ClerkProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      {children}
    </ClerkProvider>
  );
}
