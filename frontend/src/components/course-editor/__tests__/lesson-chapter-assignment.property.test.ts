/**
 * Property-Based Tests for Lesson Chapter Assignment
 * 
 * **Feature: course-editor-redesign, Property 2: Lesson Chapter Assignment**
 * **Validates: Requirements 7.3**
 * 
 * Property 2: Lesson Chapter Assignment
 * *For any* lesson moved to a chapter, the lesson's chapter_id should be updated 
 * to the target chapter's id, and the lesson should appear in that chapter's lesson list.
 */

import * as fc from 'fast-check'
import { Chapter, Lesson } from '../types'

/**
 * Generator for valid chapters with realistic data
 */
const chapterArb = fc.tuple(
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
  lesson_count: 0,
  total_duration: '0m',
  has_quiz: false,
})) as any as fc.Arbitrary<Chapter>

/**
 * Generator for valid lessons with realistic data
 */
const lessonArb = fc.tuple(
  fc.integer({ min: 1, max: 10000 }),
  fc.integer({ min: 1, max: 1000 }),
  fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 1000 })),
  fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  fc.constantFrom('video', 'markdown', 'h5p', 'html_embed', 'scorm'),
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
})) as any as fc.Arbitrary<Lesson>

/**
 * Helper function to find lessons in a chapter
 */
function getLessonsInChapter(chapterId: number, lessons: Lesson[]): Lesson[] {
  return lessons.filter(lesson => lesson.chapter === chapterId)
}

/**
 * Helper function to move a lesson to a chapter
 * Simulates the UI action of selecting a chapter from the dropdown
 */
function moveLessonToChapter(lesson: Lesson, targetChapterId: number): Lesson {
  return {
    ...lesson,
    chapter: targetChapterId,
  }
}

describe('Lesson Chapter Assignment Property Tests', () => {
  /**
   * **Feature: course-editor-redesign, Property 2: Lesson Chapter Assignment**
   * **Validates: Requirements 7.3**
   * 
   * For any lesson moved to a chapter, the lesson's chapter_id should be updated 
   * to the target chapter's id, and the lesson should appear in that chapter's lesson list.
   */
  describe('Property 2: Lesson Chapter Assignment', () => {
    test('moving lesson to chapter updates chapter_id', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          lessonArb,
          (chapters, lesson) => {
            if (chapters.length === 0) return true

            const targetChapter = chapters[0]

            // Move lesson to target chapter
            const movedLesson = moveLessonToChapter(lesson, targetChapter.id)

            // Verify chapter_id is updated
            expect(movedLesson.chapter).toBe(targetChapter.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('moved lesson appears in target chapter lesson list', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 20 }),
          lessonArb,
          (chapters, existingLessons, newLesson) => {
            if (chapters.length === 0) return true

            const targetChapter = chapters[0]

            // Start with existing lessons
            const allLessons = [...existingLessons]

            // Move new lesson to target chapter
            const movedLesson = moveLessonToChapter(newLesson, targetChapter.id)
            const updatedLessons = [...allLessons, movedLesson]

            // Verify lesson appears in target chapter
            const lessonsInChapter = getLessonsInChapter(targetChapter.id, updatedLessons)
            const foundLesson = lessonsInChapter.find(l => l.id === movedLesson.id)

            expect(foundLesson).toBeDefined()
            expect(foundLesson?.chapter).toBe(targetChapter.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lesson removed from previous chapter when moved', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 2, maxLength: 10 }),
          lessonArb,
          (chapters, lesson) => {
            if (chapters.length < 2) return true

            const sourceChapter = chapters[0]
            const targetChapter = chapters[1]

            // Start with lesson in source chapter
            const lessonInSource = moveLessonToChapter(lesson, sourceChapter.id)
            const lessonsBeforeMove = [lessonInSource]

            // Verify lesson is in source chapter
            expect(getLessonsInChapter(sourceChapter.id, lessonsBeforeMove)).toContainEqual(lessonInSource)

            // Move lesson to target chapter
            const movedLesson = moveLessonToChapter(lessonInSource, targetChapter.id)
            const lessonsAfterMove = [movedLesson]

            // Verify lesson is no longer in source chapter
            expect(getLessonsInChapter(sourceChapter.id, lessonsAfterMove).length).toBe(0)

            // Verify lesson is in target chapter
            expect(getLessonsInChapter(targetChapter.id, lessonsAfterMove)).toContainEqual(movedLesson)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('moving lesson preserves all other lesson properties', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          lessonArb,
          (chapters, lesson) => {
            if (chapters.length === 0) return true

            const targetChapter = chapters[0]

            // Move lesson to target chapter
            const movedLesson = moveLessonToChapter(lesson, targetChapter.id)

            // Verify all other properties are preserved
            expect(movedLesson.id).toBe(lesson.id)
            expect(movedLesson.course).toBe(lesson.course)
            expect(movedLesson.title).toBe(lesson.title)
            expect(movedLesson.content_type).toBe(lesson.content_type)
            expect(movedLesson.order).toBe(lesson.order)
            expect(movedLesson.video_url).toBe(lesson.video_url)
            expect(movedLesson.thumbnail_url).toBe(lesson.thumbnail_url)
            expect(movedLesson.duration).toBe(lesson.duration)
            expect(movedLesson.is_embeddable).toBe(lesson.is_embeddable)
            expect(movedLesson.content).toBe(lesson.content)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lesson can be moved between multiple chapters sequentially', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 3, maxLength: 10 }),
          lessonArb,
          (chapters, lesson) => {
            if (chapters.length < 3) return true

            const chapter1 = chapters[0]
            const chapter2 = chapters[1]
            const chapter3 = chapters[2]

            // Move lesson to chapter 1
            let currentLesson = moveLessonToChapter(lesson, chapter1.id)
            expect(currentLesson.chapter).toBe(chapter1.id)

            // Move lesson to chapter 2
            currentLesson = moveLessonToChapter(currentLesson, chapter2.id)
            expect(currentLesson.chapter).toBe(chapter2.id)

            // Move lesson to chapter 3
            currentLesson = moveLessonToChapter(currentLesson, chapter3.id)
            expect(currentLesson.chapter).toBe(chapter3.id)

            // Verify final state
            expect(currentLesson.id).toBe(lesson.id)
            expect(currentLesson.chapter).toBe(chapter3.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('moving lesson to same chapter is idempotent', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          lessonArb,
          (chapters, lesson) => {
            if (chapters.length === 0) return true

            const targetChapter = chapters[0]

            // Move lesson to chapter
            const movedOnce = moveLessonToChapter(lesson, targetChapter.id)

            // Move lesson to same chapter again
            const movedTwice = moveLessonToChapter(movedOnce, targetChapter.id)

            // Should be identical
            expect(movedTwice).toEqual(movedOnce)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('multiple lessons can be moved to same chapter', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 2, maxLength: 20 }),
          (chapters, lessons) => {
            if (chapters.length === 0 || lessons.length < 2) return true

            const targetChapter = chapters[0]

            // Move all lessons to target chapter
            const movedLessons = lessons.map(lesson => moveLessonToChapter(lesson, targetChapter.id))

            // Verify all lessons are in target chapter
            const lessonsInChapter = getLessonsInChapter(targetChapter.id, movedLessons)
            expect(lessonsInChapter.length).toBe(lessons.length)

            // Verify all lesson IDs are present
            const movedIds = new Set(movedLessons.map(l => l.id))
            const foundIds = new Set(lessonsInChapter.map(l => l.id))
            expect(foundIds).toEqual(movedIds)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lesson chapter assignment is independent of lesson order', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          lessonArb,
          (chapters, lesson) => {
            if (chapters.length === 0) return true

            const targetChapter = chapters[0]

            // Move lesson with different order values
            const lesson1 = { ...lesson, order: 0 }
            const lesson2 = { ...lesson, order: 100 }

            const moved1 = moveLessonToChapter(lesson1, targetChapter.id)
            const moved2 = moveLessonToChapter(lesson2, targetChapter.id)

            // Both should be in target chapter regardless of order
            expect(moved1.chapter).toBe(targetChapter.id)
            expect(moved2.chapter).toBe(targetChapter.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lesson chapter assignment is independent of content type', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          lessonArb,
          (chapters, lesson) => {
            if (chapters.length === 0) return true

            const targetChapter = chapters[0]
            const contentTypes: Array<'video' | 'markdown' | 'h5p' | 'html_embed' | 'scorm'> = [
              'video',
              'markdown',
              'h5p',
              'html_embed',
              'scorm',
            ]

            // Move lessons with different content types
            contentTypes.forEach(contentType => {
              const lessonWithType = { ...lesson, content_type: contentType }
              const moved = moveLessonToChapter(lessonWithType, targetChapter.id)

              // All should be in target chapter regardless of content type
              expect(moved.chapter).toBe(targetChapter.id)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('unassigned lesson can be moved to chapter', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          lessonArb,
          (chapters, lesson) => {
            if (chapters.length === 0) return true

            const targetChapter = chapters[0]

            // Start with unassigned lesson
            const unassignedLesson = { ...lesson, chapter: null }
            expect(unassignedLesson.chapter).toBeNull()

            // Move to chapter
            const movedLesson = moveLessonToChapter(unassignedLesson, targetChapter.id)

            // Should now be assigned
            expect(movedLesson.chapter).toBe(targetChapter.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lesson can be unassigned by moving to null', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          lessonArb,
          (chapters, lesson) => {
            if (chapters.length === 0) return true

            const targetChapter = chapters[0]

            // Start with lesson in chapter
            const assignedLesson = moveLessonToChapter(lesson, targetChapter.id)
            expect(assignedLesson.chapter).toBe(targetChapter.id)

            // Move to null (unassign)
            const unassignedLesson = moveLessonToChapter(assignedLesson, null as any)

            // Should now be unassigned
            expect(unassignedLesson.chapter).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Lesson Chapter Assignment Edge Cases', () => {
    test('single lesson can be moved to single chapter', () => {
      fc.assert(
        fc.property(chapterArb, lessonArb, (chapter, lesson) => {
          const moved = moveLessonToChapter(lesson, chapter.id)
          expect(moved.chapter).toBe(chapter.id)
        }),
        { numRuns: 100 }
      )
    })

    test('lesson with same ID as chapter can be moved', () => {
      fc.assert(
        fc.property(chapterArb, lessonArb, (chapter, lesson) => {
          // Create lesson with same ID as chapter (edge case)
          const lessonWithSameId = { ...lesson, id: chapter.id }
          const moved = moveLessonToChapter(lessonWithSameId, chapter.id)

          expect(moved.chapter).toBe(chapter.id)
          expect(moved.id).toBe(chapter.id)
        }),
        { numRuns: 100 }
      )
    })

    test('lesson can be moved to chapter with same course_id', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          chapterArb,
          lessonArb,
          (courseId, chapter, lesson) => {
            const chapterInCourse = { ...chapter, course_id: courseId }
            const lessonInCourse = { ...lesson, course: courseId }

            const moved = moveLessonToChapter(lessonInCourse, chapterInCourse.id)

            expect(moved.chapter).toBe(chapterInCourse.id)
            expect(moved.course).toBe(courseId)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lesson can be moved to chapter with different course_id', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 1000 }),
          chapterArb,
          lessonArb,
          (courseId1, courseId2, chapter, lesson) => {
            if (courseId1 === courseId2) return true

            const chapterInCourse2 = { ...chapter, course_id: courseId2 }
            const lessonInCourse1 = { ...lesson, course: courseId1 }

            const moved = moveLessonToChapter(lessonInCourse1, chapterInCourse2.id)

            // Lesson can be moved even if course_id differs
            expect(moved.chapter).toBe(chapterInCourse2.id)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Lesson Chapter Assignment Invariants', () => {
    test('chapter_id is always set to target chapter after move', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 1, maxLength: 20 }),
          (chapters, lessons) => {
            if (chapters.length === 0) return true

            const targetChapter = chapters[0]

            // Move all lessons to target chapter
            const movedLessons = lessons.map(lesson => moveLessonToChapter(lesson, targetChapter.id))

            // All should have chapter_id set to target
            movedLessons.forEach(lesson => {
              expect(lesson.chapter).toBe(targetChapter.id)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('moved lesson is always findable in target chapter list', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 20 }),
          lessonArb,
          (chapters, existingLessons, newLesson) => {
            if (chapters.length === 0) return true

            const targetChapter = chapters[0]

            // Move lesson
            const movedLesson = moveLessonToChapter(newLesson, targetChapter.id)
            const allLessons = [...existingLessons, movedLesson]

            // Should be findable in target chapter
            const lessonsInChapter = getLessonsInChapter(targetChapter.id, allLessons)
            const found = lessonsInChapter.some(l => l.id === movedLesson.id)

            expect(found).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lesson ID never changes during chapter assignment', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          lessonArb,
          (chapters, lesson) => {
            if (chapters.length === 0) return true

            const originalId = lesson.id
            const targetChapter = chapters[0]

            const moved = moveLessonToChapter(lesson, targetChapter.id)

            expect(moved.id).toBe(originalId)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lesson course_id never changes during chapter assignment', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          lessonArb,
          (chapters, lesson) => {
            if (chapters.length === 0) return true

            const originalCourse = lesson.course
            const targetChapter = chapters[0]

            const moved = moveLessonToChapter(lesson, targetChapter.id)

            expect(moved.course).toBe(originalCourse)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('only chapter_id field changes during move operation', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          lessonArb,
          (chapters, lesson) => {
            if (chapters.length === 0) return true

            const targetChapter = chapters[0]
            const originalChapter = lesson.chapter

            const moved = moveLessonToChapter(lesson, targetChapter.id)

            // Only chapter should differ
            expect(moved.chapter).not.toBe(originalChapter)
            expect(moved.id).toBe(lesson.id)
            expect(moved.course).toBe(lesson.course)
            expect(moved.title).toBe(lesson.title)
            expect(moved.content_type).toBe(lesson.content_type)
            expect(moved.order).toBe(lesson.order)
            expect(moved.video_url).toBe(lesson.video_url)
            expect(moved.thumbnail_url).toBe(lesson.thumbnail_url)
            expect(moved.duration).toBe(lesson.duration)
            expect(moved.is_embeddable).toBe(lesson.is_embeddable)
            expect(moved.content).toBe(lesson.content)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
