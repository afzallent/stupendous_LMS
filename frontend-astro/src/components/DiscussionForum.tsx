import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  avatar: string;
  role: 'student' | 'trainer';
}

interface Comment {
  id: string;
  userId: string;
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  userId: string;
  timestamp: string;
  comments: Comment[];
  tags: string[];
  likes: number;
  isLiked: boolean;
  isPinned: boolean;
}

interface DiscussionForumProps {
  courseId: string;
  currentUser: User;
}

const DiscussionForum: React.FC<DiscussionForumProps> = ({ courseId, currentUser }) => {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [newDiscussion, setNewDiscussion] = useState({ title: '', content: '', tags: '' });
  const [newComment, setNewComment] = useState('');
  const [isCreatingDiscussion, setIsCreatingDiscussion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine' | 'unanswered' | 'pinned'>('all');
  
  useEffect(() => {
    // In a real implementation, this would be an API call to fetch discussions
    fetchDiscussions();
  }, [courseId, filter]);
  
  const fetchDiscussions = () => {
    setLoading(true);
    
    // Simulate API call with timeout
    setTimeout(() => {
      // Mock data for discussions
      const mockUsers: Record<string, User> = {
        'user1': { id: 'user1', name: 'John Doe', avatar: 'https://placehold.co/48', role: 'student' },
        'user2': { id: 'user2', name: 'Sarah Johnson', avatar: 'https://placehold.co/48', role: 'trainer' },
        'user3': { id: 'user3', name: 'Mike Brown', avatar: 'https://placehold.co/48', role: 'student' }
      };
      
      const mockDiscussions: Discussion[] = [
        {
          id: 'disc1',
          title: 'How to center a div?',
          content: 'I\'m trying to center a div horizontally and vertically. I\'ve tried using margin: auto but it only centers horizontally. Any ideas?',
          userId: 'user1',
          timestamp: '2023-06-15T14:30:00Z',
          comments: [
            {
              id: 'comm1',
              userId: 'user2',
              content: 'You can use display: flex and justify-content: center and align-items: center on the parent element.',
              timestamp: '2023-06-15T15:10:00Z',
              likes: 5,
              isLiked: true
            },
            {
              id: 'comm2',
              userId: 'user3',
              content: 'Another way is to use position: absolute with top: 50%, left: 50% and transform: translate(-50%, -50%).',
              timestamp: '2023-06-15T16:45:00Z',
              likes: 3,
              isLiked: false
            }
          ],
          tags: ['css', 'layout'],
          likes: 8,
          isLiked: true,
          isPinned: true
        },
        {
          id: 'disc2',
          title: 'JavaScript event listeners not working',
          content: 'I\'m trying to add a click event listener to a button, but nothing happens when I click it. Here\'s my code: `document.getElementById("myButton").addEventListener("click", function() { alert("clicked"); });`',
          userId: 'user3',
          timestamp: '2023-06-14T10:15:00Z',
          comments: [],
          tags: ['javascript', 'dom'],
          likes: 2,
          isLiked: false,
          isPinned: false
        }
      ];
      
      let filteredDiscussions = [...mockDiscussions];
      
      // Apply filters
      if (filter === 'mine') {
        filteredDiscussions = filteredDiscussions.filter(d => d.userId === currentUser.id);
      } else if (filter === 'unanswered') {
        filteredDiscussions = filteredDiscussions.filter(d => d.comments.length === 0);
      } else if (filter === 'pinned') {
        filteredDiscussions = filteredDiscussions.filter(d => d.isPinned);
      }
      
      // Sort by pinned status and then by timestamp (newest first)
      filteredDiscussions.sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      
      setDiscussions(filteredDiscussions);
      setLoading(false);
    }, 800);
  };
  
  const handleCreateDiscussion = () => {
    // Validate input
    if (!newDiscussion.title || !newDiscussion.content) {
      alert('Please fill out the title and content fields.');
      return;
    }
    
    // In a real implementation, this would be an API call to create a discussion
    const tagsArray = newDiscussion.tags
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag);
    
    const newDiscussionObj: Discussion = {
      id: `disc${discussions.length + 1}`,
      title: newDiscussion.title,
      content: newDiscussion.content,
      userId: currentUser.id,
      timestamp: new Date().toISOString(),
      comments: [],
      tags: tagsArray,
      likes: 0,
      isLiked: false,
      isPinned: false
    };
    
    setDiscussions([newDiscussionObj, ...discussions]);
    setIsCreatingDiscussion(false);
    setNewDiscussion({ title: '', content: '', tags: '' });
  };
  
  const handleAddComment = () => {
    if (!selectedDiscussion || !newComment.trim()) {
      return;
    }
    
    // In a real implementation, this would be an API call to add a comment
    const newCommentObj: Comment = {
      id: `comm${selectedDiscussion.comments.length + 1}`,
      userId: currentUser.id,
      content: newComment,
      timestamp: new Date().toISOString(),
      likes: 0,
      isLiked: false
    };
    
    const updatedDiscussion = {
      ...selectedDiscussion,
      comments: [...selectedDiscussion.comments, newCommentObj]
    };
    
    setSelectedDiscussion(updatedDiscussion);
    setDiscussions(discussions.map(d => 
      d.id === selectedDiscussion.id ? updatedDiscussion : d
    ));
    setNewComment('');
  };
  
  const toggleLikeDiscussion = (discussionId: string) => {
    // In a real implementation, this would be an API call to like/unlike a discussion
    setDiscussions(discussions.map(d => {
      if (d.id === discussionId) {
        const newLikeStatus = !d.isLiked;
        return {
          ...d,
          isLiked: newLikeStatus,
          likes: newLikeStatus ? d.likes + 1 : d.likes - 1
        };
      }
      return d;
    }));
    
    if (selectedDiscussion && selectedDiscussion.id === discussionId) {
      setSelectedDiscussion({
        ...selectedDiscussion,
        isLiked: !selectedDiscussion.isLiked,
        likes: selectedDiscussion.isLiked ? selectedDiscussion.likes - 1 : selectedDiscussion.likes + 1
      });
    }
  };
  
  const toggleLikeComment = (commentId: string) => {
    if (!selectedDiscussion) return;
    
    // In a real implementation, this would be an API call to like/unlike a comment
    const updatedComments = selectedDiscussion.comments.map(c => {
      if (c.id === commentId) {
        const newLikeStatus = !c.isLiked;
        return {
          ...c,
          isLiked: newLikeStatus,
          likes: newLikeStatus ? c.likes + 1 : c.likes - 1
        };
      }
      return c;
    });
    
    const updatedDiscussion = {
      ...selectedDiscussion,
      comments: updatedComments
    };
    
    setSelectedDiscussion(updatedDiscussion);
    setDiscussions(discussions.map(d => 
      d.id === selectedDiscussion.id ? updatedDiscussion : d
    ));
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getUserById = (userId: string): User => {
    // Mock user lookup
    const mockUsers: Record<string, User> = {
      'user1': { id: 'user1', name: 'John Doe', avatar: 'https://placehold.co/48', role: 'student' },
      'user2': { id: 'user2', name: 'Sarah Johnson', avatar: 'https://placehold.co/48', role: 'trainer' },
      'user3': { id: 'user3', name: 'Mike Brown', avatar: 'https://placehold.co/48', role: 'student' }
    };
    
    return mockUsers[userId] || { 
      id: userId, 
      name: 'Unknown User', 
      avatar: 'https://placehold.co/48', 
      role: 'student' 
    };
  };
  
  // Discussion list view
  if (!selectedDiscussion) {
    return (
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Course Discussions</h2>
            <button
              onClick={() => setIsCreatingDiscussion(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              New Discussion
            </button>
          </div>
          
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md ${
                filter === 'all' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('mine')}
              className={`px-3 py-1 rounded-md ${
                filter === 'mine' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              My Discussions
            </button>
            <button
              onClick={() => setFilter('unanswered')}
              className={`px-3 py-1 rounded-md ${
                filter === 'unanswered' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unanswered
            </button>
            <button
              onClick={() => setFilter('pinned')}
              className={`px-3 py-1 rounded-md ${
                filter === 'pinned' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pinned
            </button>
          </div>
        </div>
        
        {isCreatingDiscussion ? (
          <div className="p-4">
            <h3 className="text-lg font-bold mb-4">Create New Discussion</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="discussionTitle" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  id="discussionTitle"
                  type="text"
                  value={newDiscussion.title}
                  onChange={(e) => setNewDiscussion({...newDiscussion, title: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Enter a descriptive title"
                />
              </div>
              
              <div>
                <label htmlFor="discussionContent" className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <textarea
                  id="discussionContent"
                  value={newDiscussion.content}
                  onChange={(e) => setNewDiscussion({...newDiscussion, content: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md h-32"
                  placeholder="Describe your question or topic in detail"
                />
              </div>
              
              <div>
                <label htmlFor="discussionTags" className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  id="discussionTags"
                  type="text"
                  value={newDiscussion.tags}
                  onChange={(e) => setNewDiscussion({...newDiscussion, tags: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="html, css, javascript"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsCreatingDiscussion(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateDiscussion}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Post Discussion
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-gray-500">Loading discussions...</p>
              </div>
            ) : discussions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">No discussions found.</p>
                <button
                  onClick={() => setIsCreatingDiscussion(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Start a Discussion
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {discussions.map((discussion) => {
                  const user = getUserById(discussion.userId);
                  return (
                    <li key={discussion.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start space-x-3">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="flex items-center">
                            {discussion.isPinned && (
                              <span className="mr-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                Pinned
                              </span>
                            )}
                            <h3 
                              className="text-lg font-semibold text-blue-600 hover:underline cursor-pointer"
                              onClick={() => setSelectedDiscussion(discussion)}
                            >
                              {discussion.title}
                            </h3>
                          </div>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <span className="font-medium">{user.name}</span>
                            <span className="mx-1">•</span>
                            <span>{formatDate(discussion.timestamp)}</span>
                            <span className="mx-1">•</span>
                            <span>{discussion.comments.length} {discussion.comments.length === 1 ? 'reply' : 'replies'}</span>
                          </div>
                          <p className="mt-2 text-gray-600 line-clamp-2">{discussion.content}</p>
                          <div className="mt-3 flex items-center space-x-4">
                            <button
                              onClick={() => toggleLikeDiscussion(discussion.id)}
                              className={`flex items-center space-x-1 text-sm ${
                                discussion.isLiked ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'
                              }`}
                            >
                              <svg className="w-4 h-4" fill={discussion.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905l.184 5.405C11.08 10.154 10.389 11 9.5 11M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                              <span>{discussion.likes}</span>
                            </button>
                            <button
                              onClick={() => setSelectedDiscussion(discussion)}
                              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-blue-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <span>Reply</span>
                            </button>
                          </div>
                          <div className="mt-2">
                            {discussion.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full mr-2 mb-1"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // Discussion detail view
  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-4 border-b flex items-center">
        <button
          onClick={() => setSelectedDiscussion(null)}
          className="mr-3 text-gray-600 hover:text-gray-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="text-xl font-bold">Discussion Thread</h2>
      </div>
      
      <div className="p-4 border-b">
        <div className="flex items-start space-x-3">
          <img
            src={getUserById(selectedDiscussion.userId).avatar}
            alt={getUserById(selectedDiscussion.userId).name}
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1">
            <h3 className="text-xl font-semibold">{selectedDiscussion.title}</h3>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <span className="font-medium">{getUserById(selectedDiscussion.userId).name}</span>
              <span className="mx-1">•</span>
              <span>{formatDate(selectedDiscussion.timestamp)}</span>
            </div>
            
            <div className="mt-3 text-gray-700 whitespace-pre-line">
              {selectedDiscussion.content}
            </div>
            
            <div className="mt-4 flex items-center space-x-4">
              <button
                onClick={() => toggleLikeDiscussion(selectedDiscussion.id)}
                className={`flex items-center space-x-1 text-sm ${
                  selectedDiscussion.isLiked ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'
                }`}
              >
                <svg className="w-4 h-4" fill={selectedDiscussion.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905l.184 5.405C11.08 10.154 10.389 11 9.5 11M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                <span>{selectedDiscussion.likes}</span>
              </button>
            </div>
            
            <div className="mt-2">
              {selectedDiscussion.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full mr-2 mb-1"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold mb-4">
          {selectedDiscussion.comments.length} {selectedDiscussion.comments.length === 1 ? 'Reply' : 'Replies'}
        </h3>
        
        {selectedDiscussion.comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No replies yet. Be the first to respond!</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {selectedDiscussion.comments.map((comment) => {
              const commentUser = getUserById(comment.userId);
              return (
                <li key={comment.id} className="border rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <img
                      src={commentUser.avatar}
                      alt={commentUser.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="font-medium">{commentUser.name}</span>
                        {commentUser.role === 'trainer' && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            Instructor
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(comment.timestamp)}
                      </div>
                      
                      <div className="mt-2 text-gray-700">
                        {comment.content}
                      </div>
                      
                      <div className="mt-3">
                        <button
                          onClick={() => toggleLikeComment(comment.id)}
                          className={`flex items-center space-x-1 text-xs ${
                            comment.isLiked ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'
                          }`}
                        >
                          <svg className="w-3 h-3" fill={comment.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905l.184 5.405C11.08 10.154 10.389 11 9.5 11M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                          <span>{comment.likes}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Add a Reply</h3>
          <div className="flex space-x-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full"
            />
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md h-24"
                placeholder="Write your reply here..."
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className={`px-4 py-2 rounded-md ${
                    !newComment.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Post Reply
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscussionForum; 