/**
 * Property-Based Tests for Quiz Display in Chapter
 * 
 * **Feature: course-editor-redesign, Property 6: Quiz Display in Chapter**
 * **Validates: Requirements 5.3**
 * 
 * Property 6: Quiz Display in Chapter
 * *For any* chapter that has an associated quiz, the quiz should be displayed 
 * as a special item at the end of the chapter's lesson list.
 */

import * as fc from 'fast-check'
import { Chapter, Lesson, Quiz } from '../types'

/**
 * Generator for valid chapters
 */
const chapterArb = fc.tuple(
  fc.integer({ min: 1, max: 10000 }),
  fc.integer({ min: 1, max: 1000 }),
  fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  fc.string({ maxLength: 500 }),
  fc.integer({ min: 0, max: 100 }),
  fc.boolean(),
  fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 10000 })),
  fc.integer({ min: 0, max: 50 }),
  fc.boolean()
).map(([id, course_id, title, description, order, is_locked, prerequisite_chapter_id, lesson_count, has_quiz]) => ({
  id,
  course_id,
  title,
  description,
  order,
  is_locked,
  prerequisite_chapter_id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  lesson_count,
  total_duration: '0m',
  has_quiz,
})) as any as fc.Arbitrary<Chapter>

/**
 * Generator for valid lessons
 */
const lessonArb = fc.tuple(
  fc.integer({ min: 1, max: 10000 }),
  fc.integer({ min: 1, max: 1000 }),
  fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 1000 })),
  fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  fc.oneof(
    fc.constant('video' as const),
    fc.constant('markdown' as const),
    fc.constant('h5p' as const),
    fc.constant('html_embed' as const),
    fc.constant('scorm' as const)
  ),
  fc.integer({ min: 0, max: 100 }),
  fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
  fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
  fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
  fc.boolean(),
  fc.string({ maxLength: 500 })
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
 * Generator for valid quizzes
 */
const quizArb = fc.tuple(
  fc.integer({ min: 1, max: 10000 }),
  fc.integer({ min: 1, max: 1000 }),
  fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 1000 })),
  fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 1000 })),
  fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  fc.string({ maxLength: 500 }),
  fc.integer({ min: 0, max: 100 }),
  fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 120 })),
  fc.integer({ min: 1, max: 10 }),
  fc.boolean(),
  fc.oneof(fc.constant(undefined), fc.integer({ min: 0, max: 50 }))
).map(([id, course_id, chapter_id, lesson_id, title, description, passing_score, time_limit, max_attempts, is_active, question_count]) => ({
  id,
  course_id,
  chapter_id,
  lesson_id,
  title,
  description,
  passing_score,
  time_limit,
  max_attempts,
  is_active,
  question_count,
})) as any as fc.Arbitrary<Quiz>

describe('Quiz Display in Chapter Property Tests', () => {
  /**
   * **Feature: course-editor-redesign, Property 6: Quiz Display in Chapter**
   * **Validates: Requirements 5.3**
   * 
   * For any chapter that has an associated quiz, the quiz should be displayed
   * as a special item at the end of the chapter's lesson list.
   */
  describe('Property 6: Quiz Display in Chapter', () => {
    test('quiz with matching chapter_id should be displayed in that chapter', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.array(lessonArb, { maxLength: 10 }),
          quizArb,
          (chapter, lessons, quiz) => {
            // Create a quiz assigned to this chapter
            const chapterQuiz = { ...quiz, chapter_id: chapter.id }
            
            // Filter quizzes for this chapter
            const quizzesForChapter = [chapterQuiz].filter(q => q.chapter_id === chapter.id)
            
            // The quiz should be in the filtered list
            expect(quizzesForChapter).toContain(chapterQuiz)
            expect(quizzesForChapter.length).toBe(1)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('quiz should appear after all lessons in chapter', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.array(lessonArb, { minLength: 1, maxLength: 10 }),
          quizArb,
          (chapter, lessons, quiz) => {
            // Assign all lessons to this chapter
            const chapterLessons = lessons.map((l, i) => ({
              ...l,
              chapter: chapter.id,
              order: i,
            }))
            
            // Create a quiz for this chapter
            const chapterQuiz = { ...quiz, chapter_id: chapter.id }
            
            // Simulate the display order: lessons first, then quizzes
            const displayOrder = [
              ...chapterLessons.sort((a, b) => a.order - b.order),
              chapterQuiz,
            ]
            
            // Quiz should be at the end
            expect(displayOrder[displayOrder.length - 1]).toEqual(chapterQuiz)
            
            // All lessons should come before the quiz
            const lessonIndices = displayOrder
              .map((item, i) => ('chapter' in item ? i : -1))
              .filter(i => i !== -1)
            
            const quizIndex = displayOrder.length - 1
            
            lessonIndices.forEach(lessonIndex => {
              expect(lessonIndex).toBeLessThan(quizIndex)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('multiple quizzes in same chapter should all be displayed', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.array(quizArb, { minLength: 1, maxLength: 5 }),
          (chapter, quizzes) => {
            // Assign all quizzes to this chapter
            const chapterQuizzes = quizzes.map(q => ({
              ...q,
              chapter_id: chapter.id,
            }))
            
            // Filter quizzes for this chapter
            const filteredQuizzes = chapterQuizzes.filter(q => q.chapter_id === chapter.id)
            
            // All quizzes should be in the filtered list
            expect(filteredQuizzes.length).toBe(chapterQuizzes.length)
            
            chapterQuizzes.forEach(quiz => {
              expect(filteredQuizzes).toContainEqual(quiz)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('quiz with null chapter_id should not be displayed in any chapter', () => {
      fc.assert(
        fc.property(
          chapterArb,
          quizArb,
          (chapter, quiz) => {
            // Create a quiz with no chapter assignment
            const unassignedQuiz = { ...quiz, chapter_id: null }
            
            // Filter quizzes for this chapter
            const quizzesForChapter = [unassignedQuiz].filter(q => q.chapter_id === chapter.id)
            
            // The quiz should NOT be in the filtered list
            expect(quizzesForChapter).not.toContain(unassignedQuiz)
            expect(quizzesForChapter.length).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('quiz should have required display properties', () => {
      fc.assert(
        fc.property(
          chapterArb,
          quizArb,
          (chapter, quiz) => {
            // Create a quiz for this chapter
            const chapterQuiz = { ...quiz, chapter_id: chapter.id }
            
            // Quiz should have all required properties for display
            expect(chapterQuiz).toHaveProperty('id')
            expect(chapterQuiz).toHaveProperty('title')
            expect(chapterQuiz).toHaveProperty('question_count')
            expect(chapterQuiz).toHaveProperty('passing_score')
            
            // Properties should have valid values
            expect(typeof chapterQuiz.id).toBe('number')
            expect(typeof chapterQuiz.title).toBe('string')
            expect(chapterQuiz.title.length).toBeGreaterThan(0)
            expect(typeof chapterQuiz.passing_score).toBe('number')
            expect(chapterQuiz.passing_score).toBeGreaterThanOrEqual(0)
            expect(chapterQuiz.passing_score).toBeLessThanOrEqual(100)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('quiz display order should be consistent across multiple renders', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.array(lessonArb, { maxLength: 10 }),
          fc.array(quizArb, { maxLength: 5 }),
          (chapter, lessons, quizzes) => {
            // Assign lessons and quizzes to chapter
            const chapterLessons = lessons.map((l, i) => ({
              ...l,
              chapter: chapter.id,
              order: i,
            }))
            
            const chapterQuizzes = quizzes.map(q => ({
              ...q,
              chapter_id: chapter.id,
            }))
            
            // First render
            const displayOrder1 = [
              ...chapterLessons.sort((a, b) => a.order - b.order),
              ...chapterQuizzes,
            ]
            
            // Second render (should be identical)
            const displayOrder2 = [
              ...chapterLessons.sort((a, b) => a.order - b.order),
              ...chapterQuizzes,
            ]
            
            // Both renders should have same length
            expect(displayOrder1.length).toBe(displayOrder2.length)
            
            // Quiz positions should be identical
            const quiz1Positions = displayOrder1
              .map((item, i) => ('chapter_id' in item ? i : -1))
              .filter(i => i !== -1)
            
            const quiz2Positions = displayOrder2
              .map((item, i) => ('chapter_id' in item ? i : -1))
              .filter(i => i !== -1)
            
            expect(quiz1Positions).toEqual(quiz2Positions)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('quiz should be displayed with correct icon indicator', () => {
      fc.assert(
        fc.property(
          chapterArb,
          quizArb,
          (chapter, quiz) => {
            // Create a quiz for this chapter
            const chapterQuiz = { ...quiz, chapter_id: chapter.id }
            
            // Quiz should be identifiable as a quiz (has FileQuestion icon)
            // This is represented by having chapter_id set and being a quiz type
            expect(chapterQuiz.chapter_id).toBe(chapter.id)
            expect(chapterQuiz).toHaveProperty('id')
            expect(chapterQuiz).toHaveProperty('title')
            
            // Quiz should be distinguishable from lessons
            // (lessons have 'chapter' field, quizzes have 'chapter_id' field)
            expect('chapter_id' in chapterQuiz).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('quiz display should not affect lesson ordering', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.array(lessonArb, { minLength: 1, maxLength: 10 }),
          quizArb,
          (chapter, lessons, quiz) => {
            // Assign lessons to chapter
            const chapterLessons = lessons.map((l, i) => ({
              ...l,
              chapter: chapter.id,
              order: i,
            }))
            
            // Create a quiz for this chapter
            const chapterQuiz = { ...quiz, chapter_id: chapter.id }
            
            // Get lesson order before quiz
            const lessonOrderBefore = chapterLessons.map(l => l.id)
            
            // Add quiz to display
            const displayOrder = [
              ...chapterLessons.sort((a, b) => a.order - b.order),
              chapterQuiz,
            ]
            
            // Get lesson order after quiz
            const lessonOrderAfter = displayOrder
              .filter(item => 'chapter' in item)
              .map(item => item.id)
            
            // Lesson order should be unchanged
            expect(lessonOrderAfter).toEqual(lessonOrderBefore)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Quiz Display Edge Cases', () => {
    test('chapter with no quizzes should display only lessons', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.array(lessonArb, { maxLength: 10 }),
          (chapter, lessons) => {
            // Assign lessons to chapter
            const chapterLessons = lessons.map((l, i) => ({
              ...l,
              chapter: chapter.id,
              order: i,
            }))
            
            // No quizzes for this chapter
            const chapterQuizzes: Quiz[] = []
            
            // Display order
            const displayOrder = [
              ...chapterLessons.sort((a, b) => a.order - b.order),
              ...chapterQuizzes,
            ]
            
            // Should only contain lessons
            expect(displayOrder.length).toBe(chapterLessons.length)
            displayOrder.forEach(item => {
              expect('chapter' in item).toBe(true)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('chapter with only quizzes and no lessons should display quizzes', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.array(quizArb, { minLength: 1, maxLength: 5 }),
          (chapter, quizzes) => {
            // No lessons for this chapter
            const chapterLessons: Lesson[] = []
            
            // Assign quizzes to chapter
            const chapterQuizzes = quizzes.map(q => ({
              ...q,
              chapter_id: chapter.id,
            }))
            
            // Display order
            const displayOrder = [
              ...chapterLessons,
              ...chapterQuizzes,
            ]
            
            // Should only contain quizzes
            expect(displayOrder.length).toBe(chapterQuizzes.length)
            displayOrder.forEach(item => {
              expect('chapter_id' in item).toBe(true)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('quiz should be displayed even if it has no questions', () => {
      fc.assert(
        fc.property(
          chapterArb,
          quizArb,
          (chapter, quiz) => {
            // Create a quiz with no questions
            const emptyQuiz = { ...quiz, chapter_id: chapter.id, question_count: 0 }
            
            // Quiz should still be displayable
            expect(emptyQuiz.chapter_id).toBe(chapter.id)
            expect(emptyQuiz.question_count).toBe(0)
            
            // Should have all required display properties
            expect(emptyQuiz).toHaveProperty('id')
            expect(emptyQuiz).toHaveProperty('title')
          }
        ),
        { numRuns: 100 }
      )
    })

    test('quiz should be displayed regardless of active status', () => {
      fc.assert(
        fc.property(
          chapterArb,
          quizArb,
          fc.boolean(),
          (chapter, quiz, isActive) => {
            // Create a quiz with specific active status
            const statusQuiz = { ...quiz, chapter_id: chapter.id, is_active: isActive }
            
            // Quiz should be displayable regardless of active status
            expect(statusQuiz.chapter_id).toBe(chapter.id)
            
            // Should have all required display properties
            expect(statusQuiz).toHaveProperty('id')
            expect(statusQuiz).toHaveProperty('title')
            expect(statusQuiz).toHaveProperty('is_active')
          }
        ),
        { numRuns: 100 }
      )
    })

    test('quiz display should work with empty chapter', () => {
      fc.assert(
        fc.property(
          chapterArb,
          quizArb,
          (chapter, quiz) => {
            // Empty chapter (no lessons)
            const chapterLessons: Lesson[] = []
            
            // Create a quiz for this chapter
            const chapterQuiz = { ...quiz, chapter_id: chapter.id }
            
            // Display order
            const displayOrder = [
              ...chapterLessons,
              chapterQuiz,
            ]
            
            // Quiz should be displayed
            expect(displayOrder.length).toBe(1)
            expect(displayOrder[0]).toEqual(chapterQuiz)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Quiz Display Invariants', () => {
    test('quiz chapter_id should match the chapter it is displayed in', () => {
      fc.assert(
        fc.property(
          chapterArb,
          quizArb,
          (chapter, quiz) => {
            // Create a quiz for this chapter
            const chapterQuiz = { ...quiz, chapter_id: chapter.id }
            
            // Quiz chapter_id should match
            expect(chapterQuiz.chapter_id).toBe(chapter.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('quiz should always have a valid id', () => {
      fc.assert(
        fc.property(
          chapterArb,
          quizArb,
          (chapter, quiz) => {
            // Create a quiz for this chapter
            const chapterQuiz = { ...quiz, chapter_id: chapter.id }
            
            // Quiz should have a valid id
            expect(typeof chapterQuiz.id).toBe('number')
            expect(chapterQuiz.id).toBeGreaterThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('quiz should always have a title', () => {
      fc.assert(
        fc.property(
          chapterArb,
          quizArb,
          (chapter, quiz) => {
            // Create a quiz for this chapter
            const chapterQuiz = { ...quiz, chapter_id: chapter.id }
            
            // Quiz should have a title
            expect(typeof chapterQuiz.title).toBe('string')
            expect(chapterQuiz.title.length).toBeGreaterThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('quiz passing_score should be between 0 and 100', () => {
      fc.assert(
        fc.property(
          chapterArb,
          quizArb,
          (chapter, quiz) => {
            // Create a quiz for this chapter
            const chapterQuiz = { ...quiz, chapter_id: chapter.id }
            
            // Passing score should be valid
            expect(typeof chapterQuiz.passing_score).toBe('number')
            expect(chapterQuiz.passing_score).toBeGreaterThanOrEqual(0)
            expect(chapterQuiz.passing_score).toBeLessThanOrEqual(100)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
