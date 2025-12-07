import ClerkProviderWrapper from '../ClerkProviderWrapper';
import { SignIn } from '@clerk/clerk-react';

export default function TrainerSignIn() {
  return (
    <ClerkProviderWrapper>
      <SignIn path="/login/trainer" routing="path" />
    </ClerkProviderWrapper>
  );
}
