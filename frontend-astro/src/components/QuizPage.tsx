import React, { useState, useEffect } from 'react';
import QuizComponent from './QuizComponent';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface Quiz {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  passingScore: number;
}

const QuizPage: React.FC = () => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Get quiz ID from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('quizId');
    const courseId = urlParams.get('courseId');
    
    if (!quizId || !courseId) {
      setError('Quiz ID and Course ID are required');
      setLoading(false);
      return;
    }
    
    // Fetch quiz data
    fetchQuiz(quizId, courseId);
  }, []);
  
  const fetchQuiz = (quizId: string, courseId: string) => {
    setLoading(true);
    
    // In a real implementation, this would be an API call to fetch quiz data
    // For now, we'll use a mock quiz
    setTimeout(() => {
      // Mock quiz data
      const mockQuiz: Quiz = {
        id: quizId,
        courseId: courseId,
        title: 'HTML Fundamentals Quiz',
        description: 'Test your knowledge of HTML basics. You need to score at least 70% to pass.',
        questions: [
          {
            id: 'q1',
            question: 'What does HTML stand for?',
            options: [
              'Hyper Text Markup Language',
              'High Tech Multi Language',
              'Hyper Transfer Markup Language',
              'Hyperlink Text Management Language'
            ],
            correctAnswer: 0,
            explanation: 'HTML stands for Hyper Text Markup Language, which is the standard markup language for creating web pages.'
          },
          {
            id: 'q2',
            question: 'Which HTML tag is used to define an internal style sheet?',
            options: [
              '<css>',
              '<script>',
              '<style>',
              '<link>'
            ],
            correctAnswer: 2,
            explanation: 'The <style> tag is used to define an internal style sheet for a single HTML page.'
          },
          {
            id: 'q3',
            question: 'Which HTML attribute is used to define inline styles?',
            options: [
              'class',
              'style',
              'font',
              'styles'
            ],
            correctAnswer: 1,
            explanation: 'The style attribute is used to add inline styles to an HTML element.'
          },
          {
            id: 'q4',
            question: 'Which is the correct HTML element for the largest heading?',
            options: [
              '<h6>',
              '<heading>',
              '<head>',
              '<h1>'
            ],
            correctAnswer: 3,
            explanation: '<h1> defines the largest heading in HTML, while <h6> defines the smallest.'
          },
          {
            id: 'q5',
            question: 'What is the correct HTML for creating a hyperlink?',
            options: [
              '<a url="http://example.com">Example</a>',
              '<a href="http://example.com">Example</a>',
              '<hyperlink="http://example.com">Example</hyperlink>',
              '<link>http://example.com</link>'
            ],
            correctAnswer: 1,
            explanation: 'The correct syntax for creating a hyperlink is using the <a> tag with the href attribute.'
          }
        ],
        passingScore: 70
      };
      
      setQuiz(mockQuiz);
      setLoading(false);
    }, 1000);
  };
  
  const handleQuizComplete = (score: number, passed: boolean) => {
    // In a real implementation, this would send the results to the backend
    console.log(`Quiz completed with score: ${score}, passed: ${passed}`);
    
    // Here you could redirect or show a different component
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-3xl mx-auto bg-red-50 p-6 rounded-lg text-center">
        <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => window.history.back()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Go Back
        </button>
      </div>
    );
  }
  
  if (!quiz) {
    return (
      <div className="max-w-3xl mx-auto bg-yellow-50 p-6 rounded-lg text-center">
        <h2 className="text-xl font-bold text-yellow-700 mb-2">Quiz Not Found</h2>
        <p className="text-yellow-600">The requested quiz could not be found. Please try again or contact support.</p>
        <button
          onClick={() => window.history.back()}
          className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
        >
          Go Back
        </button>
      </div>
    );
  }
  
  return (
    <QuizComponent
      quizId={quiz.id}
      courseId={quiz.courseId}
      title={quiz.title}
      description={quiz.description}
      questions={quiz.questions}
      passingScore={quiz.passingScore}
      onComplete={handleQuizComplete}
    />
  );
};

export default QuizPage; 