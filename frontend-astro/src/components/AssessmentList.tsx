import React, { useState } from 'react';

interface AssessmentAttempt {
  id: string;
  studentName: string;
  studentId: string;
  score: number;
  timeTaken: number;
  submittedAt: string;
  answers: {
    questionId: string;
    selectedOptions: string[];
    isCorrect: boolean;
  }[];
}

interface AssessmentSummary {
  id: string;
  code: string;
  title: string;
  description: string;
  totalQuestions: number;
  passingScore: number;
  timeLimit: number;
  attempts: AssessmentAttempt[];
  averageScore: number;
  passRate: number;
  createdAt: string;
  lastModified: string;
  isActive: boolean;
}

function AssessmentList() {
  // This would come from your backend in a real application
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([
    {
      id: '1',
      code: 'HTML101',
      title: 'HTML Basics Assessment',
      description: 'Test your knowledge of HTML fundamentals',
      totalQuestions: 10,
      passingScore: 70,
      timeLimit: 30,
      attempts: [
        {
          id: 'a1',
          studentName: 'John Doe',
          studentId: 's1',
          score: 85,
          timeTaken: 25,
          submittedAt: '2024-03-10T14:30:00Z',
          answers: []
        },
        // More attempts...
      ],
      averageScore: 82,
      passRate: 90,
      createdAt: '2024-03-01T10:00:00Z',
      lastModified: '2024-03-01T10:00:00Z',
      isActive: true
    },
    // More assessments...
  ]);

  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null);
  const [showAttempts, setShowAttempts] = useState<boolean>(false);

  const handleModifyAssessment = (assessmentId: string) => {
    window.location.href = `/dashboard/trainer/assessments/${assessmentId}/edit`;
  };

  const handleViewAttempts = (assessmentId: string) => {
    setSelectedAssessment(assessmentId);
    setShowAttempts(true);
  };

  const handleToggleStatus = (assessmentId: string) => {
    setAssessments(prev =>
      prev.map(assessment =>
        assessment.id === assessmentId
          ? { ...assessment, isActive: !assessment.isActive }
          : assessment
      )
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="overflow-hidden">
      {/* Assessment List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assessment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statistics
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {assessments.map((assessment) => (
              <tr key={assessment.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{assessment.title}</div>
                      <div className="text-sm text-gray-500">{assessment.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 rounded">
                    {assessment.code}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    Avg. Score: {assessment.averageScore}%
                  </div>
                  <div className="text-sm text-gray-500">
                    Pass Rate: {assessment.passRate}%
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleStatus(assessment.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      assessment.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {assessment.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleViewAttempts(assessment.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Attempts
                    </button>
                    <button
                      onClick={() => handleModifyAssessment(assessment.id)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Modify
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Attempts Modal */}
      {showAttempts && selectedAssessment && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Assessment Attempts
                </h3>
                <button
                  onClick={() => setShowAttempts(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-6 py-4 max-h-[calc(90vh-8rem)] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time Taken
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assessments
                    .find(a => a.id === selectedAssessment)
                    ?.attempts.map((attempt) => (
                      <tr key={attempt.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {attempt.studentName}
                          </div>
                          <div className="text-sm text-gray-500">{attempt.studentId}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{attempt.score}%</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{attempt.timeTaken} mins</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(attempt.submittedAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              attempt.score >= assessments.find(a => a.id === selectedAssessment)!.passingScore
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {attempt.score >= assessments.find(a => a.id === selectedAssessment)!.passingScore
                              ? 'Passed'
                              : 'Failed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssessmentList; 