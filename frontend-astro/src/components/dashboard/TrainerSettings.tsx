import React, { useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS, apiCall, getApiUrl } from '../../config/api.config';

export default function TrainerSettings() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    expertise: '',
    autoPublish: false,
    discussionNotifications: true,
    studentProgress: true,
    profileImage: '',
  });
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hardcoded trainer ID for testing without Clerk
  const TRAINER_ID = 'trainer_demo_001'; 

  useEffect(() => {
    const fetchTrainerSettings = async () => {
      try {
        const response = await apiCall(`${API_ENDPOINTS.trainerSettings}?trainer_id=${TRAINER_ID}`);

        if (response.success) {
          const data = response.data || {};
          setFormData({
            firstName: data.name || '',
            lastName: data.last_name || '',
            email: data.email || '',
            phone: data.phone || '',
            bio: data.bio || '',
            expertise: data.expertise || '',
            autoPublish: data.auto_publish === 1, // Assuming 1 for true, 0 for false
            discussionNotifications: data.discussion_notifications === 1,
            studentProgress: data.student_progress === 1,
            profileImage: data.profile_image || '',
          });
        } else {
          setMessage({ text: response.error || 'Failed to fetch trainer settings.', type: 'error' });
        }
      } catch (error) {
        console.error('Error fetching trainer settings:', error);
        setMessage({ text: 'Failed to connect to backend API.', type: 'error' });
      }
    };

    fetchTrainerSettings();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setFormData(prev => ({ ...prev, profileImage: URL.createObjectURL(e.target.files[0]) }));
    }
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitFormData = new FormData();
    submitFormData.append('trainer_id', TRAINER_ID);
    submitFormData.append('firstName', formData.firstName);
    submitFormData.append('lastName', formData.lastName);
    submitFormData.append('email', formData.email);
    submitFormData.append('phone', formData.phone);
    submitFormData.append('bio', formData.bio);
    submitFormData.append('expertise', formData.expertise);
    submitFormData.append('auto_publish', formData.autoPublish ? '1' : '0');
    submitFormData.append('discussion_notifications', formData.discussionNotifications ? '1' : '0');
    submitFormData.append('student_progress', formData.studentProgress ? '1' : '0');
    if (selectedFile) {
      submitFormData.append('profile_image', selectedFile);
    }

    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.trainerSettings), {
        method: 'POST',
        body: submitFormData,
      });

      const data = await response.json();

      if (data.success || response.ok) {
        setMessage({ text: 'Settings updated successfully!', type: 'success' });
      } else {
        setMessage({ text: data.error || 'Failed to update settings.', type: 'error' });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      setMessage({ text: 'Failed to connect to backend API.', type: 'error' });
    } finally {
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-10">
      {message && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-md text-white z-50 ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {message.text}
        </div>
      )}
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-medium border-b pb-2 mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input type="text" id="firstName" name="firstName" className="w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.firstName} onChange={handleInputChange} />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input type="text" id="lastName" name="lastName" className="w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.lastName} onChange={handleInputChange} />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" id="email" name="email" className="w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.email} onChange={handleInputChange} />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" id="phone" name="phone" className="w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.phone} onChange={handleInputChange} />
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-medium border-b pb-2 mb-4">Trainer Profile</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea id="bio" name="bio" rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.bio} onChange={handleInputChange}></textarea>
            </div>
            <div>
              <label htmlFor="expertise" className="block text-sm font-medium text-gray-700 mb-1">Areas of Expertise</label>
              <input type="text" id="expertise" name="expertise" className="w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.expertise} onChange={handleInputChange} />
              <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image</label>
              <div className="flex items-center space-x-4">
                <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {formData.profileImage ? <img src={formData.profileImage.startsWith('http') ? formData.profileImage : `${import.meta.env.PUBLIC_API_URL || ''}${formData.profileImage}`} alt="Profile" className="h-20 w-20 object-cover" /> : <span className="text-gray-500">No image</span>}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                <button type="button" onClick={handleUploadButtonClick} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Upload Image</button>
              </div>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-medium border-b pb-2 mb-4">Password</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="currentPassword" >Current Password</label>
              <input type="password" id="currentPassword" name="currentPassword" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div></div>
            <div>
              <label htmlFor="newPassword" >New Password</label>
              <input type="password" id="newPassword" name="newPassword" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label htmlFor="confirmPassword" >Confirm New Password</label>
              <input type="password" id="confirmPassword" name="confirmPassword" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-medium border-b pb-2 mb-4">Course Settings</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <input type="checkbox" id="autoPublish" name="autoPublish" className="h-4 w-4 text-blue-600" checked={formData.autoPublish} onChange={handleInputChange} />
              <label htmlFor="autoPublish" className="ml-2 block text-sm text-gray-700">Auto-publish new courses</label>
            </div>
            <div className="flex items-center">
              <input type="checkbox" id="discussionNotifications" name="discussionNotifications" className="h-4 w-4 text-blue-600" checked={formData.discussionNotifications} onChange={handleInputChange} />
              <label htmlFor="discussionNotifications" className="ml-2 block text-sm text-gray-700">Receive discussion notifications</label>
            </div>
            <div className="flex items-center">
              <input type="checkbox" id="studentProgress" name="studentProgress" className="h-4 w-4 text-blue-600" checked={formData.studentProgress} onChange={handleInputChange} />
              <label htmlFor="studentProgress" className="ml-2 block text-sm text-gray-700">Receive student progress updates</label>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Save Changes</button>
        </div>
      </form>
    </div>
  );
}