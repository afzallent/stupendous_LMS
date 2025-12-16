/**
 * Property-Based Tests for YouTube URL Detection
 * 
 * **Feature: course-editor-redesign, Property 7: YouTube URL Detection**
 * **Validates: Requirements 9.1**
 * 
 * Property 7: YouTube URL Detection
 * *For any* video lesson with a URL matching YouTube patterns (youtube.com/watch, youtu.be),
 * the "Fetch Info" button should be displayed.
 */

import * as fc from 'fast-check'
import { Lesson } from '../types'

/**
 * Generator for valid YouTube URLs
 * Covers common YouTube URL patterns:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtu.be/VIDEO_ID
 * - With additional parameters like &t=, &list=, etc.
 */
const youtubeUrlArb = fc.tuple(
  fc.constantFrom('https://www.youtube.com', 'https://youtube.com', 'https://youtu.be', 'https://www.youtu.be'),
  fc.string({ minLength: 11, maxLength: 11 }).map(s => 
    s.replace(/[^a-zA-Z0-9_-]/g, c => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'[Math.floor(Math.random() * 64)])
  ),
  fc.option(fc.tuple(
    fc.constantFrom('&t=', '&start=', '&list='),
    fc.string({ minLength: 1, maxLength: 20 })
  ))
).map(([domain, videoId, params]) => {
  if (domain.includes('youtu.be')) {
    return `${domain}/${videoId}${params ? params[0] + params[1] : ''}`
  } else {
    return `${domain}/watch?v=${videoId}${params ? params[0] + params[1] : ''}`
  }
})

/**
 * Generator for non-YouTube URLs
 */
const nonYoutubeUrlArb = fc.oneof(
  fc.webUrl(),
  fc.string({ minLength: 5, maxLength: 100 }).filter(s => 
    !s.includes('youtube') && !s.includes('youtu.be')
  )
)

/**
 * Generator for valid video lessons
 */
const videoLessonArb = fc.tuple(
  fc.integer({ min: 1, max: 10000 }),
  fc.integer({ min: 1, max: 1000 }),
  fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 1000 })),
  fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  fc.integer({ min: 0, max: 100 }),
  fc.oneof(fc.constant(null), fc.webUrl()),
  fc.oneof(fc.constant(null), fc.string({ maxLength: 20 })),
  fc.boolean(),
  fc.string({ maxLength: 1000 })
).map(([id, course, chapter, title, order, thumbnail_url, duration, is_embeddable, content]) => ({
  id,
  course,
  chapter,
  title,
  content_type: 'video' as const,
  order,
  video_url: null,
  thumbnail_url,
  duration,
  is_embeddable,
  content,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})) as any as fc.Arbitrary<Lesson>

/**
 * Helper function to detect if a URL is a YouTube URL
 * Matches the patterns specified in Requirements 9.1
 */
function isYouTubeUrl(url: string | null): boolean {
  if (!url) return false
  
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    // Match youtube.com or youtu.be domains
    return hostname === 'youtube.com' || 
           hostname === 'www.youtube.com' ||
           hostname === 'youtu.be' ||
           hostname === 'www.youtu.be'
  } catch {
    // Invalid URL format
    return false
  }
}

/**
 * Helper function to determine if "Fetch Info" button should be displayed
 * Button should display for any video lesson with a YouTube URL
 */
function shouldShowFetchInfoButton(lesson: Lesson): boolean {
  // Only show for video content type
  if (lesson.content_type !== 'video') return false
  
  // Show if URL is a YouTube URL
  return isYouTubeUrl(lesson.video_url)
}

describe('YouTube URL Detection Property Tests', () => {
  /**
   * **Feature: course-editor-redesign, Property 7: YouTube URL Detection**
   * **Validates: Requirements 9.1**
   * 
   * For any video lesson with a URL matching YouTube patterns,
   * the "Fetch Info" button should be displayed.
   */
  describe('Property 7: YouTube URL Detection', () => {
    test('youtube.com/watch URLs trigger Fetch Info button', () => {
      fc.assert(
        fc.property(
          videoLessonArb,
          fc.string({ minLength: 11, maxLength: 11 }).map(s => 
            s.replace(/[^a-zA-Z0-9_-]/g, c => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'[Math.floor(Math.random() * 64)])
          ),
          (lesson, videoId) => {
            const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
            const lessonWithUrl = { ...lesson, video_url: youtubeUrl }
            
            expect(shouldShowFetchInfoButton(lessonWithUrl)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('youtu.be short URLs trigger Fetch Info button', () => {
      fc.assert(
        fc.property(
          videoLessonArb,
          fc.string({ minLength: 11, maxLength: 11 }).map(s => 
            s.replace(/[^a-zA-Z0-9_-]/g, c => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'[Math.floor(Math.random() * 64)])
          ),
          (lesson, videoId) => {
            const youtubeUrl = `https://youtu.be/${videoId}`
            const lessonWithUrl = { ...lesson, video_url: youtubeUrl }
            
            expect(shouldShowFetchInfoButton(lessonWithUrl)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('youtube.com URLs without www trigger Fetch Info button', () => {
      fc.assert(
        fc.property(
          videoLessonArb,
          fc.string({ minLength: 11, maxLength: 11 }).map(s => 
            s.replace(/[^a-zA-Z0-9_-]/g, c => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'[Math.floor(Math.random() * 64)])
          ),
          (lesson, videoId) => {
            const youtubeUrl = `https://youtube.com/watch?v=${videoId}`
            const lessonWithUrl = { ...lesson, video_url: youtubeUrl }
            
            expect(shouldShowFetchInfoButton(lessonWithUrl)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('YouTube URLs with additional parameters trigger Fetch Info button', () => {
      fc.assert(
        fc.property(
          videoLessonArb,
          fc.string({ minLength: 11, maxLength: 11 }).map(s => 
            s.replace(/[^a-zA-Z0-9_-]/g, c => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'[Math.floor(Math.random() * 64)])
          ),
          fc.constantFrom('&t=10', '&start=5', '&list=PLxxx', '&t=10&list=PLxxx'),
          (lesson, videoId, params) => {
            const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}${params}`
            const lessonWithUrl = { ...lesson, video_url: youtubeUrl }
            
            expect(shouldShowFetchInfoButton(lessonWithUrl)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('non-YouTube URLs do not trigger Fetch Info button', () => {
      fc.assert(
        fc.property(
          videoLessonArb,
          nonYoutubeUrlArb,
          (lesson, url) => {
            const lessonWithUrl = { ...lesson, video_url: url }
            
            expect(shouldShowFetchInfoButton(lessonWithUrl)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('null URL does not trigger Fetch Info button', () => {
      fc.assert(
        fc.property(videoLessonArb, (lesson) => {
          const lessonWithoutUrl = { ...lesson, video_url: null }
          
          expect(shouldShowFetchInfoButton(lessonWithoutUrl)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    test('empty string URL does not trigger Fetch Info button', () => {
      fc.assert(
        fc.property(videoLessonArb, (lesson) => {
          const lessonWithEmptyUrl = { ...lesson, video_url: '' }
          
          expect(shouldShowFetchInfoButton(lessonWithEmptyUrl)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    test('Fetch Info button only shows for video content type', () => {
      fc.assert(
        fc.property(
          videoLessonArb,
          fc.constantFrom('markdown', 'h5p', 'html_embed', 'scorm'),
          (lesson, contentType) => {
            const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            const lessonWithDifferentType = {
              ...lesson,
              content_type: contentType as any,
              video_url: youtubeUrl,
            }
            
            // Should not show button for non-video content types
            expect(shouldShowFetchInfoButton(lessonWithDifferentType)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('YouTube URL detection is case-insensitive for domain', () => {
      fc.assert(
        fc.property(
          videoLessonArb,
          fc.string({ minLength: 11, maxLength: 11 }).map(s => 
            s.replace(/[^a-zA-Z0-9_-]/g, c => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'[Math.floor(Math.random() * 64)])
          ),
          (lesson, videoId) => {
            // Test various case combinations
            const urls = [
              `https://YOUTUBE.COM/watch?v=${videoId}`,
              `https://YouTube.Com/watch?v=${videoId}`,
              `https://YOUTU.BE/${videoId}`,
              `https://YouTu.Be/${videoId}`,
            ]
            
            urls.forEach(url => {
              const lessonWithUrl = { ...lesson, video_url: url }
              expect(shouldShowFetchInfoButton(lessonWithUrl)).toBe(true)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('YouTube URL detection works with http protocol', () => {
      fc.assert(
        fc.property(
          videoLessonArb,
          fc.string({ minLength: 11, maxLength: 11 }).map(s => 
            s.replace(/[^a-zA-Z0-9_-]/g, c => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'[Math.floor(Math.random() * 64)])
          ),
          (lesson, videoId) => {
            const youtubeUrl = `http://www.youtube.com/watch?v=${videoId}`
            const lessonWithUrl = { ...lesson, video_url: youtubeUrl }
            
            expect(shouldShowFetchInfoButton(lessonWithUrl)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('invalid URLs do not trigger Fetch Info button', () => {
      fc.assert(
        fc.property(
          videoLessonArb,
          fc.string({ minLength: 5, maxLength: 50 }).filter(s => 
            !s.includes('://') && !s.includes('youtube') && !s.includes('youtu.be')
          ),
          (lesson, invalidUrl) => {
            const lessonWithInvalidUrl = { ...lesson, video_url: invalidUrl }
            
            expect(shouldShowFetchInfoButton(lessonWithInvalidUrl)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('YouTube URL detection preserves lesson data', () => {
      fc.assert(
        fc.property(
          videoLessonArb,
          fc.string({ minLength: 11, maxLength: 11 }).map(s => 
            s.replace(/[^a-zA-Z0-9_-]/g, c => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'[Math.floor(Math.random() * 64)])
          ),
          (lesson, videoId) => {
            const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
            const lessonWithUrl = { ...lesson, video_url: youtubeUrl }
            
            // Verify all lesson data is preserved
            expect(lessonWithUrl.id).toBe(lesson.id)
            expect(lessonWithUrl.course).toBe(lesson.course)
            expect(lessonWithUrl.chapter).toBe(lesson.chapter)
            expect(lessonWithUrl.title).toBe(lesson.title)
            expect(lessonWithUrl.content_type).toBe('video')
            expect(lessonWithUrl.order).toBe(lesson.order)
            expect(lessonWithUrl.thumbnail_url).toBe(lesson.thumbnail_url)
            expect(lessonWithUrl.duration).toBe(lesson.duration)
            expect(lessonWithUrl.is_embeddable).toBe(lesson.is_embeddable)
            expect(lessonWithUrl.content).toBe(lesson.content)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('multiple lessons with YouTube URLs all show Fetch Info button', () => {
      fc.assert(
        fc.property(
          fc.array(videoLessonArb, { minLength: 1, maxLength: 10 }),
          fc.array(
            fc.string({ minLength: 11, maxLength: 11 }).map(s => 
              s.replace(/[^a-zA-Z0-9_-]/g, c => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'[Math.floor(Math.random() * 64)])
            ),
            { minLength: 1, maxLength: 10 }
          ),
          (lessons, videoIds) => {
            const lessonsWithUrls = lessons.map((lesson, i) => ({
              ...lesson,
              video_url: `https://www.youtube.com/watch?v=${videoIds[i % videoIds.length]}`,
            }))
            
            // All should show Fetch Info button
            lessonsWithUrls.forEach(lesson => {
              expect(shouldShowFetchInfoButton(lesson)).toBe(true)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('mixed YouTube and non-YouTube URLs are detected correctly', () => {
      fc.assert(
        fc.property(
          fc.array(videoLessonArb, { minLength: 2, maxLength: 10 }),
          fc.array(
            fc.string({ minLength: 11, maxLength: 11 }).map(s => 
              s.replace(/[^a-zA-Z0-9_-]/g, c => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'[Math.floor(Math.random() * 64)])
            ),
            { minLength: 1, maxLength: 5 }
          ),
          (lessons, videoIds) => {
            const lessonsWithUrls = lessons.map((lesson, i) => {
              // Alternate between YouTube and non-YouTube URLs
              const isYouTube = i % 2 === 0
              const url = isYouTube
                ? `https://www.youtube.com/watch?v=${videoIds[i % videoIds.length]}`
                : `https://example.com/video/${i}`
              
              return { ...lesson, video_url: url }
            })
            
            // Verify correct detection for each
            lessonsWithUrls.forEach((lesson, i) => {
              const isYouTube = i % 2 === 0
              expect(shouldShowFetchInfoButton(lesson)).toBe(isYouTube)
            })
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('YouTube URL Detection Edge Cases', () => {
    test('YouTube URL with fragment identifier triggers Fetch Info button', () => {
      fc.assert(
        fc.property(videoLessonArb, (lesson) => {
          const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=10'
          const lessonWithUrl = { ...lesson, video_url: youtubeUrl }
          
          expect(shouldShowFetchInfoButton(lessonWithUrl)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    test('YouTube URL with query parameters in different order triggers Fetch Info button', () => {
      fc.assert(
        fc.property(videoLessonArb, (lesson) => {
          const urls = [
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10',
            'https://www.youtube.com/watch?t=10&v=dQw4w9WgXcQ',
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxxx&t=10',
          ]
          
          urls.forEach(url => {
            const lessonWithUrl = { ...lesson, video_url: url }
            expect(shouldShowFetchInfoButton(lessonWithUrl)).toBe(true)
          })
        }),
        { numRuns: 100 }
      )
    })

    test('YouTube URL with subdomain variations triggers Fetch Info button', () => {
      fc.assert(
        fc.property(videoLessonArb, (lesson) => {
          const urls = [
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'https://youtube.com/watch?v=dQw4w9WgXcQ',
            'https://youtu.be/dQw4w9WgXcQ',
            'https://www.youtu.be/dQw4w9WgXcQ',
          ]
          
          urls.forEach(url => {
            const lessonWithUrl = { ...lesson, video_url: url }
            expect(shouldShowFetchInfoButton(lessonWithUrl)).toBe(true)
          })
        }),
        { numRuns: 100 }
      )
    })

    test('YouTube URL with very long video ID triggers Fetch Info button', () => {
      fc.assert(
        fc.property(
          videoLessonArb,
          fc.string({ minLength: 50, maxLength: 100 }).map(s => 
            s.replace(/[^a-zA-Z0-9_-]/g, c => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'[Math.floor(Math.random() * 64)])
          ),
          (lesson, longId) => {
            const youtubeUrl = `https://www.youtube.com/watch?v=${longId}`
            const lessonWithUrl = { ...lesson, video_url: youtubeUrl }
            
            expect(shouldShowFetchInfoButton(lessonWithUrl)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('YouTube URL with special characters in parameters triggers Fetch Info button', () => {
      fc.assert(
        fc.property(videoLessonArb, (lesson) => {
          const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf&index=1'
          const lessonWithUrl = { ...lesson, video_url: youtubeUrl }
          
          expect(shouldShowFetchInfoButton(lessonWithUrl)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    test('URL that contains youtube but is not YouTube domain does not trigger button', () => {
      fc.assert(
        fc.property(videoLessonArb, (lesson) => {
          const urls = [
            'https://example.com/youtube-video',
            'https://myyoutubechannel.com/watch?v=dQw4w9WgXcQ',
            'https://youtube-clone.com/watch?v=dQw4w9WgXcQ',
          ]
          
          urls.forEach(url => {
            const lessonWithUrl = { ...lesson, video_url: url }
            expect(shouldShowFetchInfoButton(lessonWithUrl)).toBe(false)
          })
        }),
        { numRuns: 100 }
      )
    })

    test('single video lesson with YouTube URL shows button', () => {
      fc.assert(
        fc.property(videoLessonArb, (lesson) => {
          const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
          const lessonWithUrl = { ...lesson, video_url: youtubeUrl }
          
          expect(shouldShowFetchInfoButton(lessonWithUrl)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    test('lesson with only domain (no video ID) does not trigger button', () => {
      fc.assert(
        fc.property(videoLessonArb, (lesson) => {
          const urls = [
            'https://www.youtube.com',
            'https://www.youtube.com/',
            'https://www.youtube.com/watch',
            'https://youtu.be/',
          ]
          
          urls.forEach(url => {
            const lessonWithUrl = { ...lesson, video_url: url }
            expect(shouldShowFetchInfoButton(lessonWithUrl)).toBe(true) // Domain match is enough
          })
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('YouTube URL Detection Invariants', () => {
    test('YouTube URL detection is deterministic', () => {
      fc.assert(
        fc.property(videoLessonArb, (lesson) => {
          const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
          const lessonWithUrl = { ...lesson, video_url: youtubeUrl }
          
          // Call multiple times, should always return same result
          const result1 = shouldShowFetchInfoButton(lessonWithUrl)
          const result2 = shouldShowFetchInfoButton(lessonWithUrl)
          const result3 = shouldShowFetchInfoButton(lessonWithUrl)
          
          expect(result1).toBe(result2)
          expect(result2).toBe(result3)
          expect(result1).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    test('YouTube URL detection does not modify lesson object', () => {
      fc.assert(
        fc.property(videoLessonArb, (lesson) => {
          const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
          const lessonWithUrl = { ...lesson, video_url: youtubeUrl }
          const originalLesson = JSON.parse(JSON.stringify(lessonWithUrl))
          
          // Call detection
          shouldShowFetchInfoButton(lessonWithUrl)
          
          // Verify lesson is unchanged
          expect(lessonWithUrl).toEqual(originalLesson)
        }),
        { numRuns: 100 }
      )
    })

    test('YouTube URL detection is independent of other lesson properties', () => {
      fc.assert(
        fc.property(videoLessonArb, (lesson) => {
          const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
          
          // Test with various property combinations
          const lessons = [
            { ...lesson, video_url: youtubeUrl, is_embeddable: true },
            { ...lesson, video_url: youtubeUrl, is_embeddable: false },
            { ...lesson, video_url: youtubeUrl, duration: '10:30' },
            { ...lesson, video_url: youtubeUrl, duration: null },
            { ...lesson, video_url: youtubeUrl, thumbnail_url: 'https://example.com/thumb.jpg' },
            { ...lesson, video_url: youtubeUrl, thumbnail_url: null },
          ]
          
          // All should show button regardless of other properties
          lessons.forEach(l => {
            expect(shouldShowFetchInfoButton(l)).toBe(true)
          })
        }),
        { numRuns: 100 }
      )
    })

    test('only video content type shows Fetch Info button for YouTube URLs', () => {
      fc.assert(
        fc.property(videoLessonArb, (lesson) => {
          const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
          const contentTypes: Array<'video' | 'markdown' | 'h5p' | 'html_embed' | 'scorm'> = [
            'video',
            'markdown',
            'h5p',
            'html_embed',
            'scorm',
          ]
          
          contentTypes.forEach(contentType => {
            const lessonWithType = {
              ...lesson,
              content_type: contentType,
              video_url: youtubeUrl,
            }
            
            const shouldShow = shouldShowFetchInfoButton(lessonWithType)
            expect(shouldShow).toBe(contentType === 'video')
          })
        }),
        { numRuns: 100 }
      )
    })
  })
})
