# Chapter Management Frontend Implementation Guide

## Overview
This guide provides the complete implementation for adding drag-and-drop chapter management to the course edit page (Step 2).

## Backend APIs Available
- `GET /api/chapters/?course_id={id}` - Get all chapters for a course
- `POST /api/chapters/` - Create new chapter
- `PUT /api/chapters/{id}/` - Update chapter
- `DELETE /api/chapters/{id}/` - Delete chapter
- `POST /api/chapters/reorder/` - Reorder chapters
- `PATCH /api/lessons/{id}/` - Update lesson (including moving to different chapter)

## Implementation Steps

### 1. Add State Management (in CreateCoursePageContent component)

```typescript
// Add to existing state declarations
const [chapters, setChapters] = useState<any[]>([])
const [lessons, setLessons] = useState<any[]>([])
const [showChapterDialog, setShowChapterDialog] = useState(false)
const [editingChapter, setEditingChapter] = useState<any>(null)
const [newChapterData, setNewChapterData] = useState({
  title: '',
  description: '',
  is_locked: false,
  prerequisite_chapter: null
})
```

### 2. Add Fetch Functions

```typescript
// Fetch chapters for the course
const fetchChapters = async () => {
  if (!courseId) return
  try {
    const data = await djangoApi.get(`/api/chapters/?course_id=${courseId}`)
    setChapters(Array.isArray(data) ? data : data.results || [])
  } catch (error) {
    console.error('Error fetching chapters:', error)
  }
}

// Fetch lessons for the course
const fetchLessons = async () => {
  if (!courseId) return
  try {
    const data = await djangoApi.get(`/api/lessons/?course_id=${courseId}`)
    setLessons(Array.isArray(data) ? data : data.results || [])
  } catch (error) {
    console.error('Error fetching lessons:', error)
  }
}

// Call these in useEffect when courseId changes
useEffect(() => {
  if (courseId && currentStep === 2) {
    fetchChapters()
    fetchLessons()
  }
}, [courseId, currentStep])
```

### 3. Add Chapter CRUD Functions

```typescript
const handleCreateChapter = async () => {
  if (!courseId || !newChapterData.title) return
  
  try {
    const order = chapters.length
    await djangoApi.post('/api/chapters/', {
      course: parseInt(courseId),
      title: newChapterData.title,
      description: newChapterData.description,
      order,
      is_locked: newChapterData.is_locked,
      prerequisite_chapter: newChapterData.prerequisite_chapter
    })
    
    toast({ title: 'Chapter created successfully!' })
    setShowChapterDialog(false)
    setNewChapterData({ title: '', description: '', is_locked: false, prerequisite_chapter: null })
    fetchChapters()
  } catch (error: any) {
    toast({
      title: 'Error',
      description: error?.message || 'Failed to create chapter',
      variant: 'destructive'
    })
  }
}

const handleUpdateChapter = async (chapterId: number, updates: any) => {
  try {
    await djangoApi.patch(`/api/chapters/${chapterId}/`, updates)
    toast({ title: 'Chapter updated!' })
    fetchChapters()
  } catch (error: any) {
    toast({
      title: 'Error',
      description: error?.message || 'Failed to update chapter',
      variant: 'destructive'
    })
  }
}

const handleDeleteChapter = async (chapterId: number) => {
  if (!confirm('Delete this chapter? Lessons will be moved to "No Chapter".')) return
  
  try {
    await djangoApi.delete(`/api/chapters/${chapterId}/`)
    toast({ title: 'Chapter deleted!' })
    fetchChapters()
    fetchLessons()
  } catch (error: any) {
    toast({
      title: 'Error',
      description: error?.message || 'Failed to delete chapter',
      variant: 'destructive'
    })
  }
}

const handleMoveLessonToChapter = async (lessonId: number, chapterId: number | null) => {
  try {
    await djangoApi.patch(`/api/lessons/${lessonId}/`, {
      chapter: chapterId
    })
    toast({ title: 'Lesson moved!' })
    fetchLessons()
  } catch (error: any) {
    toast({
      title: 'Error',
      description: error?.message || 'Failed to move lesson',
      variant: 'destructive'
    })
  }
}
```

### 4. Add Drag-and-Drop Handlers

```typescript
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Add sensors
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
)

// Handle chapter reorder
const handleChapterDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event
  
  if (!over || active.id === over.id) return
  
  const oldIndex = chapters.findIndex(c => c.id === active.id)
  const newIndex = chapters.findIndex(c => c.id === over.id)
  
  const reorderedChapters = arrayMove(chapters, oldIndex, newIndex)
  setChapters(reorderedChapters)
  
  // Update backend
  try {
    await djangoApi.post('/api/chapters/reorder/', {
      course_id: courseId,
      chapters: reorderedChapters.map((c, idx) => ({ id: c.id, order: idx }))
    })
  } catch (error) {
    console.error('Failed to reorder chapters:', error)
    fetchChapters() // Revert on error
  }
}
```

### 5. Create Sortable Chapter Component

```typescript
function SortableChapter({ chapter, lessons, onDelete, onUpdate, onMoveLesson }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: chapter.id })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  
  const chapterLessons = lessons.filter((l: any) => l.chapter === chapter.id)
  
  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-3 flex-1">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{chapter.title}</CardTitle>
              {chapter.description && (
                <CardDescription>{chapter.description}</CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {chapter.is_locked && (
              <Badge variant="secondary">
                <Lock className="h-3 w-3 mr-1" />
                Locked
              </Badge>
            )}
            <Badge variant="outline">{chapterLessons.length} lessons</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(chapter.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {chapterLessons.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No lessons in this chapter. Drag lessons here.
            </p>
          ) : (
            <div className="space-y-2">
              {chapterLessons.map((lesson: any) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{lesson.title}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMoveLesson(lesson.id, null)}
                  >
                    Remove from chapter
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

### 6. Add Chapter Management UI to Step 2

```typescript
{currentStep === 2 && courseId && (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold">Organize Course Content</h2>
        <p className="text-muted-foreground">Create chapters and organize lessons</p>
      </div>
      <Button onClick={() => setShowChapterDialog(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Chapter
      </Button>
    </div>

    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleChapterDragEnd}
    >
      <SortableContext
        items={chapters.map(c => c.id)}
        strategy={verticalListSortingStrategy}
      >
        {chapters.map(chapter => (
          <SortableChapter
            key={chapter.id}
            chapter={chapter}
            lessons={lessons}
            onDelete={handleDeleteChapter}
            onUpdate={handleUpdateChapter}
            onMoveLesson={handleMoveLessonToChapter}
          />
        ))}
      </SortableContext>
    </DndContext>

    {/* Unassigned Lessons */}
    <Card>
      <CardHeader>
        <CardTitle>Unassigned Lessons</CardTitle>
        <CardDescription>Drag these lessons into chapters</CardDescription>
      </CardHeader>
      <CardContent>
        {lessons.filter(l => !l.chapter).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            All lessons are organized into chapters
          </p>
        ) : (
          <div className="space-y-2">
            {lessons.filter(l => !l.chapter).map((lesson: any) => (
              <div
                key={lesson.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{lesson.title}</span>
                </div>
                <Select
                  onValueChange={(value) => handleMoveLessonToChapter(lesson.id, parseInt(value))}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Move to chapter..." />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters.map(chapter => (
                      <SelectItem key={chapter.id} value={chapter.id.toString()}>
                        {chapter.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  </div>
)}
```

### 7. Add Chapter Creation Dialog

```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"

{/* Add this dialog component */}
<Dialog open={showChapterDialog} onOpenChange={setShowChapterDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create New Chapter</DialogTitle>
      <DialogDescription>
        Organize your lessons into chapters for better structure
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <Label htmlFor="chapter-title">Chapter Title</Label>
        <Input
          id="chapter-title"
          value={newChapterData.title}
          onChange={(e) => setNewChapterData({ ...newChapterData, title: e.target.value })}
          placeholder="e.g., Introduction to React"
        />
      </div>
      <div>
        <Label htmlFor="chapter-description">Description (Optional)</Label>
        <Textarea
          id="chapter-description"
          value={newChapterData.description}
          onChange={(e) => setNewChapterData({ ...newChapterData, description: e.target.value })}
          placeholder="Brief description of what this chapter covers"
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="chapter-locked">Lock Chapter</Label>
          <p className="text-sm text-muted-foreground">
            Require previous chapter completion
          </p>
        </div>
        <Switch
          id="chapter-locked"
          checked={newChapterData.is_locked}
          onCheckedChange={(checked) => setNewChapterData({ ...newChapterData, is_locked: checked })}
        />
      </div>
      {newChapterData.is_locked && chapters.length > 0 && (
        <div>
          <Label htmlFor="prerequisite">Prerequisite Chapter</Label>
          <Select
            value={newChapterData.prerequisite_chapter?.toString() || ''}
            onValueChange={(value) => setNewChapterData({ ...newChapterData, prerequisite_chapter: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select prerequisite chapter" />
            </SelectTrigger>
            <SelectContent>
              {chapters.map(chapter => (
                <SelectItem key={chapter.id} value={chapter.id.toString()}>
                  {chapter.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowChapterDialog(false)}>
        Cancel
      </Button>
      <Button onClick={handleCreateChapter}>
        Create Chapter
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 8. Add Missing Imports

```typescript
import { GripVertical, Lock, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
```

## Testing Checklist

- [ ] Create a new chapter
- [ ] Drag chapters to reorder them
- [ ] Move lessons into chapters
- [ ] Remove lessons from chapters
- [ ] Delete a chapter (lessons should become unassigned)
- [ ] Lock a chapter with prerequisites
- [ ] Verify chapter order persists after page reload

## Notes

- Chapters are optional - lessons without chapters still work
- Deleting a chapter doesn't delete lessons, just unassigns them
- Chapter locking is enforced on the student side (not in edit mode)
- The drag-and-drop uses @dnd-kit which is already installed

