import React from 'react';
import ClerkProviderWrapper from '../ClerkProviderWrapper';
import UserInfo from './UserInfo';

export default function UserInfoWrapped() {
  return (
    <ClerkProviderWrapper>
      <UserInfo />
    </ClerkProviderWrapper>
  );
}
