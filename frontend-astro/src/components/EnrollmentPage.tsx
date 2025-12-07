import React, { useState, useEffect } from 'react';
import PaymentForm from './PaymentForm';
import PaymentSuccess from './PaymentSuccess';

interface Course {
  id: string;
  title: string;
  instructor: string;
  price: number;
  duration: string;
  level: string;
  description: string;
  coverImage: string;
}

const EnrollmentPage: React.FC = () => {
  const [course, setCourse] = useState<Course | null>(null);
  const [currentStep, setCurrentStep] = useState<'details' | 'payment' | 'success'>('details');
  const [transactionId, setTransactionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Get course ID from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId') || '1'; // Default to 1 if not specified
    
    // In a real implementation, this would be an API call to fetch course details
    // For demo, we'll use a hardcoded course
    fetchCourseDetails(courseId);
  }, []);
  
  const fetchCourseDetails = (courseId: string) => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      // Mock course data - in a real app, this would come from an API
      const mockCourse: Course = {
        id: courseId,
        title: 'Introduction to Web Development',
        instructor: 'Sarah Johnson',
        price: 49.99,
        duration: '10 hours',
        level: 'Beginner',
        description: 'Learn the fundamentals of HTML, CSS, and JavaScript to build modern websites from scratch.',
        coverImage: 'https://placehold.co/600x400/e2e8f0/1e40af?text=Web+Development'
      };
      
      setCourse(mockCourse);
      setLoading(false);
    }, 800);
  };
  
  const handleProceedToPayment = () => {
    setCurrentStep('payment');
  };
  
  const handlePaymentSuccess = (txnId: string) => {
    setTransactionId(txnId);
    setCurrentStep('success');
    
    // In a real implementation, we would update the enrollment status in the database
  };
  
  const handlePaymentCancel = () => {
    setCurrentStep('details');
  };
  
  const handleViewCourse = () => {
    // Redirect to course
    window.location.href = `/course-player?course_id=${course?.id}&title=${encodeURIComponent(course?.title || '')}`;
  };
  
  const handleBackToCourses = () => {
    window.location.href = '/courses';
  };
  
  if (loading || !course) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div>
      {currentStep === 'details' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/3">
              <img 
                src={course.coverImage} 
                alt={course.title} 
                className="w-full h-64 md:h-full object-cover"
              />
            </div>
            
            <div className="p-6 md:w-2/3">
              <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
              <p className="text-gray-600 mb-4">Instructor: {course.instructor}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {course.level}
                </span>
                <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {course.duration}
                </span>
              </div>
              
              <p className="text-gray-700 mb-6">{course.description}</p>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-gray-600 text-sm">Course Price</p>
                    <p className="text-2xl font-bold">${course.price.toFixed(2)}</p>
                  </div>
                  
                  <button
                    onClick={handleProceedToPayment}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Proceed to Payment
                  </button>
                </div>
                
                <div className="text-sm text-gray-500">
                  <p>By enrolling in this course, you'll get:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Full lifetime access to the course materials</li>
                    <li>Certificate of completion when you finish the course</li>
                    <li>Access to discussion forums and instructor support</li>
                    <li>30-day money-back guarantee</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {currentStep === 'payment' && course && (
        <PaymentForm
          courseId={course.id}
          courseTitle={course.title}
          price={course.price}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentCancel={handlePaymentCancel}
        />
      )}
      
      {currentStep === 'success' && course && (
        <PaymentSuccess
          transactionId={transactionId}
          courseTitle={course.title}
          onViewCourse={handleViewCourse}
          onBackToCourses={handleBackToCourses}
        />
      )}
    </div>
  );
};

export default EnrollmentPage; 