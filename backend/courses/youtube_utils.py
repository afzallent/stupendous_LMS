"""
YouTube API utilities for fetching video information
"""
import os
import re
import requests
from typing import Optional, Dict, Any
from decouple import config


def extract_video_id(url: str) -> Optional[str]:
    """
    Extract YouTube video ID from various URL formats
    
    Supports:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://www.youtube.com/embed/VIDEO_ID
    - https://www.youtube.com/v/VIDEO_ID
    """
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None


def get_video_info(video_url: str) -> Dict[str, Any]:
    """
    Fetch video information from YouTube API
    
    Returns:
        dict: {
            'success': bool,
            'title': str,
            'description': str,
            'duration': str (ISO 8601 format),
            'thumbnail': str (URL),
            'embeddable': bool,
            'error': str (if success=False)
        }
    """
    api_key = config('YOUTUBE_API_KEY', default=None)
    
    if not api_key:
        return {
            'success': False,
            'error': 'YouTube API key not configured. Please add YOUTUBE_API_KEY to your .env file.'
        }
    
    video_id = extract_video_id(video_url)
    
    if not video_id:
        return {
            'success': False,
            'error': 'Invalid YouTube URL. Please provide a valid YouTube video link.'
        }
    
    try:
        # YouTube Data API v3 endpoint
        api_url = 'https://www.googleapis.com/youtube/v3/videos'
        params = {
            'part': 'snippet,contentDetails,status',
            'id': video_id,
            'key': api_key
        }
        
        response = requests.get(api_url, params=params, timeout=10)
        
        # Check for API errors before raising
        if response.status_code != 200:
            try:
                error_data = response.json()
                error_message = error_data.get('error', {}).get('message', 'Unknown error')
                return {
                    'success': False,
                    'error': f'YouTube API Error: {error_message}. Please check your API key and ensure YouTube Data API v3 is enabled.'
                }
            except:
                response.raise_for_status()
        
        data = response.json()
        
        if not data.get('items'):
            return {
                'success': False,
                'error': 'Video not found or is private/deleted.'
            }
        
        video = data['items'][0]
        snippet = video.get('snippet', {})
        content_details = video.get('contentDetails', {})
        status = video.get('status', {})
        
        # Check if video is embeddable
        embeddable = status.get('embeddable', False)
        
        # Parse duration from ISO 8601 format (PT1H2M10S) to readable format
        duration_iso = content_details.get('duration', 'PT0S')
        duration_readable = parse_duration(duration_iso)
        
        return {
            'success': True,
            'video_id': video_id,
            'title': snippet.get('title', ''),
            'description': snippet.get('description', ''),
            'duration': duration_readable,
            'duration_iso': duration_iso,
            'thumbnail': snippet.get('thumbnails', {}).get('high', {}).get('url', ''),
            'embeddable': embeddable,
            'channel_title': snippet.get('channelTitle', ''),
        }
        
    except requests.exceptions.RequestException as e:
        return {
            'success': False,
            'error': f'Failed to fetch video information: {str(e)}'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Unexpected error: {str(e)}'
        }


def parse_duration(duration_iso: str) -> str:
    """
    Parse ISO 8601 duration format to readable format
    
    Example: PT1H2M10S -> 1:02:10
             PT5M30S -> 5:30
             PT45S -> 0:45
    """
    import re
    
    pattern = r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?'
    match = re.match(pattern, duration_iso)
    
    if not match:
        return '0:00'
    
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    
    if hours > 0:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    else:
        return f"{minutes}:{seconds:02d}"
