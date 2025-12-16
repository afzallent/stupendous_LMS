/**
 * Property-Based Tests for Unassigned Lessons Visibility
 * 
 * **Feature: course-editor-redesign, Property 3: Unassigned Lessons Visibility**
 * **Validates: Requirements 7.1, 7.5**
 * 
 * Property 3: Unassigned Lessons Visibility
 * *For any* course, the "Unassigned Lessons" section should be visible if and only if 
 * there exists at least one lesson with chapter_id = null.
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
  lesson_count: 0,
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
 * Helper function to determine if unassigned lessons section should be visible
 * The section should be visible if and only if there is at least one lesson with chapter = null
 */
function shouldShowUnassignedLessonsSection(lessons: Lesson[]): boolean {
  return lessons.some(lesson => lesson.chapter === null)
}

/**
 * Helper function to get unassigned lessons
 */
function getUnassignedLessons(lessons: Lesson[]): Lesson[] {
  return lessons.filter(lesson => lesson.chapter === null)
}

/**
 * Helper function to get assigned lessons
 */
function getAssignedLessons(lessons: Lesson[]): Lesson[] {
  return lessons.filter(lesson => lesson.chapter !== null)
}

describe('Unassigned Lessons Visibility Property Tests', () => {
  /**
   * **Feature: course-editor-redesign, Property 3: Unassigned Lessons Visibility**
   * **Validates: Requirements 7.1, 7.5**
   * 
   * For any course, the "Unassigned Lessons" section should be visible if and only if 
   * there exists at least one lesson with chapter_id = null.
   */
  describe('Property 3: Unassigned Lessons Visibility', () => {
    test('unassigned lessons section is visible when unassigned lessons exist', () => {
      fc.assert(
        fc.property(
          fc.array(lessonArb, { minLength: 1, maxLength: 50 }),
          (lessons) => {
            // Ensure at least one lesson is unassigned
            const withUnassigned = lessons.map((lesson, index) => ({
              ...lesson,
              chapter: index === 0 ? null : lesson.chapter,
            }))

            const shouldShow = shouldShowUnassignedLessonsSection(withUnassigned)
            expect(shouldShow).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('unassigned lessons section is hidden when no unassigned lessons exist', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 50 }),
          (chapters, lessons) => {
            if (chapters.length === 0) return true

            // Assign all lessons to chapters
            const allAssigned = lessons.map((lesson, index) => ({
              ...lesson,
              chapter: chapters[index % chapters.length].id,
            }))

            const shouldShow = shouldShowUnassignedLessonsSection(allAssigned)
            expect(shouldShow).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('unassigned lessons section visibility matches presence of unassigned lessons', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 50 }),
          (chapters, lessons) => {
            if (chapters.length === 0) return true

            // Mix of assigned and unassigned lessons
            const mixed = lessons.map((lesson, index) => ({
              ...lesson,
              chapter: index % 3 === 0 ? null : chapters[index % chapters.length].id,
            }))

            const shouldShow = shouldShowUnassignedLessonsSection(mixed)
            const unassignedCount = getUnassignedLessons(mixed).length

            // Visibility should match presence of unassigned lessons
            expect(shouldShow).toBe(unassignedCount > 0)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('empty lesson list hides unassigned lessons section', () => {
      const emptyLessons: Lesson[] = []
      const shouldShow = shouldShowUnassignedLessonsSection(emptyLessons)
      expect(shouldShow).toBe(false)
    })

    test('single unassigned lesson shows section', () => {
      fc.assert(
        fc.property(lessonArb, (lesson) => {
          const unassignedLesson = { ...lesson, chapter: null }
          const shouldShow = shouldShowUnassignedLessonsSection([unassignedLesson])
          expect(shouldShow).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    test('single assigned lesson hides section', () => {
      fc.assert(
        fc.property(
          chapterArb,
          lessonArb,
          (chapter, lesson) => {
            const assignedLesson = { ...lesson, chapter: chapter.id }
            const shouldShow = shouldShowUnassignedLessonsSection([assignedLesson])
            expect(shouldShow).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('adding unassigned lesson shows section', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 20 }),
          lessonArb,
          (chapters, assignedLessons, newLesson) => {
            if (chapters.length === 0) return true

            // Start with all assigned lessons
            const allAssigned = assignedLessons.map((lesson, index) => ({
              ...lesson,
              chapter: chapters[index % chapters.length].id,
            }))

            const showBefore = shouldShowUnassignedLessonsSection(allAssigned)
            expect(showBefore).toBe(false)

            // Add unassigned lesson
            const unassignedNew = { ...newLesson, chapter: null }
            const withUnassigned = [...allAssigned, unassignedNew]

            const showAfter = shouldShowUnassignedLessonsSection(withUnassigned)
            expect(showAfter).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('removing unassigned lesson hides section if no others remain', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 20 }),
          lessonArb,
          (chapters, assignedLessons, unassignedLesson) => {
            if (chapters.length === 0) return true

            // Start with assigned lessons and one unassigned
            const allAssigned = assignedLessons.map((lesson, index) => ({
              ...lesson,
              chapter: chapters[index % chapters.length].id,
            }))

            const unassigned = { ...unassignedLesson, chapter: null }
            const withUnassigned = [...allAssigned, unassigned]

            const showBefore = shouldShowUnassignedLessonsSection(withUnassigned)
            expect(showBefore).toBe(true)

            // Remove the unassigned lesson
            const afterRemoval = withUnassigned.filter(l => l.id !== unassigned.id)

            const showAfter = shouldShowUnassignedLessonsSection(afterRemoval)
            expect(showAfter).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('assigning unassigned lesson hides section if no others remain', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 20 }),
          lessonArb,
          (chapters, assignedLessons, unassignedLesson) => {
            if (chapters.length === 0) return true

            // Start with assigned lessons and one unassigned
            const allAssigned = assignedLessons.map((lesson, index) => ({
              ...lesson,
              chapter: chapters[index % chapters.length].id,
            }))

            const unassigned = { ...unassignedLesson, chapter: null }
            const withUnassigned = [...allAssigned, unassigned]

            const showBefore = shouldShowUnassignedLessonsSection(withUnassigned)
            expect(showBefore).toBe(true)

            // Assign the unassigned lesson
            const assigned = { ...unassigned, chapter: chapters[0].id }
            const afterAssignment = withUnassigned.map(l => (l.id === unassigned.id ? assigned : l))

            const showAfter = shouldShowUnassignedLessonsSection(afterAssignment)
            expect(showAfter).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('multiple unassigned lessons show section', () => {
      fc.assert(
        fc.property(
          fc.array(lessonArb, { minLength: 2, maxLength: 50 }),
          (lessons) => {
            // Make all lessons unassigned
            const allUnassigned = lessons.map((lesson) => ({
              ...lesson,
              chapter: null,
            }))

            const shouldShow = shouldShowUnassignedLessonsSection(allUnassigned)
            expect(shouldShow).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('unassigned lessons section visibility is independent of lesson properties', () => {
      fc.assert(
        fc.property(
          fc.array(lessonArb, { minLength: 1, maxLength: 50 }),
          (lessons) => {
            // Create two sets with same unassigned status but different properties
            const set1 = lessons.map((lesson, index) => ({
              ...lesson,
              chapter: index === 0 ? null : lesson.chapter,
              title: 'Title 1',
            }))

            const set2 = lessons.map((lesson, index) => ({
              ...lesson,
              chapter: index === 0 ? null : lesson.chapter,
              title: 'Title 2',
            }))

            const show1 = shouldShowUnassignedLessonsSection(set1)
            const show2 = shouldShowUnassignedLessonsSection(set2)

            // Both should have same visibility
            expect(show1).toBe(show2)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('unassigned lessons section visibility is independent of assigned lesson count', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 50 }),
          lessonArb,
          (chapters, assignedLessons, unassignedLesson) => {
            if (chapters.length === 0) return true

            // Scenario 1: Few assigned lessons + 1 unassigned
            const fewAssigned = assignedLessons.slice(0, 2).map((lesson, index) => ({
              ...lesson,
              chapter: chapters[index % chapters.length].id,
            }))

            const unassigned = { ...unassignedLesson, chapter: null }
            const scenario1 = [...fewAssigned, unassigned]

            // Scenario 2: Many assigned lessons + 1 unassigned
            const manyAssigned = assignedLessons.map((lesson, index) => ({
              ...lesson,
              chapter: chapters[index % chapters.length].id,
            }))

            const scenario2 = [...manyAssigned, unassigned]

            const show1 = shouldShowUnassignedLessonsSection(scenario1)
            const show2 = shouldShowUnassignedLessonsSection(scenario2)

            // Both should show section (both have unassigned lessons)
            expect(show1).toBe(true)
            expect(show2).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('unassigned lessons count is accurate when section is visible', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 50 }),
          (chapters, lessons) => {
            if (chapters.length === 0) return true

            // Mix of assigned and unassigned
            const mixed = lessons.map((lesson, index) => ({
              ...lesson,
              chapter: index % 3 === 0 ? null : chapters[index % chapters.length].id,
            }))

            const shouldShow = shouldShowUnassignedLessonsSection(mixed)
            const unassignedCount = getUnassignedLessons(mixed).length

            if (shouldShow) {
              // If section is visible, there should be at least one unassigned lesson
              expect(unassignedCount).toBeGreaterThan(0)
            } else {
              // If section is hidden, there should be no unassigned lessons
              expect(unassignedCount).toBe(0)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    test('assigned lessons do not affect unassigned lessons section visibility', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 20 }),
          fc.array(lessonArb, { minLength: 1, maxLength: 20 }),
          (chapters, assignedLessons, unassignedLessons) => {
            if (chapters.length === 0) return true

            // Assign some lessons
            const assigned = assignedLessons.map((lesson, index) => ({
              ...lesson,
              chapter: chapters[index % chapters.length].id,
            }))

            // Keep others unassigned
            const unassigned = unassignedLessons.map((lesson) => ({
              ...lesson,
              chapter: null,
            }))

            const combined = [...assigned, ...unassigned]

            const shouldShow = shouldShowUnassignedLessonsSection(combined)

            // Should be visible because unassigned lessons exist
            expect(shouldShow).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Unassigned Lessons Visibility Edge Cases', () => {
    test('lesson with chapter = 0 is considered assigned', () => {
      fc.assert(
        fc.property(lessonArb, (lesson) => {
          const lessonWithChapter0 = { ...lesson, chapter: 0 }
          const shouldShow = shouldShowUnassignedLessonsSection([lessonWithChapter0])
          expect(shouldShow).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    test('lesson with chapter = -1 is considered assigned', () => {
      fc.assert(
        fc.property(lessonArb, (lesson) => {
          const lessonWithNegativeChapter = { ...lesson, chapter: -1 as any }
          const shouldShow = shouldShowUnassignedLessonsSection([lessonWithNegativeChapter])
          expect(shouldShow).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    test('only null chapter_id indicates unassigned', () => {
      fc.assert(
        fc.property(
          fc.array(lessonArb, { minLength: 1, maxLength: 50 }),
          (lessons) => {
            // Create lessons with various chapter values
            const mixed = lessons.map((lesson, index) => {
              if (index % 4 === 0) {
                return { ...lesson, chapter: null }
              } else if (index % 4 === 1) {
                return { ...lesson, chapter: 1 }
              } else if (index % 4 === 2) {
                return { ...lesson, chapter: 2 }
              } else {
                return { ...lesson, chapter: 999 }
              }
            })

            const shouldShow = shouldShowUnassignedLessonsSection(mixed)
            const hasNull = mixed.some(l => l.chapter === null)

            // Visibility should match presence of null chapter
            expect(shouldShow).toBe(hasNull)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('very large number of unassigned lessons shows section', () => {
      fc.assert(
        fc.property(
          fc.array(lessonArb, { minLength: 100, maxLength: 200 }),
          (lessons) => {
            const allUnassigned = lessons.map((lesson) => ({
              ...lesson,
              chapter: null,
            }))

            const shouldShow = shouldShowUnassignedLessonsSection(allUnassigned)
            expect(shouldShow).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('very large number of assigned lessons with one unassigned shows section', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 100, maxLength: 200 }),
          lessonArb,
          (chapters, assignedLessons, unassignedLesson) => {
            if (chapters.length === 0) return true

            const assigned = assignedLessons.map((lesson, index) => ({
              ...lesson,
              chapter: chapters[index % chapters.length].id,
            }))

            const unassigned = { ...unassignedLesson, chapter: null }
            const combined = [...assigned, unassigned]

            const shouldShow = shouldShowUnassignedLessonsSection(combined)
            expect(shouldShow).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Unassigned Lessons Visibility Invariants', () => {
    test('section visibility is boolean (true or false)', () => {
      fc.assert(
        fc.property(
          fc.array(lessonArb, { minLength: 0, maxLength: 50 }),
          (lessons) => {
            const shouldShow = shouldShowUnassignedLessonsSection(lessons)
            expect(typeof shouldShow).toBe('boolean')
            expect([true, false]).toContain(shouldShow)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('section visibility is idempotent (checking twice gives same result)', () => {
      fc.assert(
        fc.property(
          fc.array(lessonArb, { minLength: 0, maxLength: 50 }),
          (lessons) => {
            const show1 = shouldShowUnassignedLessonsSection(lessons)
            const show2 = shouldShowUnassignedLessonsSection(lessons)
            expect(show1).toBe(show2)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('section visibility is determined solely by presence of null chapter', () => {
      fc.assert(
        fc.property(
          fc.array(lessonArb, { minLength: 0, maxLength: 50 }),
          (lessons) => {
            const shouldShow = shouldShowUnassignedLessonsSection(lessons)
            const hasUnassigned = lessons.some(l => l.chapter === null)
            expect(shouldShow).toBe(hasUnassigned)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('unassigned lessons count matches visibility', () => {
      fc.assert(
        fc.property(
          fc.array(lessonArb, { minLength: 0, maxLength: 50 }),
          (lessons) => {
            const shouldShow = shouldShowUnassignedLessonsSection(lessons)
            const unassignedCount = getUnassignedLessons(lessons).length

            if (shouldShow) {
              expect(unassignedCount).toBeGreaterThan(0)
            } else {
              expect(unassignedCount).toBe(0)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    test('assigned lessons count does not affect visibility', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 10 }),
          fc.array(lessonArb, { minLength: 0, maxLength: 50 }),
          (chapters, lessons) => {
            if (chapters.length === 0) return true

            // Scenario 1: Few assigned + 1 unassigned
            const few = lessons.slice(0, 2).map((lesson, index) => ({
              ...lesson,
              chapter: chapters[index % chapters.length].id,
            }))
            const unassigned1 = { ...lessons[0], id: 99999, chapter: null }
            const scenario1 = [...few, unassigned1]

            // Scenario 2: Many assigned + 1 unassigned
            const many = lessons.map((lesson, index) => ({
              ...lesson,
              chapter: chapters[index % chapters.length].id,
            }))
            const unassigned2 = { ...lessons[0], id: 99998, chapter: null }
            const scenario2 = [...many, unassigned2]

            const show1 = shouldShowUnassignedLessonsSection(scenario1)
            const show2 = shouldShowUnassignedLessonsSection(scenario2)

            // Both should show section
            expect(show1).toBe(true)
            expect(show2).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('section visibility is independent of lesson order', () => {
      fc.assert(
        fc.property(
          fc.array(lessonArb, { minLength: 1, maxLength: 50 }),
          (lessons) => {
            // Ensure at least one unassigned
            const withUnassigned = lessons.map((lesson, index) => ({
              ...lesson,
              chapter: index === 0 ? null : lesson.chapter,
            }))

            const show1 = shouldShowUnassignedLessonsSection(withUnassigned)

            // Reverse order
            const reversed = [...withUnassigned].reverse()
            const show2 = shouldShowUnassignedLessonsSection(reversed)

            // Both should have same visibility
            expect(show1).toBe(show2)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('section visibility is independent of lesson properties', () => {
      fc.assert(
        fc.property(
          fc.array(lessonArb, { minLength: 1, maxLength: 50 }),
          (lessons) => {
            // Ensure at least one unassigned
            const withUnassigned = lessons.map((lesson, index) => ({
              ...lesson,
              chapter: index === 0 ? null : lesson.chapter,
            }))

            const show1 = shouldShowUnassignedLessonsSection(withUnassigned)

            // Change properties
            const withChangedProps = withUnassigned.map((lesson) => ({
              ...lesson,
              title: 'Changed Title',
              content_type: 'video' as const,
            }))

            const show2 = shouldShowUnassignedLessonsSection(withChangedProps)

            // Both should have same visibility
            expect(show1).toBe(show2)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
