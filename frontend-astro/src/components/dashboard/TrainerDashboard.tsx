import React from 'react';
import RoleProtectedRoute from '../auth/RoleProtectedRoute';

interface TrainerDashboardProps {
  children: React.ReactNode;
}

const TrainerDashboard: React.FC<TrainerDashboardProps> = ({ children }) => {
  return (
    <RoleProtectedRoute requiredRole="trainer" redirectPath="/login/trainer">
      {children}
    </RoleProtectedRoute>
  );
};

export default TrainerDashboard;
