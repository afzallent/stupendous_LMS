import React, { useState, useEffect } from 'react';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of the correct option
  explanation?: string;
}

interface QuizProps {
  quizId: string;
  courseId: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  passingScore: number;
  onComplete: (score: number, passed: boolean) => void;
}

interface QuizState {
  currentQuestionIndex: number;
  userAnswers: (number | null)[];
  quizCompleted: boolean;
  showResults: boolean;
  score: number;
}

const QuizComponent: React.FC<QuizProps> = ({
  quizId,
  courseId,
  title,
  description,
  questions,
  passingScore,
  onComplete
}) => {
  const [state, setState] = useState<QuizState>({
    currentQuestionIndex: 0,
    userAnswers: Array(questions.length).fill(null),
    quizCompleted: false,
    showResults: false,
    score: 0
  });
  
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  
  // For timed quizzes - set time in seconds if needed
  useEffect(() => {
    // If you want to implement timed quizzes, uncomment below
    // const timerDuration = 600; // 10 minutes in seconds
    // setTimeRemaining(timerDuration);
    // 
    // const timer = setInterval(() => {
    //   setTimeRemaining(prev => {
    //     if (prev === null || prev <= 1) {
    //       clearInterval(timer);
    //       handleQuizComplete();
    //       return 0;
    //     }
    //     return prev - 1;
    //   });
    // }, 1000);
    // 
    // return () => clearInterval(timer);
  }, []);
  
  const handleSelectAnswer = (optionIndex: number) => {
    if (state.showResults || reviewMode) return;
    
    const updatedAnswers = [...state.userAnswers];
    updatedAnswers[state.currentQuestionIndex] = optionIndex;
    
    setState(prev => ({
      ...prev,
      userAnswers: updatedAnswers
    }));
  };
  
  const handleNextQuestion = () => {
    if (state.currentQuestionIndex < questions.length - 1) {
      setState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1
      }));
    } else {
      handleQuizComplete();
    }
  };
  
  const handlePreviousQuestion = () => {
    if (state.currentQuestionIndex > 0) {
      setState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1
      }));
    }
  };
  
  const calculateScore = () => {
    let correctCount = 0;
    
    state.userAnswers.forEach((answer, index) => {
      if (answer === questions[index].correctAnswer) {
        correctCount++;
      }
    });
    
    const score = Math.round((correctCount / questions.length) * 100);
    return score;
  };
  
  const handleQuizComplete = () => {
    const score = calculateScore();
    const passed = score >= passingScore;
    
    setState(prev => ({
      ...prev,
      quizCompleted: true,
      showResults: true,
      score
    }));
    
    // In a real implementation, this would save the quiz results to the backend
    onComplete(score, passed);
  };
  
  const goToQuestion = (index: number) => {
    setState(prev => ({
      ...prev,
      currentQuestionIndex: index
    }));
  };
  
  const handleReviewQuiz = () => {
    setReviewMode(true);
    setState(prev => ({
      ...prev,
      currentQuestionIndex: 0
    }));
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  const currentQuestion = questions[state.currentQuestionIndex];
  const userAnswerForCurrentQuestion = state.userAnswers[state.currentQuestionIndex];
  const isAnswered = userAnswerForCurrentQuestion !== null;
  const isCorrect = reviewMode && userAnswerForCurrentQuestion === currentQuestion.correctAnswer;
  const isIncorrect = reviewMode && isAnswered && userAnswerForCurrentQuestion !== currentQuestion.correctAnswer;
  
  const getOptionClassName = (optionIndex: number) => {
    const baseClasses = "p-3 border rounded-md cursor-pointer transition-colors";
    
    if (reviewMode) {
      if (optionIndex === currentQuestion.correctAnswer) {
        return `${baseClasses} bg-green-100 border-green-400`;
      }
      if (optionIndex === userAnswerForCurrentQuestion && optionIndex !== currentQuestion.correctAnswer) {
        return `${baseClasses} bg-red-100 border-red-400`;
      }
      return `${baseClasses} bg-white border-gray-300`;
    }
    
    if (optionIndex === userAnswerForCurrentQuestion) {
      return `${baseClasses} bg-blue-100 border-blue-400`;
    }
    
    return `${baseClasses} bg-white border-gray-300 hover:bg-gray-50`;
  };
  
  // Show final results
  if (state.showResults && !reviewMode) {
    const passed = state.score >= passingScore;
    
    return (
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">{title} - Results</h2>
        
        <div className="text-center py-6">
          {passed ? (
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-green-700 mb-2">Congratulations! You Passed</h3>
            </div>
          ) : (
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-red-700 mb-2">Not Passed</h3>
            </div>
          )}
          
          <div className="text-5xl font-bold mb-4">{state.score}%</div>
          <p className="text-gray-600 mb-2">Passing score: {passingScore}%</p>
          <p className="text-gray-600">
            You answered {state.userAnswers.filter((answer, index) => answer === questions[index].correctAnswer).length} out of {questions.length} questions correctly.
          </p>
        </div>
        
        <div className="flex justify-between mt-6">
          <button
            onClick={() => window.location.href = `/course-player?courseId=${courseId}`}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Return to Course
          </button>
          
          <button
            onClick={handleReviewQuiz}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Review Quiz
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        {timeRemaining !== null && (
          <div className="px-3 py-1 bg-gray-100 rounded-md text-gray-800 font-medium">
            Time: {formatTime(timeRemaining)}
          </div>
        )}
      </div>
      
      {description && <p className="text-gray-600 mb-6">{description}</p>}
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <span className="font-medium">Question {state.currentQuestionIndex + 1} of {questions.length}</span>
          </div>
          
          <div className="text-sm text-gray-500">
            {!reviewMode
              ? `${state.userAnswers.filter(a => a !== null).length} of ${questions.length} answered`
              : 'Review Mode'}
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${((state.currentQuestionIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-xl font-medium mb-4">{currentQuestion.question}</h3>
        
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <div
              key={index}
              className={getOptionClassName(index)}
              onClick={() => handleSelectAnswer(index)}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 h-5 w-5 mt-1">
                  <div className={`h-full w-full rounded-full border ${userAnswerForCurrentQuestion === index ? 'border-blue-500 bg-blue-500' : 'border-gray-300'} flex items-center justify-center`}>
                    {userAnswerForCurrentQuestion === index && (
                      <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="ml-3">
                  <span className={`${
                    (isCorrect && index === currentQuestion.correctAnswer) ? 'text-green-700 font-medium' : 
                    (isIncorrect && index === userAnswerForCurrentQuestion) ? 'text-red-700 font-medium' : 
                    'text-gray-800'
                  }`}>
                    {option}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {reviewMode && currentQuestion.explanation && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-800 mb-1">Explanation:</h4>
            <p className="text-blue-700">{currentQuestion.explanation}</p>
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center">
        <button
          onClick={handlePreviousQuestion}
          disabled={state.currentQuestionIndex === 0}
          className={`px-4 py-2 rounded-md ${
            state.currentQuestionIndex === 0 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Previous
        </button>
        
        {!reviewMode && state.currentQuestionIndex === questions.length - 1 ? (
          <button
            onClick={handleQuizComplete}
            disabled={!isAnswered}
            className={`px-4 py-2 rounded-md ${
              !isAnswered 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Finish Quiz
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            disabled={!isAnswered && !reviewMode}
            className={`px-4 py-2 rounded-md ${
              !isAnswered && !reviewMode
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {reviewMode ? 'Next' : 'Next Question'}
          </button>
        )}
      </div>
      
      {!reviewMode && (
        <div className="mt-6 pt-4 border-t">
          <div className="flex flex-wrap gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => goToQuestion(index)}
                className={`h-8 w-8 flex items-center justify-center rounded-full text-sm font-medium
                  ${state.currentQuestionIndex === index 
                    ? 'bg-blue-600 text-white' 
                    : state.userAnswers[index] !== null 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizComponent; 