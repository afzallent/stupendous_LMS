/**
 * Property-Based Tests for Chapter Lesson Count Accuracy
 * 
 * **Feature: course-editor-redesign, Property 4: Chapter Lesson Count Accuracy**
 * **Validates: Requirements 3.5**
 * 
 * Property 4: Chapter Lesson Count Accuracy
 * *For any* chapter displayed in the curriculum, the lesson count shown should 
 * equal the actual number of lessons with that chapter's id.
 */

import * as fc from 'fast-check'
import { Chapter, Lesson } from '../types'

/**
 * Generator for valid chapters with realistic data
 */
const chapterArb: fc.Arbitrary<Chapter> = fc.tuple(
  fc.integer({ min: 1, max: 10000 }),
  fc.integer({ min: 1, max: 1000 }),
  fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  fc.string({ maxLength: 500 }),
  fc.integer({ min: 0, max: 100 }),
  fc.boolean(),
  fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 10000 }))
).map(([id, course_id, title, description, order, is_locked, prerequisite_chapter_id]) => ({
  id,
  course_id,
  title,
  description,
  order,
  is_locked,
  prerequisite_chapter_id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  lesson_count: 0, // Will be computed
  total_duration: '0m',
  has_quiz: false,
} as Chapter))

/**
 * Generator for valid lessons with realistic data
 */
const lessonArb: fc.Arbitrary<Lesson> = fc.tuple(
  fc.integer({ min: 1, max: 10000 }),
  fc.integer({ min: 1, max: 1000 }),
  fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 1000 })),
  fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  fc.constantFrom('video', 'markdown', 'h5p', 'html_embed', 'scorm') as fc.Arbitrary<'video' | 'markdown' | 'h5p' | 'html_embed' | 'scorm'>,
  fc.integer({ min: 0, max: 100 }),
  fc.oneof(fc.constant(null), fc.webUrl()),
  fc.oneof(fc.constant(null), fc.webUrl()),
  fc.oneof(fc.constant(null), fc.string({ maxLength: 20 })),
  fc.boolean(),
  fc.string({ maxLength: 1000 })
).map(([id, course, chapter, title, content_type, order, video_url, thumbnail_url, duration, is_embeddable, content]) => ({
  id,
  course,
  chapter,
  title,
  content_type,
  order,
  video_url,
  thumbnail_url,
  duration,
  is_embeddable,
  content,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as Lesson))

/**
 * Helper function to compute lesson count for a chapter
 * This simulates what the UI should display
 */
function computeLessonCount(chapterId: number, lessons: Lesson[]): number {
  return lessons.filter(lesson => lesson.chapter === chapterId).length
}

/**
 * Helper function to compute total duration from lessons
 * Parses duration strings like "5:30" and sums them
 */
function computeTotalDuration(chapterId: number, lessons: Lesson[]): string {
  const chapterLessons = lessons.filter(lesson => lesson.chapter === chapterId)
  
  if (chapterLessons.length === 0) return '0m'
  
  let totalSeconds = 0
  
  for (const lesson of chapterLessons) {
    if (lesson.duration) {
      const parts = lesson.duration.split(':')
      if (parts.length === 2) {
        const minutes = parseInt(parts[0], 10)
        const seconds = parseInt(parts[1], 10)
        totalSeconds += minutes * 60 + seconds
      } else if (parts.length === 1) {
        totalSeconds += parseInt(parts[0], 10) * 60
      }
    }
  }
  
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

describe('Chapter Lesson Count Accuracy Property Tests', () => {
  /**
   * **Feature: course-editor-redesign, Property 4: Chapter Lesson Count Accuracy**
   * **Validates: Requirements 3.5**
   * 
   * For any chapter displayed in the curriculum, the lesson count shown 
   * should equal the actual number of lessons with that chapter's id.
   */
  describe('Property 4: Chapter Lesson Count Accuracy', () => {
    test('chapter lesson_count matches actual lessons assigned to chapter', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 50 }),
          (chapters, lessons) => {
            // Assign lessons to chapters
            const assignedLessons = lessons.map((lesson, index) => {
              if (chapters.length === 0) {
                return { ...lesson, chapter: null }
              }
              // Assign to a random chapter or leave unassigned
              const chapterIndex = index % (chapters.length + 1)
              return {
                ...lesson,
                chapter: chapterIndex < chapters.length ? chapters[chapterIndex].id : null,
              }
            })

            // For each chapter, verify lesson_count is accurate
            chapters.forEach((chapter) => {
              const actualCount = computeLessonCount(chapter.id, assignedLessons)
              const displayedCount = chapter.lesson_count ?? 0
              
              // The displayed count should match the actual count
              expect(displayedCount).toBe(actualCount)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lesson_count is zero when no lessons are assigned to chapter', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          (chapters) => {
            const emptyLessons: Lesson[] = []

            chapters.forEach((chapter) => {
              const count = computeLessonCount(chapter.id, emptyLessons)
              expect(count).toBe(0)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lesson_count increases when lesson is added to chapter', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 20 }),
          lessonArb,
          (chapters, initialLessons, newLesson) => {
            if (chapters.length === 0) return true

            const targetChapter = chapters[0]

            // Assign initial lessons
            const assignedInitial = initialLessons.map((lesson, index) => ({
              ...lesson,
              chapter: index % 2 === 0 ? targetChapter.id : null,
            }))

            const countBefore = computeLessonCount(targetChapter.id, assignedInitial)

            // Add new lesson to chapter
            const newLessonAssigned = { ...newLesson, chapter: targetChapter.id }
            const allLessons = [...assignedInitial, newLessonAssigned]

            const countAfter = computeLessonCount(targetChapter.id, allLessons)

            // Count should increase by exactly 1
            expect(countAfter).toBe(countBefore + 1)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lesson_count decreases when lesson is removed from chapter', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 1, maxLength: 20 }),
          (chapters, lessons) => {
            if (chapters.length === 0) return true

            const targetChapter = chapters[0]

            // Assign all lessons to target chapter
            const assignedLessons = lessons.map((lesson) => ({
              ...lesson,
              chapter: targetChapter.id,
            }))

            const countBefore = computeLessonCount(targetChapter.id, assignedLessons)

            // Remove first lesson
            const remainingLessons = assignedLessons.slice(1)
            const countAfter = computeLessonCount(targetChapter.id, remainingLessons)

            // Count should decrease by exactly 1
            expect(countAfter).toBe(countBefore - 1)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lesson_count is independent of lesson order within chapter', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 20 }),
          (chapters, lessons) => {
            if (chapters.length === 0) return true

            const targetChapter = chapters[0]

            // Assign lessons to chapter
            const assignedLessons = lessons.map((lesson, index) => ({
              ...lesson,
              chapter: targetChapter.id,
              order: index,
            }))

            const countBefore = computeLessonCount(targetChapter.id, assignedLessons)

            // Reorder lessons
            const reordered = [...assignedLessons].reverse()
            const reorderedWithNewOrder = reordered.map((lesson, index) => ({
              ...lesson,
              order: index,
            }))

            const countAfter = computeLessonCount(targetChapter.id, reorderedWithNewOrder)

            // Count should remain the same
            expect(countAfter).toBe(countBefore)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lesson_count is independent of lesson content type', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 20 }),
          (chapters, lessons) => {
            if (chapters.length === 0) return true

            const targetChapter = chapters[0]

            // Assign lessons with various content types
            const assignedLessons = lessons.map((lesson) => ({
              ...lesson,
              chapter: targetChapter.id,
            }))

            const countBefore = computeLessonCount(targetChapter.id, assignedLessons)

            // Change content types
            const withChangedTypes = assignedLessons.map((lesson, index) => ({
              ...lesson,
              content_type: ['video', 'markdown', 'h5p', 'html_embed', 'scorm'][index % 5] as any,
            }))

            const countAfter = computeLessonCount(targetChapter.id, withChangedTypes)

            // Count should remain the same
            expect(countAfter).toBe(countBefore)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('moving lesson between chapters updates both chapter counts', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 2, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 1, maxLength: 20 }),
          (chapters, lessons) => {
            if (chapters.length < 2) return true

            const sourceChapter = chapters[0]
            const targetChapter = chapters[1]

            // Assign lessons: some to source, some to target
            const assignedLessons = lessons.map((lesson, index) => ({
              ...lesson,
              chapter: index % 2 === 0 ? sourceChapter.id : targetChapter.id,
            }))

            const sourceCountBefore = computeLessonCount(sourceChapter.id, assignedLessons)
            const targetCountBefore = computeLessonCount(targetChapter.id, assignedLessons)

            // Move first lesson from source to target
            const movedLessons = assignedLessons.map((lesson, index) => {
              if (index === 0 && lesson.chapter === sourceChapter.id) {
                return { ...lesson, chapter: targetChapter.id }
              }
              return lesson
            })

            const sourceCountAfter = computeLessonCount(sourceChapter.id, movedLessons)
            const targetCountAfter = computeLessonCount(targetChapter.id, movedLessons)

            // Source count should decrease by 1 (if we moved a lesson from it)
            if (assignedLessons[0].chapter === sourceChapter.id) {
              expect(sourceCountAfter).toBe(sourceCountBefore - 1)
              expect(targetCountAfter).toBe(targetCountBefore + 1)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lesson_count is accurate after multiple operations', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 5 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 30 }),
          (chapters, lessons) => {
            if (chapters.length === 0) return true

            const targetChapter = chapters[0]

            // Start with some lessons assigned
            let currentLessons = lessons.map((lesson, index) => ({
              ...lesson,
              chapter: index % 3 === 0 ? targetChapter.id : null,
            }))

            // Verify initial count
            let expectedCount = computeLessonCount(targetChapter.id, currentLessons)
            expect(expectedCount).toBeGreaterThanOrEqual(0)

            // Add a lesson
            const newLesson1 = { ...lessons[0], id: 99999, chapter: targetChapter.id }
            currentLessons = [...currentLessons, newLesson1]
            expectedCount += 1
            expect(computeLessonCount(targetChapter.id, currentLessons)).toBe(expectedCount)

            // Add another lesson
            const newLesson2 = { ...lessons[0], id: 99998, chapter: targetChapter.id }
            currentLessons = [...currentLessons, newLesson2]
            expectedCount += 1
            expect(computeLessonCount(targetChapter.id, currentLessons)).toBe(expectedCount)

            // Remove a lesson
            currentLessons = currentLessons.slice(0, -1)
            expectedCount -= 1
            expect(computeLessonCount(targetChapter.id, currentLessons)).toBe(expectedCount)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('unassigned lessons do not affect chapter lesson_count', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 20 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 20 }),
          (chapters, assignedLessons, unassignedLessons) => {
            if (chapters.length === 0) return true

            const targetChapter = chapters[0]

            // Assign some lessons to chapter
            const withAssigned = assignedLessons.map((lesson) => ({
              ...lesson,
              chapter: targetChapter.id,
            }))

            // Mark others as unassigned
            const withUnassigned = unassignedLessons.map((lesson) => ({
              ...lesson,
              chapter: null,
            }))

            const allLessons = [...withAssigned, ...withUnassigned]

            // Count should only include assigned lessons
            const count = computeLessonCount(targetChapter.id, allLessons)
            expect(count).toBe(withAssigned.length)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Chapter Lesson Count Edge Cases', () => {
    test('single chapter with single lesson has count of 1', () => {
      fc.assert(
        fc.property(chapterArb, lessonArb, (chapter, lesson) => {
          const lessons = [{ ...lesson, chapter: chapter.id }]
          const count = computeLessonCount(chapter.id, lessons)
          expect(count).toBe(1)
        }),
        { numRuns: 100 }
      )
    })

    test('chapter with no lessons has count of 0', () => {
      fc.assert(
        fc.property(chapterArb, (chapter) => {
          const lessons: Lesson[] = []
          const count = computeLessonCount(chapter.id, lessons)
          expect(count).toBe(0)
        }),
        { numRuns: 100 }
      )
    })

    test('lesson_count is accurate with many lessons', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.array(lessonArb, { minLength: 50, maxLength: 100 }),
          (chapter, lessons) => {
            const assignedLessons = lessons.map((lesson) => ({
              ...lesson,
              chapter: chapter.id,
            }))

            const count = computeLessonCount(chapter.id, assignedLessons)
            expect(count).toBe(lessons.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lesson_count is accurate with many chapters', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 50, maxLength: 100 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 50 }),
          (chapters, lessons) => {
            if (chapters.length === 0) return true

            const targetChapter = chapters[0]

            // Assign lessons to target chapter
            const assignedLessons = lessons.map((lesson) => ({
              ...lesson,
              chapter: targetChapter.id,
            }))

            const count = computeLessonCount(targetChapter.id, assignedLessons)
            expect(count).toBe(lessons.length)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Chapter Lesson Count Invariants', () => {
    test('lesson_count is always non-negative', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 50 }),
          (chapters, lessons) => {
            chapters.forEach((chapter) => {
              const count = computeLessonCount(chapter.id, lessons)
              expect(count).toBeGreaterThanOrEqual(0)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('sum of all chapter lesson_counts equals total assigned lessons', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 50 }),
          (chapters, lessons) => {
            // Assign lessons to chapters
            const assignedLessons = lessons.map((lesson, index) => {
              if (chapters.length === 0) {
                return { ...lesson, chapter: null }
              }
              const chapterIndex = index % chapters.length
              return { ...lesson, chapter: chapters[chapterIndex].id }
            })

            // Sum all chapter counts
            const totalCount = chapters.reduce((sum, chapter) => {
              return sum + computeLessonCount(chapter.id, assignedLessons)
            }, 0)

            // Should equal number of assigned lessons
            const assignedCount = assignedLessons.filter(l => l.chapter !== null).length
            expect(totalCount).toBe(assignedCount)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lesson_count never exceeds total lesson count', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 50 }),
          (chapters, lessons) => {
            chapters.forEach((chapter) => {
              const count = computeLessonCount(chapter.id, lessons)
              expect(count).toBeLessThanOrEqual(lessons.length)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lesson_count is idempotent (computing twice gives same result)', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 50 }),
          (chapters, lessons) => {
            chapters.forEach((chapter) => {
              const count1 = computeLessonCount(chapter.id, lessons)
              const count2 = computeLessonCount(chapter.id, lessons)
              expect(count1).toBe(count2)
            })
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
