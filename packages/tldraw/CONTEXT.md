# Tldraw Package Context

## Overview

The `@tldraw/tldraw` package is the main "batteries included" SDK that provides a complete drawing application with UI, tools, shapes, and all functionality. It builds on top of the editor package to provide a fully-featured drawing experience out of the box.

## Architecture

### Core Components

#### `Tldraw.tsx` - Main Component

The primary component that combines the editor with the complete UI system:

```typescript
export function Tldraw(props: TldrawProps) {
	// Merges default and custom:
	// - Shape utilities (defaultShapeUtils + custom)
	// - Tools (defaultTools + custom)
	// - Bindings (defaultBindingUtils + custom)
	// - Side effects and external content handlers
	// Returns <TldrawEditor> wrapped with <TldrawUi>
}
```

#### `TldrawUi.tsx` - UI System

Comprehensive UI system with responsive layout:

- Provider hierarchy for context, theming, translations, events
- Responsive breakpoint system (mobile, tablet, desktop)
- Layout zones: top (menu, helper buttons, top panel, share/style panels), bottom (navigation, toolbar, help)
- Conditional rendering based on focus mode, readonly state, debug mode
- Mobile-specific behavior (toolbar hiding during editing)

### Shape System

#### Default Shape Utilities (`defaultShapeUtils.ts`)

Complete set of shape implementations:

- **Text**: Text editing with rich text support
- **Draw**: Freehand drawing with stroke optimization
- **Geo**: Geometric shapes (rectangle, ellipse, triangle, etc.)
- **Note**: Sticky note shapes
- **Line**: Straight lines with various styles
- **Frame**: Container frames for grouping
- **Arrow**: Smart arrows with binding capabilities
- **Highlight**: Highlighter tool for annotations
- **Bookmark**: URL bookmark cards with metadata
- **Embed**: Embedded content (YouTube, Figma, etc.)
- **Image**: Image shapes with cropping support
- **Video**: Video playback shapes

Each shape has its own directory with:

- `ShapeUtil.tsx`: Rendering, hit testing, bounds calculation
- `ShapeTool.ts`: Creation tool with state machine
- Tool states (Idle, Pointing, etc.)
- Helper functions and components

### Tools System

#### Default Tools (`defaultTools.ts`)

Complete toolset:

- **SelectTool**: Complex selection with multiple interaction modes
- **Shape Tools**: One for each creatable shape type
- **HandTool**: Pan/move canvas
- **EraserTool**: Delete shapes by brushing
- **LaserTool**: Temporary pointer for presentations
- **ZoomTool**: Zoom to specific areas

#### SelectTool - Primary Interaction Tool

Sophisticated state machine with child states:

- **Idle**: Default state, handles shape selection
- **Brushing**: Drag selection of multiple shapes
- **Translating**: Moving selected shapes
- **Resizing**: Resize handles interaction
- **Rotating**: Rotation handle interaction
- **Crop**: Image cropping functionality
- **EditingShape**: Text editing mode
- **Pointing** states: Various pointer interaction states

### UI Component System

#### Component Architecture

Hierarchical component system with context providers:

- **TldrawUiContextProvider**: Master provider with asset URLs, overrides, components
- **Specialized Providers**: Tooltips, translations, events, dialogs, toasts, breakpoints
- **Component Override System**: Every UI component can be replaced/customized

#### Key UI Components

- **Toolbar**: Main tool selection with overflow handling
- **StylePanel**: Shape style controls (color, size, opacity, etc.)
- **MenuPanel**: Application menu with actions
- **SharePanel**: Collaboration and sharing features
- **NavigationPanel**: Page navigation and zoom controls
- **Minimap**: Canvas overview with WebGL rendering
- **Dialogs**: Modal dialogs for embeds, links, keyboard shortcuts
- **Toasts**: User notifications system

### External Content System

#### Content Handlers (`defaultExternalContentHandlers.ts`)

Comprehensive external content processing:

- **Files**: Drag/drop and paste of images/videos with validation
- **URLs**: Automatic bookmark creation with metadata extraction
- **Text**: Smart text pasting with rich text support
- **SVG**: Vector graphics import with size calculation
- **Embeds**: Integration with external services (YouTube, Figma, etc.)
- **Tldraw Content**: Copy/paste between tldraw instances
- **Excalidraw**: Import from Excalidraw format

#### Asset Management

- Size and type validation
- Automatic image resizing and optimization
- Hash-based deduplication
- Temporary preview creation
- Background upload processing

### Bindings System

#### Arrow Bindings (`ArrowBindingUtil`)

Smart arrow connections:

- Automatic binding to shape edges
- Dynamic arrow routing around obstacles
- Binding preservation during shape updates
- Visual feedback for binding states

### State Management & Side Effects

#### Default Side Effects (`defaultSideEffects.ts`)

Reactive state management for UI behavior:

- **Cropping Mode**: Auto-enter/exit crop mode based on state
- **Text Editing**: Tool switching for text creation/editing
- **Tool Locking**: Persistent tool state for rapid creation

### Utilities

#### Export System (`utils/export/`)

Multi-format export capabilities:

- **Image Export**: PNG, JPG, SVG with various options
- **Data Export**: JSON format for content preservation
- **Print Support**: Optimized printing layouts
- **Copy/Paste**: Clipboard integration

#### Text Processing (`utils/text/`)

Advanced text handling:

- **Rich Text**: HTML to tldraw rich text conversion
- **Text Direction**: RTL language detection and support
- **Text Measurement**: Accurate text sizing for layout

#### Asset Processing (`utils/assets/`)

Asset optimization and management:

- **Image Processing**: Resizing, format conversion
- **Font Preloading**: Ensure consistent text rendering
- **Size Constraints**: Automatic asset size management

### Canvas Overlays

#### Visual Feedback Components (`canvas/`)

Canvas-level visual elements:

- **TldrawHandles**: Resize and rotate handles
- **TldrawCropHandles**: Image cropping interface
- **TldrawScribble**: Live drawing feedback
- **TldrawSelectionForeground**: Selection outline and controls
- **TldrawShapeIndicators**: Hover and focus indicators

## Key Patterns

### Component Composition

- Every UI component can be overridden via the components prop
- Providers use context for dependency injection
- Responsive design with breakpoint-based rendering

### State Machine Architecture

- Tools implemented as hierarchical state machines
- Clear separation between tool logic and rendering
- Reactive state updates trigger automatic UI changes

### Asset Pipeline

- Async asset processing with progress feedback
- Automatic optimization and validation
- Hash-based caching and deduplication

### Extension Points

- Custom shapes via ShapeUtil classes
- Custom tools via StateNode extensions
- Custom UI via component overrides
- Custom external content handlers

## Integration

### With Editor Package

- Wraps `@tldraw/editor` with complete UI
- Extends editor with additional functionality
- Provides default implementations for all extension points

### With External Systems

- Clipboard integration for copy/paste
- File system integration for drag/drop
- URL handling for bookmarks and embeds
- External service integration (YouTube, Figma, etc.)

### Responsive Design

- Mobile-first breakpoint system
- Touch-optimized interactions
- Adaptive UI based on screen size
- Virtual keyboard handling on mobile

## Performance Considerations

### Canvas Rendering

- WebGL-accelerated minimap
- Optimized shape rendering with culling
- Efficient hit testing and bounds calculation

### Asset Handling

- Lazy loading of external content
- Background processing of large files
- Temporary previews during upload
- Automatic cleanup of unused assets

### Memory Management

- Proper cleanup of event listeners and reactors
- Efficient state updates with batching
- Asset deduplication to reduce memory usage

## Development Patterns

### Testing

- Comprehensive test coverage for tools and shapes
- Snapshot testing for complex rendering
- Mock implementations for external dependencies

### TypeScript Integration

- Full type safety for all APIs
- Generic type parameters for extensibility
- Proper inference for shape and tool types

### Error Handling

- Graceful degradation for failed external content
- User-friendly error messages via toast system
- Comprehensive validation for all inputs
