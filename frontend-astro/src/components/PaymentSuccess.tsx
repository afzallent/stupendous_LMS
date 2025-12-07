import React from 'react';

interface PaymentSuccessProps {
  transactionId: string;
  courseTitle: string;
  onViewCourse: () => void;
  onBackToCourses: () => void;
}

const PaymentSuccess: React.FC<PaymentSuccessProps> = ({
  transactionId,
  courseTitle,
  onViewCourse,
  onBackToCourses
}) => {
  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-green-100">
        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      
      <h2 className="text-2xl font-bold mb-2 text-gray-800">Payment Successful!</h2>
      <p className="text-gray-600 mb-6">
        Thank you for enrolling in <span className="font-medium">{courseTitle}</span>
      </p>
      
      <div className="bg-gray-50 p-4 rounded-md text-left mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Transaction ID:</span>
          <span className="font-medium">{transactionId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Date:</span>
          <span className="font-medium">{new Date().toLocaleDateString()}</span>
        </div>
      </div>
      
      <div className="flex flex-col space-y-3">
        <button
          onClick={onViewCourse}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Start Learning
        </button>
        
        <button
          onClick={onBackToCourses}
          className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          Browse More Courses
        </button>
      </div>
      
      <div className="mt-6 text-sm text-gray-500">
        <p>
          A confirmation email has been sent to your registered email address with course details and access information.
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess; 