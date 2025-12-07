import React, { useState, useEffect } from 'react';
import { Question, Option, Assessment } from './AssessmentCreator';

interface AssessmentEditorProps {
  assessmentId: string;
}

function AssessmentEditor({ assessmentId }: AssessmentEditorProps) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // In a real application, fetch the assessment data from your backend
    const fetchAssessment = async () => {
      try {
        // Simulated API call
        const response = {
          id: assessmentId,
          title: 'HTML Basics Assessment',
          description: 'Test your knowledge of HTML fundamentals',
          passingScore: 70,
          timeLimit: 30,
          questions: [
            {
              id: 'q1',
              type: 'mcq' as const,
              text: 'What does HTML stand for?',
              options: [
                { id: 'o1', text: 'Hyper Text Markup Language', isCorrect: true },
                { id: 'o2', text: 'High Tech Modern Language', isCorrect: false },
                { id: 'o3', text: 'Hyper Transfer Markup Language', isCorrect: false },
              ],
              explanation: 'HTML stands for Hyper Text Markup Language',
              points: 1
            }
          ]
        };

        setAssessment(response);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching assessment:', error);
        setIsLoading(false);
      }
    };

    fetchAssessment();
  }, [assessmentId]);

  const addQuestion = (type: 'mcq' | 'true-false') => {
    if (!assessment) return;

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
      ...prev!,
      questions: [...prev!.questions, newQuestion]
    }));
  };

  const addOption = (questionIndex: number) => {
    if (!assessment) return;

    const newOption: Option = {
      id: Date.now().toString(),
      text: '',
      isCorrect: false
    };

    setAssessment(prev => {
      const updated = { ...prev! };
      updated.questions[questionIndex].options.push(newOption);
      return updated;
    });
  };

  const handleQuestionChange = (questionIndex: number, field: keyof Question, value: any) => {
    if (!assessment) return;

    setAssessment(prev => {
      const updated = { ...prev! };
      updated.questions[questionIndex] = {
        ...updated.questions[questionIndex],
        [field]: value
      };
      return updated;
    });
  };

  const handleOptionChange = (questionIndex: number, optionIndex: number, field: keyof Option, value: any) => {
    if (!assessment) return;

    setAssessment(prev => {
      const updated = { ...prev! };
      updated.questions[questionIndex].options[optionIndex] = {
        ...updated.questions[questionIndex].options[optionIndex],
        [field]: field === 'isCorrect' ? value : value
      };
      return updated;
    });
  };

  const handleDeleteQuestion = (questionIndex: number) => {
    if (!assessment) return;

    setAssessment(prev => ({
      ...prev!,
      questions: prev!.questions.filter((_, index) => index !== questionIndex)
    }));
  };

  const handleDeleteOption = (questionIndex: number, optionIndex: number) => {
    if (!assessment) return;

    setAssessment(prev => {
      const updated = { ...prev! };
      updated.questions[questionIndex].options = updated.questions[questionIndex].options.filter(
        (_, index) => index !== optionIndex
      );
      return updated;
    });
  };

  const handleSave = async () => {
    if (!assessment) return;

    setIsSaving(true);
    try {
      // In a real application, send the updated assessment to your backend
      console.log('Saving assessment:', assessment);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call
      // Redirect back to the assessment list
      window.location.href = '/dashboard/trainer/assessments';
    } catch (error) {
      console.error('Error saving assessment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading assessment...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="p-6 text-center text-red-600">
        Assessment not found
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Basic Details */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Title</label>
          <input
            type="text"
            value={assessment.title}
            onChange={(e) => setAssessment(prev => ({ ...prev!, title: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter assessment title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={assessment.description}
            onChange={(e) => setAssessment(prev => ({ ...prev!, description: e.target.value }))}
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
              onChange={(e) => setAssessment(prev => ({ ...prev!, passingScore: parseInt(e.target.value) }))}
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
              onChange={(e) => setAssessment(prev => ({ ...prev!, timeLimit: parseInt(e.target.value) }))}
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
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    value={question.points}
                    onChange={(e) => handleQuestionChange(questionIndex, 'points', parseInt(e.target.value))}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                    min="1"
                    placeholder="Points"
                  />
                  <button
                    onClick={() => handleDeleteQuestion(questionIndex)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
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
                      {question.type === 'mcq' && (
                        <button
                          onClick={() => handleDeleteOption(questionIndex, optionIndex)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
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

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 ${
              isSaving ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssessmentEditor; 