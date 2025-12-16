"""
Test script for YouTube API integration
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_project.settings')
django.setup()

from decouple import config
from courses.youtube_utils import get_video_info, extract_video_id

# Test URLs
test_urls = [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
]

print("=" * 60)
print("YouTube API Test")
print("=" * 60)

# Check if API key is set
api_key = config('YOUTUBE_API_KEY', default=None)
print(f"\n✓ API Key configured: {'Yes' if api_key else 'No'}")
if not api_key:
    print("⚠️  Please set YOUTUBE_API_KEY in your .env file")
    print("   Get your key from: https://console.cloud.google.com/apis/credentials")
    sys.exit(1)

print(f"   Key: {api_key[:10]}...{api_key[-5:]}")

# Test video ID extraction
print("\n" + "=" * 60)
print("Testing Video ID Extraction")
print("=" * 60)
for url in test_urls:
    video_id = extract_video_id(url)
    print(f"✓ {url}")
    print(f"  → Video ID: {video_id}")

# Test API call
print("\n" + "=" * 60)
print("Testing YouTube API Call")
print("=" * 60)
test_url = test_urls[0]
print(f"Fetching info for: {test_url}\n")

result = get_video_info(test_url)

if result.get('success'):
    print("✅ SUCCESS!")
    print(f"   Title: {result.get('title')}")
    print(f"   Channel: {result.get('channel_title')}")
    print(f"   Duration: {result.get('duration')}")
    print(f"   Embeddable: {result.get('embeddable')}")
    print(f"   Thumbnail: {result.get('thumbnail')[:50]}...")
else:
    print("❌ FAILED!")
    print(f"   Error: {result.get('error')}")

print("\n" + "=" * 60)
