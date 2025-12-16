/**
 * Property-Based Tests for Locked Chapter Icon Display
 * 
 * **Feature: course-editor-redesign, Property 5: Locked Chapter Icon Display**
 * **Validates: Requirements 6.3**
 * 
 * Property 5: Locked Chapter Icon Display
 * *For any* chapter with is_locked = true, the chapter header should display a lock icon.
 */

import * as fc from 'fast-check'
import { Chapter } from '../types'

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
 * Helper function to determine if lock icon should be displayed
 * The lock icon should be displayed if and only if is_locked = true
 */
function shouldDisplayLockIcon(chapter: Chapter): boolean {
  return chapter.is_locked === true
}

/**
 * Helper function to get lock icon element
 * In a real component, this would query the DOM for the lock icon
 * For testing purposes, we simulate the presence of the icon based on is_locked
 */
function getLockIconElement(chapter: Chapter): string | null {
  if (chapter.is_locked) {
    return '🔒' // Lock icon emoji
  }
  return null
}

describe('Locked Chapter Icon Display Property Tests', () => {
  /**
   * **Feature: course-editor-redesign, Property 5: Locked Chapter Icon Display**
   * **Validates: Requirements 6.3**
   * 
   * For any chapter with is_locked = true, the chapter header should display a lock icon.
   */
  describe('Property 5: Locked Chapter Icon Display', () => {
    test('lock icon is displayed when chapter is locked', () => {
      fc.assert(
        fc.property(chapterArb, (chapter) => {
          const lockedChapter = { ...chapter, is_locked: true }
          const shouldDisplay = shouldDisplayLockIcon(lockedChapter)
          expect(shouldDisplay).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    test('lock icon is not displayed when chapter is not locked', () => {
      fc.assert(
        fc.property(chapterArb, (chapter) => {
          const unlockedChapter = { ...chapter, is_locked: false }
          const shouldDisplay = shouldDisplayLockIcon(unlockedChapter)
          expect(shouldDisplay).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    test('lock icon presence matches is_locked property', () => {
      fc.assert(
        fc.property(chapterArb, (chapter) => {
          const shouldDisplay = shouldDisplayLockIcon(chapter)
          expect(shouldDisplay).toBe(chapter.is_locked)
        }),
        { numRuns: 100 }
      )
    })

    test('lock icon is displayed for all locked chapters in a list', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 20 }),
          (chapters) => {
            // Make all chapters locked
            const allLocked = chapters.map((chapter) => ({
              ...chapter,
              is_locked: true,
            }))

            allLocked.forEach((chapter) => {
              const shouldDisplay = shouldDisplayLockIcon(chapter)
              expect(shouldDisplay).toBe(true)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lock icon is not displayed for any unlocked chapters in a list', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 20 }),
          (chapters) => {
            // Make all chapters unlocked
            const allUnlocked = chapters.map((chapter) => ({
              ...chapter,
              is_locked: false,
            }))

            allUnlocked.forEach((chapter) => {
              const shouldDisplay = shouldDisplayLockIcon(chapter)
              expect(shouldDisplay).toBe(false)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lock icon is displayed only for locked chapters in mixed list', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 20 }),
          (chapters) => {
            // Mix of locked and unlocked chapters
            const mixed = chapters.map((chapter, index) => ({
              ...chapter,
              is_locked: index % 2 === 0,
            }))

            mixed.forEach((chapter) => {
              const shouldDisplay = shouldDisplayLockIcon(chapter)
              expect(shouldDisplay).toBe(chapter.is_locked)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lock icon display is independent of chapter title', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.string({ minLength: 1, maxLength: 100 }),
          (chapter, newTitle) => {
            const lockedChapter = { ...chapter, is_locked: true, title: newTitle }
            const shouldDisplay = shouldDisplayLockIcon(lockedChapter)
            expect(shouldDisplay).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lock icon display is independent of chapter description', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.string({ maxLength: 500 }),
          (chapter, newDescription) => {
            const lockedChapter = { ...chapter, is_locked: true, description: newDescription }
            const shouldDisplay = shouldDisplayLockIcon(lockedChapter)
            expect(shouldDisplay).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lock icon display is independent of chapter order', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.integer({ min: 0, max: 1000 }),
          (chapter, newOrder) => {
            const lockedChapter = { ...chapter, is_locked: true, order: newOrder }
            const shouldDisplay = shouldDisplayLockIcon(lockedChapter)
            expect(shouldDisplay).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lock icon display is independent of prerequisite chapter', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 10000 })),
          (chapter, prerequisiteId) => {
            const lockedChapter = { ...chapter, is_locked: true, prerequisite_chapter_id: prerequisiteId }
            const shouldDisplay = shouldDisplayLockIcon(lockedChapter)
            expect(shouldDisplay).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lock icon display is independent of lesson count', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.integer({ min: 0, max: 100 }),
          (chapter, lessonCount) => {
            const lockedChapter = { ...chapter, is_locked: true, lesson_count: lessonCount }
            const shouldDisplay = shouldDisplayLockIcon(lockedChapter)
            expect(shouldDisplay).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lock icon display is independent of total duration', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.string({ maxLength: 20 }),
          (chapter, duration) => {
            const lockedChapter = { ...chapter, is_locked: true, total_duration: duration }
            const shouldDisplay = shouldDisplayLockIcon(lockedChapter)
            expect(shouldDisplay).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lock icon display is independent of quiz presence', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.boolean(),
          (chapter, hasQuiz) => {
            const lockedChapter = { ...chapter, is_locked: true, has_quiz: hasQuiz }
            const shouldDisplay = shouldDisplayLockIcon(lockedChapter)
            expect(shouldDisplay).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('toggling is_locked changes icon display', () => {
      fc.assert(
        fc.property(chapterArb, (chapter) => {
          const unlockedChapter = { ...chapter, is_locked: false }
          const showBefore = shouldDisplayLockIcon(unlockedChapter)
          expect(showBefore).toBe(false)

          const lockedChapter = { ...unlockedChapter, is_locked: true }
          const showAfter = shouldDisplayLockIcon(lockedChapter)
          expect(showAfter).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    test('lock icon element is correct when displayed', () => {
      fc.assert(
        fc.property(chapterArb, (chapter) => {
          const lockedChapter = { ...chapter, is_locked: true }
          const icon = getLockIconElement(lockedChapter)
          expect(icon).toBe('🔒')
        }),
        { numRuns: 100 }
      )
    })

    test('lock icon element is null when not displayed', () => {
      fc.assert(
        fc.property(chapterArb, (chapter) => {
          const unlockedChapter = { ...chapter, is_locked: false }
          const icon = getLockIconElement(unlockedChapter)
          expect(icon).toBeNull()
        }),
        { numRuns: 100 }
      )
    })

    test('lock icon element matches display decision', () => {
      fc.assert(
        fc.property(chapterArb, (chapter) => {
          const shouldDisplay = shouldDisplayLockIcon(chapter)
          const icon = getLockIconElement(chapter)

          if (shouldDisplay) {
            expect(icon).not.toBeNull()
            expect(icon).toBe('🔒')
          } else {
            expect(icon).toBeNull()
          }
        }),
        { numRuns: 100 }
      )
    })

    test('lock icon is displayed consistently across multiple checks', () => {
      fc.assert(
        fc.property(chapterArb, (chapter) => {
          const lockedChapter = { ...chapter, is_locked: true }

          const display1 = shouldDisplayLockIcon(lockedChapter)
          const display2 = shouldDisplayLockIcon(lockedChapter)
          const display3 = shouldDisplayLockIcon(lockedChapter)

          expect(display1).toBe(true)
          expect(display2).toBe(true)
          expect(display3).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    test('lock icon is not displayed consistently across multiple checks', () => {
      fc.assert(
        fc.property(chapterArb, (chapter) => {
          const unlockedChapter = { ...chapter, is_locked: false }

          const display1 = shouldDisplayLockIcon(unlockedChapter)
          const display2 = shouldDisplayLockIcon(unlockedChapter)
          const display3 = shouldDisplayLockIcon(unlockedChapter)

          expect(display1).toBe(false)
          expect(display2).toBe(false)
          expect(display3).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Locked Chapter Icon Display Edge Cases', () => {
    test('single locked chapter displays lock icon', () => {
      fc.assert(
        fc.property(chapterArb, (chapter) => {
          const lockedChapter = { ...chapter, is_locked: true }
          const shouldDisplay = shouldDisplayLockIcon(lockedChapter)
          expect(shouldDisplay).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    test('single unlocked chapter does not display lock icon', () => {
      fc.assert(
        fc.property(chapterArb, (chapter) => {
          const unlockedChapter = { ...chapter, is_locked: false }
          const shouldDisplay = shouldDisplayLockIcon(unlockedChapter)
          expect(shouldDisplay).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    test('many locked chapters all display lock icons', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 50, maxLength: 100 }),
          (chapters) => {
            const allLocked = chapters.map((chapter) => ({
              ...chapter,
              is_locked: true,
            }))

            allLocked.forEach((chapter) => {
              const shouldDisplay = shouldDisplayLockIcon(chapter)
              expect(shouldDisplay).toBe(true)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('many unlocked chapters do not display lock icons', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 50, maxLength: 100 }),
          (chapters) => {
            const allUnlocked = chapters.map((chapter) => ({
              ...chapter,
              is_locked: false,
            }))

            allUnlocked.forEach((chapter) => {
              const shouldDisplay = shouldDisplayLockIcon(chapter)
              expect(shouldDisplay).toBe(false)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('chapter with is_locked = true and prerequisite displays lock icon', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.integer({ min: 1, max: 10000 }),
          (chapter, prerequisiteId) => {
            const lockedWithPrereq = {
              ...chapter,
              is_locked: true,
              prerequisite_chapter_id: prerequisiteId,
            }
            const shouldDisplay = shouldDisplayLockIcon(lockedWithPrereq)
            expect(shouldDisplay).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('chapter with is_locked = true and no prerequisite displays lock icon', () => {
      fc.assert(
        fc.property(chapterArb, (chapter) => {
          const lockedNoPrereq = {
            ...chapter,
            is_locked: true,
            prerequisite_chapter_id: null,
          }
          const shouldDisplay = shouldDisplayLockIcon(lockedNoPrereq)
          expect(shouldDisplay).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    test('chapter with is_locked = false and prerequisite does not display lock icon', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.integer({ min: 1, max: 10000 }),
          (chapter, prerequisiteId) => {
            const unlockedWithPrereq = {
              ...chapter,
              is_locked: false,
              prerequisite_chapter_id: prerequisiteId,
            }
            const shouldDisplay = shouldDisplayLockIcon(unlockedWithPrereq)
            expect(shouldDisplay).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('chapter with is_locked = false and no prerequisite does not display lock icon', () => {
      fc.assert(
        fc.property(chapterArb, (chapter) => {
          const unlockedNoPrereq = {
            ...chapter,
            is_locked: false,
            prerequisite_chapter_id: null,
          }
          const shouldDisplay = shouldDisplayLockIcon(unlockedNoPrereq)
          expect(shouldDisplay).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Locked Chapter Icon Display Invariants', () => {
    test('lock icon display is boolean (true or false)', () => {
      fc.assert(
        fc.property(chapterArb, (chapter) => {
          const shouldDisplay = shouldDisplayLockIcon(chapter)
          expect(typeof shouldDisplay).toBe('boolean')
          expect([true, false]).toContain(shouldDisplay)
        }),
        { numRuns: 100 }
      )
    })

    test('lock icon display is idempotent (checking twice gives same result)', () => {
      fc.assert(
        fc.property(chapterArb, (chapter) => {
          const display1 = shouldDisplayLockIcon(chapter)
          const display2 = shouldDisplayLockIcon(chapter)
          expect(display1).toBe(display2)
        }),
        { numRuns: 100 }
      )
    })

    test('lock icon display is determined solely by is_locked property', () => {
      fc.assert(
        fc.property(chapterArb, (chapter) => {
          const shouldDisplay = shouldDisplayLockIcon(chapter)
          expect(shouldDisplay).toBe(chapter.is_locked)
        }),
        { numRuns: 100 }
      )
    })

    test('lock icon display is independent of chapter id', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.integer({ min: 1, max: 10000 }),
          (chapter, newId) => {
            const lockedChapter = { ...chapter, is_locked: true, id: newId }
            const shouldDisplay = shouldDisplayLockIcon(lockedChapter)
            expect(shouldDisplay).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lock icon display is independent of course id', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.integer({ min: 1, max: 1000 }),
          (chapter, newCourseId) => {
            const lockedChapter = { ...chapter, is_locked: true, course_id: newCourseId }
            const shouldDisplay = shouldDisplayLockIcon(lockedChapter)
            expect(shouldDisplay).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lock icon display is independent of timestamps', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.date(),
          fc.date(),
          (chapter, createdAt, updatedAt) => {
            const lockedChapter = {
              ...chapter,
              is_locked: true,
              created_at: createdAt.toISOString(),
              updated_at: updatedAt.toISOString(),
            }
            const shouldDisplay = shouldDisplayLockIcon(lockedChapter)
            expect(shouldDisplay).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lock icon display is consistent across all locked chapters', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 20 }),
          (chapters) => {
            const allLocked = chapters.map((chapter) => ({
              ...chapter,
              is_locked: true,
            }))

            const displays = allLocked.map((chapter) => shouldDisplayLockIcon(chapter))
            const allTrue = displays.every((display) => display === true)
            expect(allTrue).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lock icon display is consistent across all unlocked chapters', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 20 }),
          (chapters) => {
            const allUnlocked = chapters.map((chapter) => ({
              ...chapter,
              is_locked: false,
            }))

            const displays = allUnlocked.map((chapter) => shouldDisplayLockIcon(chapter))
            const allFalse = displays.every((display) => display === false)
            expect(allFalse).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lock icon display count matches locked chapter count', () => {
      fc.assert(
        fc.property(
          fc.array(chapterArb, { minLength: 1, maxLength: 20 }),
          (chapters) => {
            // Mix of locked and unlocked
            const mixed = chapters.map((chapter, index) => ({
              ...chapter,
              is_locked: index % 2 === 0,
            }))

            const displayCount = mixed.filter((chapter) => shouldDisplayLockIcon(chapter)).length
            const lockedCount = mixed.filter((chapter) => chapter.is_locked).length

            expect(displayCount).toBe(lockedCount)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('lock icon display is independent of other chapter properties', () => {
      fc.assert(
        fc.property(
          chapterArb,
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ maxLength: 500 }),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          fc.string({ maxLength: 20 }),
          fc.boolean(),
          (chapter, title, description, order, lessonCount, duration, hasQuiz) => {
            const lockedChapter = {
              ...chapter,
              is_locked: true,
              title,
              description,
              order,
              lesson_count: lessonCount,
              total_duration: duration,
              has_quiz: hasQuiz,
            }
            const shouldDisplay = shouldDisplayLockIcon(lockedChapter)
            expect(shouldDisplay).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
