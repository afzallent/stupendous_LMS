import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useProgress } from '../hooks/useProgress';
import ReactPlayer from 'react-player/lazy';
import { API_ENDPOINTS, apiCall } from '../config/api.config';

interface Lecture {
  id: string;
  title: string;
  duration: string;
  video_url: string;
  is_completed: boolean;
  progress_seconds?: number;
  last_watched_at?: string;
}

interface Section {
  id: string;
  title: string;
  lectures: Lecture[];
}

interface Course {
  id: string;
  title: string;
  instructor: {
    name: string;
    avatar: string;
    designation: string;
  };
  sections: Section[];
}

interface Note {
  id: string;
  lesson_id: string;
  timestamp: string;
  content: string;
}

interface CoursePlayerData {
  course: Course;
  notes: Note[];
}

interface CoursePlayerProps {
  courseId?: string;
}

// Fetch course data from API
const fetchCourseData = async (courseId: string): Promise<CoursePlayerData> => {
  const result = await apiCall(`${API_ENDPOINTS.courseplayer}?course_id=${courseId}`, {
    method: 'GET'
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch course data');
  }

  return result.data || {};
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

function CoursePlayer({ courseId }: CoursePlayerProps) {
  const [courseData, setCourseData] = useState<CoursePlayerData | null>(null);
  const [currentLecture, setCurrentLecture] = useState<Lecture | null>(null);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);
  const [currentTab, setCurrentTab] = useState<'overview' | 'transcript' | 'resources' | 'notes' | 'discussion'>('overview');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [totalTime, setTotalTime] = useState("20:00");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [savedToFavorites, setSavedToFavorites] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { progress, updateProgress } = useProgress(courseData?.course?.id || '');
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReactPlayer>(null);
  const [isReady, setIsReady] = useState(false);

  // Load course data on component mount
  useEffect(() => {
    const loadCourseData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!courseId) {
          throw new Error('No course ID provided');
        }

        const data = await fetchCourseData(courseId);
        setCourseData(data);
        
        // Set the first lecture as current if available
        if (data.course.sections.length > 0 && data.course.sections[0].lectures.length > 0) {
          setCurrentLecture(data.course.sections[0].lectures[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load course data');
        console.error('Error loading course data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();

    // Cleanup function to handle unmounting
    return () => {
      if (playerRef.current) {
        // Reset the player state
        playerRef.current.seekTo(0);
      }
    };
  }, []);

  const handleLectureComplete = (lectureId: string) => {
    updateProgress(lectureId);
  };

  const handleSaveNote = () => {
    // In a real implementation, this would save a note
    setShowNoteForm(false);
  };

  const handleSaveToFavorites = () => {
    setSavedToFavorites(!savedToFavorites);
  };

  const handlePlaybackSpeedChange = (speed: number) => {
    if (playerRef.current) {
      setPlaybackSpeed(speed);
      setShowSpeedOptions(false);
    }
  };

  const handleProgress = (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => {
    setCurrentTime(formatTime(state.playedSeconds));
    setTotalTime(formatTime(state.loadedSeconds));
  };

  const handleReady = () => {
    setIsReady(true);
  };

  const handleError = (error: any) => {
    console.error('Player error:', error);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course content...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Course</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show empty state if no course data
  if (!courseData || !currentLecture) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No course content available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation - Enhanced for mobile */}
      <nav className="bg-white shadow-sm px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center space-x-4 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
          <button className="text-gray-600 hover:text-gray-800 flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-gray-800 font-medium whitespace-nowrap">Back to Course</span>
          <div className="flex items-center space-x-2 text-sm text-gray-500 overflow-x-auto">
            <span className="whitespace-nowrap">{courseData.course.title}</span>
            <span className="whitespace-nowrap">/</span>
            <span className="whitespace-nowrap">{currentLecture ? 'Current Lesson' : 'Course Content'}</span>
            {currentLecture && (
              <>
                <span className="whitespace-nowrap">/</span>
                <span className="text-blue-600 whitespace-nowrap">{currentLecture.title}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4 justify-end">
          <span className="text-sm text-gray-600 whitespace-nowrap">{currentTime}/{totalTime}</span>
          <button className="text-gray-600 hover:text-gray-800 p-1">
            <span className="sr-only">Theater Mode</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect width="18" height="14" x="3" y="5" rx="2" strokeWidth="2" />
            </svg>
          </button>
          <div className="relative">
            <button 
              className="text-gray-600 hover:text-gray-800 flex items-center p-1"
              onClick={() => setShowSpeedOptions(!showSpeedOptions)}
            >
              <span className="text-sm">{playbackSpeed}x</span>
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showSpeedOptions && (
              <div className="absolute right-0 top-full mt-1 bg-white shadow-lg rounded-md py-2 z-50 w-24">
                {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(speed => (
                  <button
                    key={speed}
                    className={`block w-full text-left px-4 py-1 text-sm ${playbackSpeed === speed ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                    onClick={() => handlePlaybackSpeedChange(speed)}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="flex flex-col lg:flex-row flex-1">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Player */}
          <div className="flex justify-center items-center py-8 bg-gray-100">
            <div className="ml-20 aspect-w-16 aspect-h-9 w-full rounded-xl shadow-lg overflow-hidden border border-gray-200 bg-black">
              <div ref={playerWrapperRef} className="w-full h-full">
                <Suspense fallback={
                  <div className="w-full h-full bg-black flex items-center justify-center text-white">
                    Loading player...
                  </div>
                }>
                  <ReactPlayer
                    ref={playerRef}
                    url={currentLecture.video_url}
                    className="w-full h-full rounded-xl"
                    width="100%"
                    height="100%"
                    controls={true}
                    playing={isAutoplayEnabled}
                    playbackRate={playbackSpeed}
                    pip={false}
                    stopOnUnmount={false}
                    config={{
                      youtube: {
                        playerVars: {
                          autoplay: isAutoplayEnabled ? 1 : 0,
                          modestbranding: 1,
                          playsinline: 1,
                          origin: typeof window !== 'undefined' ? window.location.origin : '',
                        },
                      },
                      file: {
                        attributes: {
                          style: { width: '100%', height: '100%' },
                        },
                      },
                    }}
                    onProgress={handleProgress}
                    onReady={handleReady}
                    onError={handleError}
                    onEnded={() => handleLectureComplete(currentLecture.id)}
                  />
                </Suspense>
              </div>
            </div>
          </div>

          {/* Video Info and Tabs */}
          <div className="max-w-full lg:max-w-5xl mx-auto w-full p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 mb-6 pb-4">
              <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                <img 
                  src={courseData.course.instructor.avatar} 
                  alt={courseData.course.instructor.name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <h3 className="font-medium text-gray-900">{courseData.course.instructor.name}</h3>
                  <p className="text-sm text-gray-500">{courseData.course.instructor.designation}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="mr-2 text-sm text-gray-500">124</span>
                <button className="p-2 text-gray-500 hover:text-gray-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Tab Navigation - Scrollable on mobile */}
            <div className="flex space-x-8 overflow-x-auto border-b border-gray-200">
              <button 
                className={`pb-4 text-sm font-medium relative whitespace-nowrap ${currentTab === 'overview' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setCurrentTab('overview')}
              >
                Overview
                {currentTab === 'overview' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
              </button>
              <button 
                className={`pb-4 text-sm font-medium relative whitespace-nowrap ${currentTab === 'transcript' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setCurrentTab('transcript')}
              >
                Transcript
                {currentTab === 'transcript' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
              </button>
              <button 
                className={`pb-4 text-sm font-medium relative whitespace-nowrap ${currentTab === 'resources' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setCurrentTab('resources')}
              >
                Resources
                {currentTab === 'resources' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
              </button>
              <button 
                className={`pb-4 text-sm font-medium relative whitespace-nowrap ${currentTab === 'notes' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setCurrentTab('notes')}
              >
                Notes
                <div className="absolute -top-1 -right-1.5 w-3 h-3 bg-blue-600 rounded-full"></div>
                {currentTab === 'notes' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
              </button>
              <button
                className={`pb-4 text-sm font-medium relative whitespace-nowrap ${currentTab === 'discussion' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setCurrentTab('discussion')}
              >
                Discussion
                <div className="absolute -top-1 -right-1.5 w-3 h-3 bg-blue-600 rounded-full"></div>
                {currentTab === 'discussion' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
              </button>
            </div>

            {/* Tab Content */}
            <div className="py-6">
              {/* Overview Tab */}
              {currentTab === 'overview' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">About This Lecture</h2>
                  <p className="text-gray-700 mb-6">
                    Understanding HTML structure and basic tags
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h3 className="text-gray-600 text-sm mb-1">Course</h3>
                      <p className="text-gray-900">{courseData.course.title}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h3 className="text-gray-600 text-sm mb-1">Current Lesson</h3>
                      <p className="text-gray-900">{currentLecture.title}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <h3 className="text-gray-600 text-sm mb-1">Duration</h3>
                      <p className="text-gray-900">{currentLecture.duration}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes Tab */}
              {currentTab === 'notes' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Notes</h2>
                  
                  <div className="space-y-4">
                    {courseData.notes.length > 0 ? (
                      courseData.notes.map(note => (
                        <div key={note.id} className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
                          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                            <div className="flex items-center space-x-2">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-sm text-gray-500">{note.timestamp}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button className="text-gray-400 hover:text-gray-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button className="text-gray-400 hover:text-gray-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <p className="text-gray-700">{note.content}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No notes yet. Add your first note while watching the video!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Course Content Sidebar - Hidden on mobile, shown as a modal */}
        <div className="hidden lg:block w-96 border-l border-gray-200 bg-white overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Course Content</h2>
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>{progress}% complete</span>
              <div className="flex items-center space-x-2">
                <span>Autoplay</span>
                <button
                  onClick={() => setIsAutoplayEnabled(!isAutoplayEnabled)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${
                    isAutoplayEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                      isAutoplayEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Course Sections */}
          <div className="divide-y divide-gray-200">
            {courseData.course.sections.map((section) => (
              <div key={section.id} className="border-b border-gray-200">
                <div className="p-4 bg-gray-50">
                  <h3 className="font-medium text-gray-800">{section.title}</h3>
                </div>
                <div>
                  {section.lectures.map((lecture) => (
                    <button
                      key={lecture.id}
                      onClick={() => setCurrentLecture(lecture)}
                      className={`w-full p-4 flex items-start space-x-4 hover:bg-gray-50 ${
                        currentLecture && currentLecture.id === lecture.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {lecture.is_completed ? (
                          <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-gray-800">{lecture.title}</p>
                        <p className="text-sm text-gray-500">{lecture.duration}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Quiz Knowledge Check */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-800">Knowledge Check</h3>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">3 questions • ~2 min</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">Quick quiz on Introduction to HTML</p>
            <button className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
              Start Quiz
            </button>
          </div>
        </div>

        {/* Mobile Course Content Button */}
        <div className="fixed bottom-4 right-4 lg:hidden">
          <button 
            className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700"
            onClick={() => {/* Toggle course content modal */}}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Note Form Modal */}
      {showNoteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Note</h3>
              <button 
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setShowNoteForm(false)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mb-4">
              <label htmlFor="note-time" className="block text-sm font-medium text-gray-700 mb-1">Timestamp</label>
              <input 
                type="text" 
                id="note-time" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={currentTime}
                readOnly
              />
            </div>
            <div className="mb-4">
              <label htmlFor="note-content" className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <textarea 
                id="note-content" 
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your note here..."
              ></textarea>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowNoteForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CoursePlayer;

function extractYouTubeId(url: string): string {
  // Handles various YouTube URL formats
  const regex = /(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : '';
}