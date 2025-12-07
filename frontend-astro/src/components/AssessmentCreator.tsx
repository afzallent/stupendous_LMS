import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS, getApiUrl, getAuthHeaders } from '../config/api.config';

export interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  type: 'mcq' | 'true-false';
  text: string;
  options: Option[];
  explanation: string;
  points: number;
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  passingScore: number;
  timeLimit: number; // in minutes
  questions: Question[];
}

function AssessmentCreator() {
  const [existingAssessments, setExistingAssessments] = useState<Assessment[]>([]);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadAssessments = async () => {
      setIsLoadingAssessments(true);
      setLoadError(null);
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(getApiUrl(`${API_ENDPOINTS.assessments}?course_id=1`), {
          headers
        });
        
        if (!response.ok) {
          throw new Error('Failed to load assessments');
        }

        const data = await response.json();
        setExistingAssessments(
          data.map((a: any) => ({
            id: a.id.toString(),
            title: a.title,
            description: a.description,
            passingScore: a.passing_score,
            timeLimit: 30, // Default value
            questions: a.questions?.map((q: any) => ({
              id: q.id.toString(),
              type: q.question_type === 'multiple_choice' ? 'mcq' : 'true-false',
              text: q.question_text,
              points: q.points,
              explanation: '',
              options: q.options?.map((o: string, i: number) => ({
                id: i.toString(),
                text: o,
                isCorrect: o === q.correct_answer
              })) || []
            })) || []
          }))
        );
      } catch (err) {
        setLoadError(err.message);
        console.error('Error loading assessments:', err);
      } finally {
        setIsLoadingAssessments(false);
      }
    };

    loadAssessments();
  }, []);
  const [assessment, setAssessment] = useState<Assessment>({
    id: Date.now().toString(),
    title: '',
    description: '',
    passingScore: 70,
    timeLimit: 30,
    questions: [],
  });

  const addQuestion = (type: 'mcq' | 'true-false') => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      type,
      text: '',
      explanation: '',
      points: 1,
      options: type === 'true-false' 
        ? [
            { id: '1', text: 'True', isCorrect: false },
            { id: '2', text: 'False', isCorrect: false }
          ]
        : []
    };

    setAssessment(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const addOption = (questionIndex: number) => {
    const newOption: Option = {
      id: Date.now().toString(),
      text: '',
      isCorrect: false
    };

    setAssessment(prev => {
      const updated = { ...prev };
      updated.questions[questionIndex].options.push(newOption);
      return updated;
    });
  };

  const handleQuestionChange = (questionIndex: number, field: keyof Question, value: any) => {
    setAssessment(prev => {
      const updated = { ...prev };
      updated.questions[questionIndex] = {
        ...updated.questions[questionIndex],
        [field]: value
      };
      return updated;
    });
  };

  const handleOptionChange = (questionIndex: number, optionIndex: number, field: keyof Option, value: any) => {
    setAssessment(prev => {
      const updated = { ...prev };
      updated.questions[questionIndex].options[optionIndex] = {
        ...updated.questions[questionIndex].options[optionIndex],
        [field]: field === 'isCorrect' ? value : value
      };
      return updated;
    });
  };

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Prepare assessment data for API
      const assessmentData = {
        course_id: 1, // TODO: Get from props/context
        title: assessment.title,
        description: assessment.description,
        type: 'quiz',
        passing_score: assessment.passingScore,
        questions: assessment.questions.map(q => ({
          question_text: q.text,
          question_type: q.type === 'mcq' ? 'multiple_choice' : 'true_false',
          options: q.options.map(o => o.text),
          correct_answer: q.options.find(o => o.isCorrect)?.text || '',
          points: q.points,
          order_number: assessment.questions.indexOf(q)
        }))
      };

      // Save assessment via API
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl(API_ENDPOINTS.assessments), {
        method: 'POST',
        headers,
        body: JSON.stringify(assessmentData)
      });

      if (!response.ok) {
        throw new Error('Failed to save assessment');
      }

      const result = await response.json();
      return result.id; // Return the assessment ID
    } catch (err) {
      setError(err.message);
      console.error('Assessment submission error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Basic Details */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Title</label>
          <input
            type="text"
            value={assessment.title}
            onChange={(e) => setAssessment(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter assessment title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={assessment.description}
            onChange={(e) => setAssessment(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter assessment description"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passing Score (%)</label>
            <input
              type="number"
              value={assessment.passingScore}
              onChange={(e) => setAssessment(prev => ({ ...prev, passingScore: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (minutes)</label>
            <input
              type="number"
              value={assessment.timeLimit}
              onChange={(e) => setAssessment(prev => ({ ...prev, timeLimit: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="1"
            />
          </div>
        </div>

        {/* Question Addition Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={() => addQuestion('mcq')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add MCQ Question
          </button>
          <button
            onClick={() => addQuestion('true-false')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Add True/False Question
          </button>
        </div>

        {/* Questions */}
        <div className="space-y-8">
          {assessment.questions.map((question, questionIndex) => (
            <div key={question.id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-gray-500">
                  Question {questionIndex + 1} ({question.type === 'mcq' ? 'Multiple Choice' : 'True/False'})
                </span>
                <input
                  type="number"
                  value={question.points}
                  onChange={(e) => handleQuestionChange(questionIndex, 'points', parseInt(e.target.value))}
                  className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                  min="1"
                  placeholder="Points"
                />
              </div>

              <div className="space-y-4">
                <textarea
                  value={question.text}
                  onChange={(e) => handleQuestionChange(questionIndex, 'text', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter question text"
                  rows={2}
                />

                {/* Options */}
                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <input
                        type={question.type === 'mcq' ? 'checkbox' : 'radio'}
                        checked={option.isCorrect}
                        onChange={(e) => handleOptionChange(questionIndex, optionIndex, 'isCorrect', e.target.checked)}
                        name={`question-${question.id}`}
                        className="h-4 w-4 text-blue-600"
                      />
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => handleOptionChange(questionIndex, optionIndex, 'text', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Enter option text"
                      />
                    </div>
                  ))}
                </div>

                {question.type === 'mcq' && (
                  <button
                    onClick={() => addOption(questionIndex)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Option
                  </button>
                )}

                <textarea
                  value={question.explanation}
                  onChange={(e) => handleQuestionChange(questionIndex, 'explanation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Explanation for the correct answer(s)"
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Create Assessment
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssessmentCreator;
