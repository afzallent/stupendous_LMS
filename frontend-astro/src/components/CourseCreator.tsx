import React, { useState } from 'react';

interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  assessment?: {
    code: string;
    requiredToUnlock: boolean;
  };
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  transcript: string;
  resources: Resource[];
  notes: string;
  duration: string;
}

interface Resource {
  id: string;
  title: string;
  type: 'pdf' | 'link' | 'file';
  url: string;
}

interface CourseDetails {
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  thumbnail: string;
  prerequisites: string[];
  learningOutcomes: string[];
  finalAssessment?: {
    code: string;
    requiredForCompletion: boolean;
    certificateTemplate?: string;
  };
}

function CourseCreator() {
  const [currentStep, setCurrentStep] = useState<'details' | 'modules' | 'preview'>('details');
  const [courseDetails, setCourseDetails] = useState<CourseDetails>({
    title: '',
    description: '',
    category: '',
    level: 'beginner',
    price: 0,
    thumbnail: '',
    prerequisites: [],
    learningOutcomes: [],
  });
  const [modules, setModules] = useState<Module[]>([]);
  const [currentModuleIndex, setCurrentModuleIndex] = useState<number | null>(null);
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number | null>(null);

  const handleCourseDetailsChange = (field: keyof CourseDetails, value: any) => {
    setCourseDetails(prev => ({ ...prev, [field]: value }));
  };

  const addModule = () => {
    const newModule: Module = {
      id: Date.now().toString(),
      title: '',
      description: '',
      lessons: [],
    };
    setModules(prev => [...prev, newModule]);
    setCurrentModuleIndex(modules.length);
  };

  const addLesson = (moduleIndex: number) => {
    const newLesson: Lesson = {
      id: Date.now().toString(),
      title: '',
      description: '',
      videoUrl: '',
      transcript: '',
      resources: [],
      notes: '',
      duration: '',
    };
    setModules(prev => {
      const updated = [...prev];
      updated[moduleIndex].lessons.push(newLesson);
      return updated;
    });
    setCurrentModuleIndex(moduleIndex);
    setCurrentLessonIndex(modules[moduleIndex].lessons.length);
  };

  const addResource = (moduleIndex: number, lessonIndex: number) => {
    const newResource: Resource = {
      id: Date.now().toString(),
      title: '',
      type: 'pdf',
      url: '',
    };
    setModules(prev => {
      const updated = [...prev];
      updated[moduleIndex].lessons[lessonIndex].resources.push(newResource);
      return updated;
    });
  };

  const handleModuleChange = (moduleIndex: number, field: keyof Module, value: any) => {
    setModules(prev => {
      const updated = [...prev];
      updated[moduleIndex] = { ...updated[moduleIndex], [field]: value };
      return updated;
    });
  };

  const handleLessonChange = (moduleIndex: number, lessonIndex: number, field: keyof Lesson, value: any) => {
    setModules(prev => {
      const updated = [...prev];
      updated[moduleIndex].lessons[lessonIndex] = {
        ...updated[moduleIndex].lessons[lessonIndex],
        [field]: value,
      };
      return updated;
    });
  };

  const handleResourceChange = (
    moduleIndex: number,
    lessonIndex: number,
    resourceIndex: number,
    field: keyof Resource,
    value: any
  ) => {
    setModules(prev => {
      const updated = [...prev];
      updated[moduleIndex].lessons[lessonIndex].resources[resourceIndex] = {
        ...updated[moduleIndex].lessons[lessonIndex].resources[resourceIndex],
        [field]: value,
      };
      return updated;
    });
  };

  const handleModuleAssessment = (moduleIndex: number, assessmentCode: string, required: boolean) => {
    setModules(prev => {
      const updated = [...prev];
      updated[moduleIndex] = {
        ...updated[moduleIndex],
        assessment: {
          code: assessmentCode,
          requiredToUnlock: required
        }
      };
      return updated;
    });
  };

  const handleFinalAssessment = (assessmentCode: string, required: boolean) => {
    setCourseDetails(prev => ({
      ...prev,
      finalAssessment: {
        code: assessmentCode,
        requiredForCompletion: required,
        certificateTemplate: ''
      }
    }));
  };

  const handleSubmit = async () => {
    // TODO: Implement course submission logic
    console.log('Course data:', { courseDetails, modules });
  };

  return (
    <div className="p-6">
      {/* Navigation Steps */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          {['details', 'modules', 'preview'].map((step) => (
            <button
              key={step}
              onClick={() => setCurrentStep(step as any)}
              className={`pb-4 text-sm font-medium relative ${
                currentStep === step
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {step.charAt(0).toUpperCase() + step.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Course Details Form */}
      {currentStep === 'details' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
            <input
              type="text"
              value={courseDetails.title}
              onChange={(e) => handleCourseDetailsChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter course title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={courseDetails.description}
              onChange={(e) => handleCourseDetailsChange('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter course description"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={courseDetails.category}
                onChange={(e) => handleCourseDetailsChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select category</option>
                <option value="web-development">Web Development</option>
                <option value="mobile-development">Mobile Development</option>
                <option value="data-science">Data Science</option>
                <option value="design">Design</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select
                value={courseDetails.level}
                onChange={(e) => handleCourseDetailsChange('level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
            <input
              type="number"
              value={courseDetails.price}
              onChange={(e) => handleCourseDetailsChange('price', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter course price"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL</label>
            <input
              type="text"
              value={courseDetails.thumbnail}
              onChange={(e) => handleCourseDetailsChange('thumbnail', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter thumbnail URL"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setCurrentStep('modules')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Next: Add Modules
            </button>
          </div>
        </div>
      )}

      {/* Modules and Lessons */}
      {currentStep === 'modules' && (
        <div>
          <div className="mb-6">
            <button
              onClick={addModule}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add New Module
            </button>
          </div>

          <div className="space-y-8">
            {modules.map((module, moduleIndex) => (
              <div key={module.id} className="border border-gray-200 rounded-lg p-6">
                <div className="mb-4">
                  <input
                    type="text"
                    value={module.title}
                    onChange={(e) => handleModuleChange(moduleIndex, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                    placeholder="Module title"
                  />
                  <textarea
                    value={module.description}
                    onChange={(e) => handleModuleChange(moduleIndex, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Module description"
                    rows={2}
                  />
                </div>

                {/* Assessment Integration */}
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">Module Assessment</h4>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={module.assessment?.code || ''}
                        onChange={(e) => handleModuleAssessment(moduleIndex, e.target.value, module.assessment?.requiredToUnlock || false)}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                        placeholder="Assessment Code"
                      />
                      <label className="flex items-center space-x-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={module.assessment?.requiredToUnlock || false}
                          onChange={(e) => handleModuleAssessment(moduleIndex, module.assessment?.code || '', e.target.checked)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span>Required to unlock next module</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <button
                    onClick={() => addLesson(moduleIndex)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Add Lesson
                  </button>
                </div>

                <div className="space-y-4">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <div key={lesson.id} className="border-l-4 border-blue-200 pl-4">
                      <input
                        type="text"
                        value={lesson.title}
                        onChange={(e) =>
                          handleLessonChange(moduleIndex, lessonIndex, 'title', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                        placeholder="Lesson title"
                      />

                      <div className="grid grid-cols-2 gap-4 mb-2">
                        <input
                          type="text"
                          value={lesson.videoUrl}
                          onChange={(e) =>
                            handleLessonChange(moduleIndex, lessonIndex, 'videoUrl', e.target.value)
                          }
                          className="px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Video URL"
                        />
                        <input
                          type="text"
                          value={lesson.duration}
                          onChange={(e) =>
                            handleLessonChange(moduleIndex, lessonIndex, 'duration', e.target.value)
                          }
                          className="px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Duration (e.g., 10:30)"
                        />
                      </div>

                      <textarea
                        value={lesson.transcript}
                        onChange={(e) =>
                          handleLessonChange(moduleIndex, lessonIndex, 'transcript', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                        placeholder="Lesson transcript"
                        rows={3}
                      />

                      <textarea
                        value={lesson.notes}
                        onChange={(e) =>
                          handleLessonChange(moduleIndex, lessonIndex, 'notes', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                        placeholder="Lesson notes"
                        rows={2}
                      />

                      <div className="mb-2">
                        <button
                          onClick={() => addResource(moduleIndex, lessonIndex)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                        >
                          Add Resource
                        </button>
                      </div>

                      <div className="space-y-2">
                        {lesson.resources.map((resource, resourceIndex) => (
                          <div key={resource.id} className="flex space-x-2">
                            <select
                              value={resource.type}
                              onChange={(e) =>
                                handleResourceChange(
                                  moduleIndex,
                                  lessonIndex,
                                  resourceIndex,
                                  'type',
                                  e.target.value
                                )
                              }
                              className="px-3 py-2 border border-gray-300 rounded-md w-32"
                            >
                              <option value="pdf">PDF</option>
                              <option value="link">Link</option>
                              <option value="file">File</option>
                            </select>
                            <input
                              type="text"
                              value={resource.title}
                              onChange={(e) =>
                                handleResourceChange(
                                  moduleIndex,
                                  lessonIndex,
                                  resourceIndex,
                                  'title',
                                  e.target.value
                                )
                              }
                              className="px-3 py-2 border border-gray-300 rounded-md flex-1"
                              placeholder="Resource title"
                            />
                            <input
                              type="text"
                              value={resource.url}
                              onChange={(e) =>
                                handleResourceChange(
                                  moduleIndex,
                                  lessonIndex,
                                  resourceIndex,
                                  'url',
                                  e.target.value
                                )
                              }
                              className="px-3 py-2 border border-gray-300 rounded-md flex-1"
                              placeholder="Resource URL"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Final Assessment Section */}
          <div className="mt-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Final Assessment</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  value={courseDetails.finalAssessment?.code || ''}
                  onChange={(e) => handleFinalAssessment(e.target.value, courseDetails.finalAssessment?.requiredForCompletion || false)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Final Assessment Code"
                />
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={courseDetails.finalAssessment?.requiredForCompletion || false}
                    onChange={(e) => handleFinalAssessment(courseDetails.finalAssessment?.code || '', e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span>Required for course completion</span>
                </label>
              </div>
              
              {courseDetails.finalAssessment?.requiredForCompletion && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Template</label>
                  <input
                    type="text"
                    value={courseDetails.finalAssessment?.certificateTemplate || ''}
                    onChange={(e) => setCourseDetails(prev => ({
                      ...prev,
                      finalAssessment: {
                        ...prev.finalAssessment!,
                        certificateTemplate: e.target.value
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Certificate template URL"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep('details')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Back to Details
            </button>
            <button
              onClick={() => setCurrentStep('preview')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Next: Preview
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {currentStep === 'preview' && (
        <div>
          <div className="bg-white rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">{courseDetails.title}</h2>
              <p className="text-gray-600 mb-4">{courseDetails.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="text-sm text-gray-500">Category:</span>
                  <p className="font-medium">{courseDetails.category}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Level:</span>
                  <p className="font-medium">{courseDetails.level}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Price:</span>
                  <p className="font-medium">${courseDetails.price}</p>
                </div>
              </div>

              <div className="space-y-6">
                {modules.map((module) => (
                  <div key={module.id} className="border-t pt-6">
                    <h3 className="text-lg font-medium mb-2">{module.title}</h3>
                    <p className="text-gray-600 mb-4">{module.description}</p>

                    <div className="space-y-4">
                      {module.lessons.map((lesson) => (
                        <div key={lesson.id} className="pl-4 border-l-2 border-gray-200">
                          <h4 className="font-medium">{lesson.title}</h4>
                          <p className="text-sm text-gray-500">{lesson.duration}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep('modules')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Back to Modules
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Create Course
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseCreator; 