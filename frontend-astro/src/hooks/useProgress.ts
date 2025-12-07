import { useState, useEffect } from 'react';

export const useProgress = (courseId: string) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // In a real implementation, this would fetch the actual progress from an API
    // For now, we'll just simulate some progress
    setProgress(35);
  }, [courseId]);

  const updateProgress = (lectureId: string) => {
    // In a real implementation, this would send the progress update to an API
    // For now, we'll just simulate updating progress
    setProgress((prev) => Math.min(prev + 10, 100));
  };

  return { progress, updateProgress };
}; 