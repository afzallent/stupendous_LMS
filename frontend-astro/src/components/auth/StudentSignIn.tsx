import ClerkProviderWrapper from '../ClerkProviderWrapper';
import { SignIn } from '@clerk/clerk-react';

export default function StudentSignIn() {
  return (
    <ClerkProviderWrapper>
      <SignIn path="/login/student" routing="path" />
    </ClerkProviderWrapper>
  );
}
