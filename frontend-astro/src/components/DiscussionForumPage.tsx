import React, { useState, useEffect } from 'react';
import DiscussionForum from './DiscussionForum';

const DiscussionForumPage: React.FC = () => {
  const [courseId, setCourseId] = useState<string>('');
  const [courses, setCourses] = useState<{id: string, title: string}[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Mock current user data
  const currentUser = {
    id: 'user1',
    name: 'John Doe',
    avatar: 'https://placehold.co/48',
    role: 'student' as const
  };
  
  useEffect(() => {
    // Get course ID from URL query parameter if present
    const urlParams = new URLSearchParams(window.location.search);
    const courseIdParam = urlParams.get('courseId');
    
    // Fetch enrolled courses (mock data for demo)
    fetchEnrolledCourses().then(fetchedCourses => {
      setCourses(fetchedCourses);
      
      // If courseId is in URL and it's a valid course, use it
      // Otherwise, use the first course in the list
      if (courseIdParam && fetchedCourses.some(c => c.id === courseIdParam)) {
        setCourseId(courseIdParam);
      } else if (fetchedCourses.length > 0) {
        setCourseId(fetchedCourses[0].id);
      }
      
      setLoading(false);
    });
  }, []);
  
  const fetchEnrolledCourses = async () => {
    // In a real implementation, this would be an API call
    // For demo, return mock data
    return [
      { id: 'course1', title: 'Introduction to Web Development' },
      { id: 'course2', title: 'Advanced JavaScript' },
      { id: 'course3', title: 'Responsive Design Fundamentals' },
    ];
  };
  
  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCourseId(e.target.value);
    
    // Update URL without reloading the page
    const url = new URL(window.location.href);
    url.searchParams.set('courseId', e.target.value);
    window.history.pushState({}, '', url.toString());
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (courses.length === 0) {
    return (
      <div className="bg-yellow-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">No Enrolled Courses</h2>
        <p className="text-yellow-700">
          You're not enrolled in any courses yet. Enroll in a course to access its discussion forums.
        </p>
        <button 
          onClick={() => window.location.href = '/courses'}
          className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
        >
          Browse Courses
        </button>
      </div>
    );
  }
  
  const selectedCourse = courses.find(c => c.id === courseId) || courses[0];
  
  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-4 sm:mb-0">
          <label htmlFor="courseSelect" className="block text-sm font-medium text-gray-700 mb-1">
            Select Course
          </label>
          <select
            id="courseSelect"
            value={courseId}
            onChange={handleCourseChange}
            className="w-full sm:w-64 p-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"
          >
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
        
        <button
          onClick={() => window.location.href = `/course-player?courseId=${courseId}`}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Course
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <h2 className="text-lg font-semibold text-blue-800">
            {selectedCourse.title} - Discussions
          </h2>
          <p className="text-sm text-blue-600">
            Ask questions, share insights, and connect with peers and instructors.
          </p>
        </div>
        
        <DiscussionForum courseId={selectedCourse.id} currentUser={currentUser} />
      </div>
    </div>
  );
};

export default DiscussionForumPage; 