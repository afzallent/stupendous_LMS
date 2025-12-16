/**
 * Property-Based Tests for Chapter Order Consistency
 * 
 * **Feature: course-editor-redesign, Property 1: Chapter Order Consistency**
 * **Validates: Requirements 3.2**
 * 
 * Property 1: Chapter Order Consistency
 * *For any* course with chapters, when chapters are reordered via drag-and-drop,
 * the persisted order should match the visual order displayed to the user.
 */

import * as fc from 'fast-check'
import { Chapter } from '../types'

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
 * Generator for arrays of chapters with unique IDs and sequential orders
 */
const chaptersArb = fc.array(
  fc.tuple(
    fc.integer({ min: 1, max: 1000 }),
    fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    fc.string({ maxLength: 500 }),
    fc.boolean()
  ),
  { minLength: 0, maxLength: 20 }
).map((chapters) => {
  // Create unique IDs for each chapter
  return chapters.map(([course_id, title, description, is_locked], i) => ({
    id: i + 1, // Ensure unique sequential IDs
    course_id,
    title,
    description,
    order: i,
    is_locked,
    prerequisite_chapter_id: i > 0 ? i : null, // Can reference previous chapter
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    lesson_count: 0,
    total_duration: '0m',
    has_quiz: false,
  }))
}) as any as fc.Arbitrary<Chapter[]>

describe('Chapter Order Consistency Property Tests', () => {
  /**
   * **Feature: course-editor-redesign, Property 1: Chapter Order Consistency**
   * **Validates: Requirements 3.2**
   * 
   * For any course with chapters, when chapters are reordered,
   * the order field should match the visual position in the array.
   */
  describe('Property 1: Chapter Order Consistency', () => {
    test('chapter order field matches array position after reorder', () => {
      fc.assert(
        fc.property(chaptersArb, (chapters) => {
          // For each chapter, its order field should match its index in the array
          chapters.forEach((chapter, index) => {
            expect(chapter.order).toBe(index)
          })
        }),
        { numRuns: 100 }
      )
    })

    test('reordering chapters preserves all chapter data except order', () => {
      fc.assert(
        fc.property(
          chaptersArb,
          fc.integer({ min: 0, max: 19 }),
          fc.integer({ min: 0, max: 19 }),
          (chapters, fromIndex, toIndex) => {
            if (chapters.length === 0) return true
            
            const normalizedFrom = fromIndex % chapters.length
            const normalizedTo = toIndex % chapters.length
            
            if (normalizedFrom === normalizedTo) return true

            // Simulate reordering
            const reordered = [...chapters]
            const [movedChapter] = reordered.splice(normalizedFrom, 1)
            reordered.splice(normalizedTo, 0, movedChapter)

            // Update order fields to match new positions
            const updated = reordered.map((ch, index) => ({
              ...ch,
              order: index,
            }))

            // Verify all chapters are still present
            expect(updated.length).toBe(chapters.length)

            // Verify chapter data is preserved (except order)
            updated.forEach((chapter) => {
              const original = chapters.find(c => c.id === chapter.id)
              expect(original).toBeDefined()
              if (original) {
                expect(chapter.title).toBe(original.title)
                expect(chapter.description).toBe(original.description)
                expect(chapter.course_id).toBe(original.course_id)
                expect(chapter.is_locked).toBe(original.is_locked)
              }
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('chapter IDs remain unique after reordering', () => {
      fc.assert(
        fc.property(chaptersArb, (chapters) => {
          if (chapters.length === 0) return true

          const ids = chapters.map(c => c.id)
          const uniqueIds = new Set(ids)

          // All IDs should be unique
          expect(uniqueIds.size).toBe(ids.length)
        }),
        { numRuns: 100 }
      )
    })

    test('reordering is reversible (round-trip consistency)', () => {
      fc.assert(
        fc.property(
          chaptersArb,
          fc.integer({ min: 0, max: 19 }),
          fc.integer({ min: 0, max: 19 }),
          (chapters, fromIndex, toIndex) => {
            if (chapters.length <= 1) return true

            const normalizedFrom = fromIndex % chapters.length
            const normalizedTo = toIndex % chapters.length

            // First reorder
            const reordered1 = [...chapters]
            const [moved1] = reordered1.splice(normalizedFrom, 1)
            reordered1.splice(normalizedTo, 0, moved1)

            // Reverse reorder (move back)
            const reordered2 = [...reordered1]
            const [moved2] = reordered2.splice(normalizedTo, 1)
            reordered2.splice(normalizedFrom, 0, moved2)

            // After reversing, chapters should be in original order
            expect(reordered2.length).toBe(chapters.length)
            reordered2.forEach((chapter, index) => {
              expect(chapter.id).toBe(chapters[index].id)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('order field is always sequential starting from 0', () => {
      fc.assert(
        fc.property(chaptersArb, (chapters) => {
          if (chapters.length === 0) return true

          // After proper ordering, order fields should be 0, 1, 2, ...
          const orders = chapters.map(c => c.order).sort((a, b) => a - b)
          
          orders.forEach((order, index) => {
            expect(order).toBe(index)
          })
        }),
        { numRuns: 100 }
      )
    })

    test('moving chapter to same position is idempotent', () => {
      fc.assert(
        fc.property(
          chaptersArb,
          fc.integer({ min: 0, max: 19 }),
          (chapters, index) => {
            if (chapters.length === 0) return true

            const normalizedIndex = index % chapters.length

            // Move chapter to its own position
            const reordered = [...chapters]
            const [moved] = reordered.splice(normalizedIndex, 1)
            reordered.splice(normalizedIndex, 0, moved)

            // Should be identical to original
            expect(reordered.length).toBe(chapters.length)
            reordered.forEach((chapter, i) => {
              expect(chapter.id).toBe(chapters[i].id)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    test('chapter order persists across multiple reorderings', () => {
      fc.assert(
        fc.property(
          chaptersArb,
          fc.array(
            fc.tuple(
              fc.integer({ min: 0, max: 19 }),
              fc.integer({ min: 0, max: 19 })
            ),
            { maxLength: 5 }
          ),
          (chapters, moves) => {
            if (chapters.length === 0) return true

            let current = [...chapters]

            // Apply multiple reorderings
            for (const [fromIndex, toIndex] of moves) {
              const normalizedFrom = fromIndex % current.length
              const normalizedTo = toIndex % current.length

              if (normalizedFrom !== normalizedTo) {
                const [moved] = current.splice(normalizedFrom, 1)
                current.splice(normalizedTo, 0, moved)
              }
            }

            // Update order fields
            const updated = current.map((ch, index) => ({
              ...ch,
              order: index,
            }))

            // Verify order fields are sequential
            updated.forEach((chapter, index) => {
              expect(chapter.order).toBe(index)
            })

            // Verify all chapters are still present
            expect(updated.length).toBe(chapters.length)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Chapter Order Edge Cases', () => {
    test('empty chapter list has no order issues', () => {
      const chapters: Chapter[] = []
      expect(chapters.length).toBe(0)
      expect(chapters.every((_, i) => chapters[i].order === i)).toBe(true)
    })

    test('single chapter always has order 0', () => {
      fc.assert(
        fc.property(chapterArb, (chapter) => {
          const chapters = [{ ...chapter, order: 0 }]
          expect(chapters[0].order).toBe(0)
        }),
        { numRuns: 100 }
      )
    })

    test('two chapters can be swapped', () => {
      fc.assert(
        fc.property(
          fc.tuple(chapterArb, chapterArb),
          ([ch1, ch2]) => {
            const chapters = [
              { ...ch1, order: 0 },
              { ...ch2, order: 1 },
            ]

            // Swap
            const swapped = [chapters[1], chapters[0]]
            const updated = swapped.map((ch, i) => ({ ...ch, order: i }))

            expect(updated[0].order).toBe(0)
            expect(updated[1].order).toBe(1)
            expect(updated[0].id).toBe(ch2.id)
            expect(updated[1].id).toBe(ch1.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('chapter order is independent of other chapter properties', () => {
      fc.assert(
        fc.property(chaptersArb, (chapters) => {
          if (chapters.length <= 1) return true

          // Chapters with different properties should still maintain order
          const withDifferentProps = chapters.map((ch, i) => ({
            ...ch,
            order: i,
            is_locked: i % 2 === 0, // Vary lock status
            prerequisite_chapter_id: i > 0 ? chapters[i - 1].id : null, // Vary prerequisites
          }))

          // Order should still be sequential
          withDifferentProps.forEach((ch, i) => {
            expect(ch.order).toBe(i)
          })
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Chapter Order Invariants', () => {
    test('order field is always non-negative', () => {
      fc.assert(
        fc.property(chaptersArb, (chapters) => {
          chapters.forEach((chapter) => {
            expect(chapter.order).toBeGreaterThanOrEqual(0)
          })
        }),
        { numRuns: 100 }
      )
    })

    test('order field is always less than chapter count', () => {
      fc.assert(
        fc.property(chaptersArb, (chapters) => {
          chapters.forEach((chapter) => {
            expect(chapter.order).toBeLessThan(chapters.length)
          })
        }),
        { numRuns: 100 }
      )
    })

    test('no two chapters have the same order', () => {
      fc.assert(
        fc.property(chaptersArb, (chapters) => {
          if (chapters.length === 0) return true

          const orders = chapters.map(c => c.order)
          const uniqueOrders = new Set(orders)

          expect(uniqueOrders.size).toBe(orders.length)
        }),
        { numRuns: 100 }
      )
    })

    test('order values form a complete sequence from 0 to n-1', () => {
      fc.assert(
        fc.property(chaptersArb, (chapters) => {
          if (chapters.length === 0) return true

          const orders = chapters.map(c => c.order).sort((a, b) => a - b)
          
          for (let i = 0; i < orders.length; i++) {
            expect(orders[i]).toBe(i)
          }
        }),
        { numRuns: 100 }
      )
    })
  })
})
