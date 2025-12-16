# Lesson Content Type Components

This directory contains React components for rendering and managing different types of lesson content in the LMS.

## Student-Facing Components (Viewers/Players)

### ScormPlayer
Renders SCORM 1.2 and 2004 content packages with full runtime API support.
- Initializes SCORM API adapter
- Tracks CMI data
- Handles session management
- Displays completion status and scores

### MarkdownViewer
Displays Markdown-formatted lesson content with rich formatting.
- Renders Markdown to HTML
- Syntax highlighting for code blocks
- Table of contents navigation
- Scroll progress tracking
- Reading time estimation

### H5PPlayer
Embeds and manages H5P interactive content.
- Loads H5P packages in iframe
- Captures xAPI statements via postMessage
- Restores previous state
- Displays completion status and scores
- Supports state reset

### HTMLEmbedViewer
Displays embedded HTML content with security controls.
- Renders external URLs or inline HTML
- Sandboxed iframe for security
- xAPI statement capture via postMessage
- Configurable permissions
- Supports PhET simulations and other embeds

### VideoPlayer
Enhanced video player with interaction tracking.
- Tracks play, pause, seek, complete events
- Sends xAPI statements to backend
- Displays watch progress
- Standard video controls

## Instructor-Facing Components (Editors/Configurators)

### MarkdownEditor
Live Markdown editor with preview for instructors.
- Split view with editor and preview
- Toolbar for common formatting
- Syntax highlighting
- Save and preview functionality

### H5PUpload
Upload interface for H5P packages.
- Drag-and-drop file upload
- Package validation feedback
- Progress indicator
- Library information display
- Title and description fields
- File size validation (max 100MB)
- Supports .h5p files only

### HTMLEmbedConfig
Configuration interface for HTML embeds.
- URL or inline HTML input (tabbed interface)
- Sandbox permission toggles:
  - Allow scripts
  - Allow forms
  - Allow popups
  - Allow same origin
  - Allow top navigation
- Dimension configuration (width, height)
- xAPI messaging toggle
- Allowed origins management
- Live preview functionality
- Security warnings and info

## Content Type Router

### ContentTypeRouter
Routes to the appropriate component based on lesson content type.
- Detects content type from lesson data
- Renders correct viewer/player component
- Handles loading states
- Error handling for unsupported types

## Usage Examples

### For Students (Viewing Content)

```tsx
import { H5PPlayer, HTMLEmbedViewer, MarkdownViewer } from '@/components/lessons'

// H5P Content
<H5PPlayer
  h5pPackageId="123"
  lessonId="456"
  courseId="789"
  onCompletion={(data) => console.log('Completed!', data)}
/>

// HTML Embed
<HTMLEmbedViewer
  lessonId="456"
  courseId="789"
  onCompletion={(data) => console.log('Completed!', data)}
/>

// Markdown Content
<MarkdownViewer
  lessonId="456"
  courseId="789"
  onCompletion={(data) => console.log('Completed!', data)}
/>
```

### For Instructors (Managing Content)

```tsx
import { H5PUpload, HTMLEmbedConfig, MarkdownEditor } from '@/components/lessons'

// Upload H5P Package
<H5PUpload
  lessonId="456"
  courseId="789"
  onUploadComplete={(result) => {
    console.log('Uploaded:', result.h5p_id)
  }}
  onCancel={() => console.log('Cancelled')}
/>

// Configure HTML Embed
<HTMLEmbedConfig
  lessonId="456"
  courseId="789"
  existingConfig={config}
  onSaveComplete={(config) => {
    console.log('Saved:', config.id)
  }}
  onCancel={() => console.log('Cancelled')}
/>

// Edit Markdown
<MarkdownEditor
  lessonId="456"
  courseId="789"
  initialContent="# Hello World"
  onSave={(content) => console.log('Saved')}
/>
```

## API Integration

All components integrate with the backend API:

- **H5P**: `/api/h5p/upload/`, `/api/h5p/{id}/embed/`, `/api/h5p/{id}/xapi/`, `/api/h5p/{id}/state/`
- **HTML Embed**: `/api/lessons/{id}/html-embed/`, `/api/lessons/{id}/html-embed/xapi/`
- **Markdown**: `/api/lessons/{id}/markdown/`, `/api/lessons/{id}/markdown/complete/`
- **SCORM**: `/api/scorm/runtime/initialize/`, `/api/scorm/runtime/get-value/`, etc.
- **Video**: `/api/lessons/{id}/video/interaction/`

## Security Considerations

### HTML Embed Security
- All embedded content runs in sandboxed iframes
- Permissions are explicitly configured
- xAPI postMessage origin validation
- HTML sanitization for inline content

### H5P Security
- Package validation before upload
- Secure iframe embedding
- xAPI statement validation
- State data isolation per student

### SCORM Security
- Package validation and manifest parsing
- CMI data validation
- Session isolation
- Error code handling

## xAPI Integration

All content types support xAPI statement generation:

- **Lesson Completion**: Generated when content is completed
- **Video Interactions**: Play, pause, seek, complete events
- **H5P Interactions**: Captured from H5P content via postMessage
- **HTML Embed Interactions**: Captured via postMessage from embedded content
- **Quiz Results**: Pass/fail with scores

Statements are stored in the LRS and used for analytics.

## Requirements Mapping

- **Requirement 11**: Markdown content (MarkdownViewer, MarkdownEditor)
- **Requirement 12**: H5P content (H5PPlayer, H5PUpload)
- **Requirement 13**: HTML embeds and PhET simulations (HTMLEmbedViewer, HTMLEmbedConfig)
- **Requirement 2**: SCORM content (ScormPlayer)
- **Requirement 4**: Video tracking (VideoPlayer)

## Testing

Components should be tested for:
- Proper rendering with valid data
- Error handling with invalid data
- API integration (mocked)
- User interactions (clicks, form submissions)
- xAPI statement generation
- Security controls (sandbox attributes)

## Future Enhancements

- [ ] Offline support for content viewing
- [ ] Content versioning
- [ ] Bulk upload for H5P packages
- [ ] Advanced markdown features (math equations, diagrams)
- [ ] Content preview before publishing
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)
- [ ] Mobile-optimized layouts
- [ ] Content analytics dashboard integration
