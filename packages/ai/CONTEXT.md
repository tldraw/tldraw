# AI Package Context

## Overview
The `@tldraw/ai` package provides integration between tldraw's canvas and AI systems. It enables AI models to understand canvas content and generate changes to the drawing, supporting both one-time generation and streaming responses for interactive AI-powered drawing experiences.

## Architecture

### Core Components

#### `useTldrawAi` - React Hook Interface
The primary hook for AI integration in React applications:
```typescript
function useTldrawAi(options: TldrawAiOptions) {
  return {
    prompt: (message: TldrawAiPromptOptions) => Promise<void> & { cancel: () => void }
    repeat: () => Promise<void> & { cancel: () => void }
    cancel: () => void
  }
}

interface TldrawAiOptions {
  editor?: Editor                                 // Editor instance (optional if in context)
  generate?: TldrawAiGenerateFn                  // One-time generation function
  stream?: TldrawAiStreamFn                      // Streaming generation function  
  transforms?: TldrawAiTransformConstructor[]    // Change transformation pipeline
}
```

#### `TldrawAiModule` - Core AI Manager
Manages AI prompts and change application:
```typescript
class TldrawAiModule {
  constructor(options: TldrawAiModuleOptions)
  
  // Prompt generation
  async generate(prompt: string | PromptConfig): Promise<{
    prompt: TLAiPrompt
    handleChange: (change: TLAiChange) => void
    handleChanges: (changes: TLAiChange[]) => void
  }>
  
  // Content extraction
  async getPrompt(message: TLAiMessages, options?: PromptOptions): Promise<TLAiPrompt>
  
  // Change application
  applyChange(change: TLAiChange): void
}
```

### Prompt System

#### `TLAiPrompt` - Rich Context for AI
Comprehensive prompt structure containing canvas information:
```typescript
interface TLAiPrompt {
  message: string | TLAiMessage[]               // User's text/image messages
  image?: string                                // Canvas screenshot as data URL
  canvasContent: TLAiContent                   // Structured shape/binding data
  contextBounds: Box                           // Viewport bounds for context
  promptBounds: Box                            // Specific area of interest
  meta?: any                                   // Additional JSON-serializable data
}
```

#### `TLAiContent` - Canvas Data Structure
Simplified canvas content optimized for AI consumption:
```typescript
interface TLAiContent {
  shapes: TLShape[]                            // All shapes in prompt area
  bindings: TLBinding[]                        // Relationships between shapes
  assets: TLAsset[]                            // Referenced images/videos
  // Excludes: schema, rootShapeIds (AI doesn't need these)
}
```

#### Message Types
Flexible input formats for AI prompts:
```typescript
interface TLAiTextMessage { type: 'text', text: string }
interface TLAiImageMessage { type: 'image', mimeType: string, src: string }
type TLAiMessages = string | TLAiMessage | TLAiMessage[]
```

### Change System

#### `TLAiChange` - AI-Generated Modifications
Structured representation of AI-generated changes:
```typescript
type TLAiChange = 
  | TLAiCreateShapeChange    // Create new shapes
  | TLAiUpdateShapeChange    // Modify existing shapes
  | TLAiDeleteShapeChange    // Remove shapes
  | TLAiCreateBindingChange  // Create connections
  | TLAiUpdateBindingChange  // Modify connections
  | TLAiDeleteBindingChange  // Remove connections

// Each change includes:
interface TLAiChange {
  type: string                                 // Operation type
  description: string                          // Human-readable explanation
  // ... type-specific data (shape, binding, ids)
}
```

#### Change Application
Safe application of AI-generated changes:
```typescript
applyChange(change: TLAiChange) {
  switch (change.type) {
    case 'createShape':
      editor.createShape(change.shape)
      break
    case 'updateShape':
      editor.updateShape(change.shape)
      break
    case 'deleteShape':
      editor.deleteShape(change.shapeId)
      break
    // ... binding operations
  }
}
```

### Transformation Pipeline

#### `TldrawAiTransform` - Extensible Processing
Abstract base class for prompt/change transformations:
```typescript
abstract class TldrawAiTransform {
  constructor(public editor: Editor)
  
  // Optional transformation hooks
  transformPrompt?(prompt: TLAiPrompt): TLAiPrompt
  transformChange?(change: TLAiChange): TLAiChange  
  transformChanges?(changes: TLAiChange[]): TLAiChange[]
}
```

Use cases for transforms:
- **Content Filtering**: Remove sensitive or inappropriate content
- **Style Normalization**: Apply consistent styling to AI-generated content
- **Validation**: Ensure AI changes meet application constraints
- **Enhancement**: Add metadata or additional properties to changes

### Generation Modes

#### One-Time Generation
Complete response generated before application:
```typescript
type TldrawAiGenerateFn = (opts: {
  editor: Editor
  prompt: TLAiSerializedPrompt
  signal: AbortSignal
}) => Promise<TLAiChange[]>

// Usage pattern:
const changes = await generateFn({ editor, prompt, signal })
editor.markHistoryStoppingPoint(markId)
editor.run(() => {
  changes.forEach(change => handleChange(change))
})
```

#### Streaming Generation
Real-time change streaming for interactive experiences:
```typescript
type TldrawAiStreamFn = (opts: {
  editor: Editor  
  prompt: TLAiSerializedPrompt
  signal: AbortSignal
}) => AsyncGenerator<TLAiChange>

// Usage pattern:
editor.markHistoryStoppingPoint(markId)
for await (const change of streamFn({ editor, prompt, signal })) {
  if (!cancelled) {
    editor.run(() => handleChange(change), { history: 'record' })
  }
}
```

### Content Extraction

#### Canvas Analysis
Intelligent content extraction from the drawing canvas:
```typescript
// Shape filtering based on bounds
const relevantShapes = editor
  .getCurrentPageShapesSorted()
  .filter(shape => bounds.includes(editor.getShapeMaskedPageBounds(shape)))

// Content structure creation
const content: TLAiContent = {
  shapes: structuredClone(filteredShapes),
  bindings: getRelevantBindings(filteredShapes),
  assets: getReferencedAssets(filteredShapes)
}
```

#### Visual Context Generation
Automatic screenshot generation for visual AI models:
```typescript
private async getImage(content: TLAiContent): Promise<string | undefined> {
  if (!content.shapes.length) return undefined
  
  const result = await editor.toImage(content.shapes, {
    format: 'jpeg',
    background: false,
    darkMode: false,
    padding: 0
  })
  
  return await FileHelpers.blobToDataUrl(result.blob)
}
```

## Advanced Features

### History Integration
Proper integration with tldraw's undo/redo system:
```typescript
// Create history stopping point before AI changes
const markId = 'generating_' + uniqueId()
editor.markHistoryStoppingPoint(markId)

// Apply changes with history tracking
editor.run(() => {
  applyAiChanges(changes)
}, { 
  ignoreShapeLock: false,
  history: 'record'
})

// Rollback on errors
try {
  applyChanges()
} catch (error) {
  editor.bailToMark(markId)  // Revert all AI changes
  throw error
}
```

### Cancellation Support
Robust cancellation for long-running AI operations:
```typescript
const { promise, cancel } = prompt('Generate a flowchart')

// User can cancel at any time
cancelButton.onclick = cancel

// Automatic cleanup on component unmount
useEffect(() => {
  return () => cancel()
}, [cancel])
```

### Repeat Functionality
Debugging and refinement support:
```typescript
const { repeat } = useTldrawAi(options)

// Re-apply the last successful AI operation
const { promise } = repeat()
```

## Integration Patterns

### Basic AI Integration
```typescript
function AiDrawingApp() {
  const { prompt, cancel } = useTldrawAi({
    generate: async ({ editor, prompt, signal }) => {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          message: prompt.message,
          image: prompt.image,
          shapes: prompt.canvasContent.shapes
        }),
        signal
      })
      return await response.json()
    }
  })
  
  return (
    <div>
      <Tldraw />
      <button onClick={() => prompt('Add a red circle')}>
        Generate
      </button>
    </div>
  )
}
```

### Streaming AI Integration
```typescript
const { prompt } = useTldrawAi({
  stream: async function* ({ editor, prompt, signal }) {
    const response = await fetch('/api/ai/stream', {
      method: 'POST',
      body: JSON.stringify(prompt),
      signal
    })
    
    const reader = response.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const change = parseStreamedChange(value)
      yield change
    }
  }
})
```

### Custom Transforms
```typescript
class ValidationTransform extends TldrawAiTransform {
  transformChange(change: TLAiChange): TLAiChange {
    // Validate AI-generated content
    if (change.type === 'createShape') {
      const bounds = editor.getShapeGeometry(change.shape).bounds
      if (bounds.width > MAX_SHAPE_SIZE) {
        change.shape.props.w = MAX_SHAPE_SIZE
        change.shape.props.h = change.shape.props.h * (MAX_SHAPE_SIZE / bounds.width)
      }
    }
    return change
  }
}

const { prompt } = useTldrawAi({
  transforms: [ValidationTransform],
  generate: myGenerateFunction
})
```

### Multi-Modal Prompts
```typescript
const { prompt } = useTldrawAi({ generate: myGenerator })

// Text + image prompt
await prompt({
  message: [
    { type: 'text', text: 'Analyze this diagram and add annotations' },
    { type: 'image', mimeType: 'image/jpeg', src: screenshotDataUrl }
  ]
})
```

## Error Handling

### Graceful Failure
Comprehensive error handling throughout the AI pipeline:
```typescript
try {
  await prompt('Generate content')
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('User cancelled AI generation')
  } else {
    console.error('AI generation failed:', error)
    // Canvas automatically reverted via bailToMark
  }
}
```

### Validation and Safety
- **Change Validation**: Ensure AI changes are valid for current canvas state
- **Bounds Checking**: Prevent AI from creating invalid geometry
- **Permission Checking**: Respect shape locks and readonly modes
- **Schema Compliance**: Ensure generated shapes match current schema

## Performance Considerations

### Content Optimization
- **Selective Content**: Only include shapes within prompt bounds
- **Structured Cloning**: Efficient deep copying of shape data
- **Asset Filtering**: Only include referenced assets
- **Bounds Optimization**: Round bounds to avoid floating-point precision issues

### Memory Management
- **Change Buffering**: Efficient handling of streaming changes
- **History Cleanup**: Proper cleanup of history marks
- **Asset References**: Avoid duplicating large asset data

### Network Efficiency
- **Payload Optimization**: Minimal data sent to AI services
- **Compression**: Optional compression for large canvases
- **Cancellation**: Proper request cancellation to save bandwidth

## Security Considerations

### Content Sanitization
- **Data Scrubbing**: Remove sensitive information before sending to AI
- **Schema Validation**: Ensure AI responses conform to expected formats
- **Input Validation**: Validate all AI-generated changes before application

### Access Control
- **Permission Checking**: Respect editor permissions and locks
- **Content Filtering**: Filter inappropriate AI-generated content
- **Rate Limiting**: Prevent abuse of AI services

## Integration Examples

### OpenAI Integration
```typescript
const { prompt } = useTldrawAi({
  generate: async ({ prompt, signal }) => {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt.message },
            { type: 'image_url', image_url: { url: prompt.image } }
          ]
        }
      ],
      tools: [{ type: 'function', function: generateShapeFunction }],
      signal
    })
    
    return parseToolCalls(completion.choices[0].message.tool_calls)
  }
})
```

### Custom AI Service
```typescript
const { prompt } = useTldrawAi({
  stream: async function* ({ prompt, signal }) {
    const response = await myAiService.streamGeneration({
      text: prompt.message,
      image: prompt.image,
      context: prompt.canvasContent,
      signal
    })
    
    for await (const chunk of response) {
      yield parseAiChunk(chunk)
    }
  }
})
```

## Key Benefits

### AI-Canvas Integration
- **Visual Understanding**: AI can see and understand drawings
- **Contextual Generation**: AI responses based on existing canvas content
- **Incremental Building**: AI can modify and extend existing drawings

### Developer Experience
- **Simple API**: Single hook handles complex AI integration
- **Flexible Models**: Works with any AI service or model
- **TypeScript Support**: Full type safety for AI interactions
- **Error Recovery**: Automatic rollback on failures

### User Experience
- **Real-Time Streaming**: See AI changes as they're generated
- **Cancellation**: Users can stop AI generation at any time
- **History Integration**: AI changes fully integrated with undo/redo
- **Visual Feedback**: Clear indication of AI-generated vs user content

### Extensibility
- **Transform Pipeline**: Customize AI behavior with transforms
- **Multi-Modal Support**: Text and image inputs to AI models
- **Custom Changes**: Define application-specific change types
- **Service Agnostic**: Works with any AI provider or model