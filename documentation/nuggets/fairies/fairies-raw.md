---
title: Fairies - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - fairies
status: published
date: 12/21/2025
order: 3
---

# Fairies: raw notes

Internal research notes for the fairies.md article.

## Multi-modal context: hybrid approach

**The vision problem:**

- Screenshots provide visual context: layout, colors, text content
- Screenshots alone cannot provide exact coordinates for manipulation
- Models struggle to read pixel-precise coordinates from images
- Shapes outside viewport are invisible in screenshots

**Solution: Hybrid screenshot + JSON**
Located in prompt parts system: `templates/agent/shared/parts/`

**Screenshot generation:**
From `ScreenshotPartUtil.ts:17-51`:

```typescript
override async getPart(request: AgentRequest): Promise<ScreenshotPart> {
    const contextBounds = request.bounds
    const contextBoundsBox = Box.From(contextBounds)

    // Only shapes that fit in viewport
    const shapes = editor.getCurrentPageShapesSorted().filter((shape) => {
        const bounds = editor.getShapeMaskedPageBounds(shape)
        return contextBoundsBox.includes(bounds)
    })

    const largestDimension = Math.max(request.bounds.w, request.bounds.h)
    const scale = largestDimension > 8000 ? 8000 / largestDimension : 1

    const result = await editor.toImage(shapes, {
        format: 'jpeg',
        background: true,
        bounds: Box.From(request.bounds),
        padding: 0,
        pixelRatio: 1,
        scale,
    })
}
```

**Screenshot scaling:**

- Maximum dimension: 8000px
- Scale factor calculated: `scale = largestDimension > 8000 ? 8000 / largestDimension : 1`
- Format: JPEG (compression for token efficiency)
- Background: true (includes canvas background)

## Three-tier shape format

**Format definitions:**
From `templates/agent/shared/format/`

**BlurryShape (minimal ~6 fields):**
From `BlurryShape.ts:3-11`:

```typescript
export interface BlurryShape {
	shapeId: string
	text?: string
	type: SimpleShape['_type']
	x: number
	y: number
	w: number
	h: number
}
```

**SimpleShape (full detail ~40 fields):**
From `SimpleShape.ts:10-128`:

```typescript
// Geo shapes (rectangles, ellipses, clouds, etc)
const SimpleGeoShape = z.object({
	_type: SimpleGeoShapeTypeSchema,
	color: SimpleColor,
	fill: SimpleFillSchema,
	h: z.number(),
	note: z.string(),
	shapeId: SimpleShapeIdSchema,
	text: SimpleLabel.optional(),
	textAlign: z.enum(['start', 'middle', 'end']).optional(),
	w: z.number(),
	x: z.number(),
	y: z.number(),
})

// Text shapes
const SimpleTextShape = z.object({
	_type: z.literal('text'),
	color: SimpleColor,
	fontSize: SimpleFontSize.optional(),
	note: z.string(),
	shapeId: SimpleShapeIdSchema,
	text: SimpleLabel,
	textAlign: z.enum(['start', 'middle', 'end']).optional(),
	width: z.number().optional(),
	wrap: z.boolean().optional(),
	x: z.number(),
	y: z.number(),
})

// Arrow shapes
const SimpleArrowShape = z.object({
	_type: z.literal('arrow'),
	color: SimpleColor,
	fromId: SimpleShapeIdSchema.nullable(),
	note: z.string(),
	shapeId: SimpleShapeIdSchema,
	text: z.string().optional(),
	toId: SimpleShapeIdSchema.nullable(),
	x1: z.number(),
	x2: z.number(),
	y1: z.number(),
	y2: z.number(),
	bend: z.number().optional(),
})
```

**PeripheralShapeCluster (clustered ~5 fields):**
From `PeripheralShapesCluster.ts:1-6`:

```typescript
export interface PeripheralShapeCluster {
	bounds: BoxModel
	numberOfShapes: number
}
```

**When each format is used:**

- BlurryShape: Shapes in viewport (enough to reference by ID)
- SimpleShape: Shapes being actively edited (full properties needed)
- PeripheralShapeCluster: Shapes outside viewport (spatial awareness only)

**Clustering algorithm:**
From `convertTldrawShapesToPeripheralShapes.ts:4-54`:

```typescript
export function convertTldrawShapesToPeripheralShapes(
	editor: Editor,
	shapes: TLShape[],
	{ padding = 75 }: { padding?: number } = {}
): PeripheralShapeCluster[] {
	const expandedBounds = shapes.map((shape) => {
		return {
			shape,
			bounds: editor.getShapeMaskedPageBounds(shape)!.clone().expandBy(padding),
		}
	})

	for (let i = 0; i < expandedBounds.length; i++) {
		const item = expandedBounds[i]
		for (const group of groups) {
			if (group.bounds.includes(item.bounds)) {
				group.shapes.push(item.shape)
				group.bounds.expand(item.bounds)
				group.numberOfShapes++
				didLand = true
				break
			}
		}
		if (!didLand) {
			groups.push({
				shapes: [item.shape],
				bounds: item.bounds,
				numberOfShapes: 1,
			})
		}
	}
}
```

**Padding value:** 75px - shapes within 75px of each other are grouped together

## Coordinate offsetting system

**Chat origin tracking:**
From `TldrawAgent.ts:84-87`:

```typescript
/**
 * An atom containing the position on the page where the current chat
 * started.
 */
$chatOrigin = atom<VecModel>('chatOrigin', { x: 0, y: 0 })
```

**Origin initialization:**
From `TldrawAgent.ts:569-571`:

```typescript
reset() {
    const viewport = this.editor.getViewportPageBounds()
    this.$chatOrigin.set({ x: viewport.x, y: viewport.y })
}
```

Chat origin is set to viewport position when chat resets.

**Offset calculation:**
From `AgentHelpers.ts:35-43`:

```typescript
constructor(agent: TldrawAgent) {
    this.agent = agent
    this.editor = agent.editor
    const origin = agent.$chatOrigin.get()
    this.offset = {
        x: -origin.x,
        y: -origin.y,
    }
}
```

**Applying offset (to model):**
From `AgentHelpers.ts:65-70`:

```typescript
applyOffsetToVec(position: VecModel): VecModel {
    return {
        x: position.x + this.offset.x,
        y: position.y + this.offset.y,
    }
}
```

**Removing offset (from model):**
From `AgentHelpers.ts:75-80`:

```typescript
removeOffsetFromVec(position: VecModel): VecModel {
    return {
        x: position.x - this.offset.x,
        y: position.y - this.offset.y,
    }
}
```

**Offset for shapes:**
From `AgentHelpers.ts:109-127`:

```typescript
applyOffsetToShape(shape: SimpleShape): SimpleShape {
    if ('x1' in shape) {
        return {
            ...shape,
            x1: shape.x1 + this.offset.x,
            y1: shape.y1 + this.offset.y,
            x2: shape.x2 + this.offset.x,
            y2: shape.y2 + this.offset.y,
        }
    }
    if ('x' in shape) {
        return {
            ...shape,
            x: shape.x + this.offset.x,
            y: shape.y + this.offset.y,
        }
    }
    return shape
}
```

Handles both point-based shapes (x, y) and line-based shapes (x1, y1, x2, y2).

## Coordinate rounding system

**Rounding shapes before sending to model:**
From `AgentHelpers.ts:296-313`:

```typescript
roundShape(shape: SimpleShape): SimpleShape {
    if ('x1' in shape) {
        shape = this.roundProperty(shape, 'x1')
        shape = this.roundProperty(shape, 'y1')
        shape = this.roundProperty(shape, 'x2')
        shape = this.roundProperty(shape, 'y2')
    } else if ('x' in shape) {
        shape = this.roundProperty(shape, 'x')
        shape = this.roundProperty(shape, 'y')
    }

    if ('w' in shape) {
        shape = this.roundProperty(shape, 'w')
        shape = this.roundProperty(shape, 'h')
    }

    return shape
}
```

**Tracking rounding diffs:**
From `AgentHelpers.ts:360-365`:

```typescript
roundAndSaveNumber(number: number, key: string): number {
    const roundedNumber = Math.round(number)
    const diff = roundedNumber - number
    this.roundingDiffMap.set(key, diff)
    return roundedNumber
}
```

**Restoring original precision:**
From `AgentHelpers.ts:373-377`:

```typescript
unroundAndRestoreNumber(number: number, key: string): number {
    const diff = this.roundingDiffMap.get(key)
    if (diff === undefined) return number
    return number + diff
}
```

**Storage map:**
From `AgentHelpers.ts:60`:

```typescript
roundingDiffMap = new Map<string, number>()
```

Key format: `${shape.shapeId}_${property}` (e.g., "rectangle-1_x")

**Why rounding matters:**
Models perform better with small integers than large decimals. Coordinates like (47, 109) are easier for models than (12847.2341, -3291.8472).

## Utility architecture

**Two parallel systems:**

1. Prompt parts - What the model sees
2. Action utilities - What the model can do

**Prompt part registration:**
From `AgentUtils.ts:54-80`:

```typescript
export const PROMPT_PART_UTILS = [
	// Model
	SystemPromptPartUtil,
	ModelNamePartUtil,

	// Request
	MessagesPartUtil,
	DataPartUtil,
	ContextItemsPartUtil,

	// Viewport
	ScreenshotPartUtil,
	ViewportBoundsPartUtil,

	// Shapes
	BlurryShapesPartUtil,
	PeripheralShapesPartUtil,
	SelectedShapesPartUtil,

	// History
	ChatHistoryPartUtil,
	UserActionHistoryPartUtil,
	TodoListPartUtil,

	// Metadata
	TimePartUtil,
]
```

**Action utility registration:**
From `AgentUtils.ts:88-127`:

```typescript
export const AGENT_ACTION_UTILS = [
	// Communication
	MessageActionUtil,

	// Planning
	ThinkActionUtil,
	ReviewActionUtil,
	AddDetailActionUtil,
	TodoListActionUtil,
	SetMyViewActionUtil,

	// Individual shapes
	CreateActionUtil,
	DeleteActionUtil,
	UpdateActionUtil,
	LabelActionUtil,
	MoveActionUtil,

	// Groups of shapes
	PlaceActionUtil,
	BringToFrontActionUtil,
	SendToBackActionUtil,
	RotateActionUtil,
	ResizeActionUtil,
	AlignActionUtil,
	DistributeActionUtil,
	StackActionUtil,
	ClearActionUtil,

	// Drawing
	PenActionUtil,

	// External APIs
	RandomWikipediaArticleActionUtil,
	CountryInfoActionUtil,
	CountShapesActionUtil,

	// Internal (required)
	UnknownActionUtil,
]
```

**PromptPartUtil base class:**
From `PromptPartUtil.ts:9-93`:

```typescript
export abstract class PromptPartUtil<T extends BasePromptPart = BasePromptPart> {
	static type: string

	protected agent?: TldrawAgent
	protected editor?: Editor

	/**
	 * Get some data to add to the prompt.
	 */
	abstract getPart(request: AgentRequest, helpers: AgentHelpers): Promise<T> | T

	/**
	 * Get priority for this prompt part to determine its position in the prompt.
	 * Lower numbers have higher priority.
	 */
	getPriority(_part: T): number {
		return 0
	}

	/**
	 * Build an array of text or image content for this prompt part.
	 */
	buildContent(_part: T): string[] {
		return []
	}

	/**
	 * Build an array of messages to send to the model.
	 */
	buildMessages(part: T): AgentMessage[] {
		// Converts content to messages with appropriate type (text/image)
	}

	/**
	 * Build a system message that gets concatenated with the other system messages.
	 */
	buildSystemPrompt(_part: T): string | null {
		return null
	}
}
```

**AgentActionUtil base class:**
From `AgentActionUtil.ts:9-68`:

```typescript
export abstract class AgentActionUtil<T extends BaseAgentAction = BaseAgentAction> {
	static type: string

	protected agent?: TldrawAgent
	protected editor?: Editor

	/**
	 * Get a schema to use for the model's response.
	 */
	getSchema(): z.ZodType<T> | null {
		return null
	}

	/**
	 * Get information about the action to display within the chat history UI.
	 */
	getInfo(_action: Streaming<T>): Partial<ChatHistoryInfo> | null {
		return {}
	}

	/**
	 * Transforms the action before saving it to chat history.
	 * Useful for sanitizing or correcting actions.
	 * @returns The transformed action, or null to reject the action
	 */
	sanitizeAction(action: Streaming<T>, _helpers: AgentHelpers): Streaming<T> | null {
		return action
	}

	/**
	 * Apply the action to the editor.
	 * Any changes that happen during this function will be displayed as a diff.
	 */
	applyAction(_action: Streaming<T>, _helpers: AgentHelpers): Promise<void> | void {
		// Do nothing by default
	}

	/**
	 * Whether the action gets saved to history.
	 */
	savesToHistory(): boolean {
		return true
	}

	/**
	 * Build a system message that gets concatenated with the other system messages.
	 */
	buildSystemPrompt(): string | null {
		return null
	}
}
```

**Example: BlurryShapesPartUtil:**
From `BlurryShapesPartUtil.ts:20-66`:

```typescript
override getPart(request: AgentRequest, helpers: AgentHelpers): BlurryShapesPart {
    const shapes = editor.getCurrentPageShapesSorted()
    const contextBoundsBox = Box.From(request.bounds)

    // Get all shapes within the agent's viewport
    const shapesInBounds = shapes.filter((shape) => {
        const bounds = editor.getShapeMaskedPageBounds(shape)
        return contextBoundsBox.includes(bounds)
    })

    // Convert the shapes to the blurry shape format
    const blurryShapes = shapesInBounds
        .map((shape) => convertTldrawShapeToBlurryShape(editor, shape))
        .filter((s) => s !== null)

    // Apply the offset and round the blurry shapes
    const normalizedBlurryShapes = blurryShapes.map((shape) => {
        const bounds = helpers.roundBox(
            helpers.applyOffsetToBox({
                x: shape.x,
                y: shape.y,
                w: shape.w,
                h: shape.h,
            })
        )
        return { ...shape, x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h }
    })

    return {
        type: 'blurryShapes',
        shapes: normalizedBlurryShapes,
    }
}

override buildContent({ shapes }: BlurryShapesPart): string[] {
    if (!shapes || shapes.length === 0) return ['There are no shapes in your view at the moment.']
    return [`These are the shapes you can currently see:`, JSON.stringify(shapes)]
}
```

## Sanitization layer

**Purpose:** Catch and correct model errors before they affect the canvas

**Sanitization methods in AgentHelpers:**
From `AgentHelpers.ts`:

```typescript
// Ensure shape ID is unique by incrementing numbers
ensureShapeIdIsUnique(id: SimpleShapeId): SimpleShapeId {
    let newId = id
    let existingShape = editor.getShape(`shape:${newId}`)
    while (existingShape) {
        const match = /^.*(\d+)$/.exec(newId)?.[1]
        if (match) {
            newId = newId.replace(/(\d+)(?=\D?)$/, (m: string) => (+m + 1).toString())
        } else {
            newId = `${newId}-1`
        }
        existingShape = editor.getShape(`shape:${newId}`)
    }

    // Track transformation for future references
    if (id !== newId) {
        this.shapeIdMap.set(id, newId)
    }

    return newId
}

// Ensure shape ID refers to a real shape
ensureShapeIdExists(id: SimpleShapeId): SimpleShapeId | null {
    // Check transformation map first
    const existingId = this.shapeIdMap.get(id)
    if (existingId) return existingId

    // Check if shape exists
    const existingShape = editor.getShape(createShapeId(id))
    if (existingShape) return id

    // Otherwise reject
    return null
}

// Type validation
ensureValueIsNumber(value: any): number | null {
    if (typeof value === 'number') return value

    if (typeof value === 'string') {
        const parsedValue = parseFloat(value)
        if (isNaN(parsedValue)) return null
        return parsedValue
    }

    return null
}

ensureValueIsBoolean(value: any): boolean | null {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value > 0
    if (typeof value === 'string') return value !== 'false'
    return null
}
```

**Example sanitization in CreateActionUtil:**
From `CreateActionUtil.ts:36-70`:

```typescript
override sanitizeAction(action: Streaming<CreateAction>, helpers: AgentHelpers) {
    if (!action.complete) return action

    const { shape } = action

    // Ensure the created shape has a unique ID
    shape.shapeId = helpers.ensureShapeIdIsUnique(shape.shapeId)

    // If the shape is an arrow, ensure the from and to IDs are real shapes
    if (shape._type === 'arrow') {
        if (shape.fromId) {
            shape.fromId = helpers.ensureShapeIdExists(shape.fromId)
        }
        if (shape.toId) {
            shape.toId = helpers.ensureShapeIdExists(shape.toId)
        }
        if ('x1' in shape) {
            shape.x1 = helpers.ensureValueIsNumber(shape.x1) ?? 0
        }
        if ('y1' in shape) {
            shape.y1 = helpers.ensureValueIsNumber(shape.y1) ?? 0
        }
        if ('x2' in shape) {
            shape.x2 = helpers.ensureValueIsNumber(shape.x2) ?? 0
        }
        if ('y2' in shape) {
            shape.y2 = helpers.ensureValueIsNumber(shape.y2) ?? 0
        }
        if ('bend' in shape) {
            shape.bend = helpers.ensureValueIsNumber(shape.bend) ?? 0
        }
    }

    return action
}
```

**Sanitization is critical because:**

- Models reference non-existent shape IDs
- Models output strings where numbers expected
- Models provide coordinates out of bounds
- Models duplicate IDs
- Models make type errors (string vs number)

**ID transformation tracking:**
From `AgentHelpers.ts:54`:

```typescript
shapeIdMap = new Map<string, string>()
```

If model creates shape "box" but ID exists, rename to "box-1" and store mapping so model can continue referring to "box".

## Multi-turn loop system

**Core loop structure:**
From `TldrawAgent.ts:304-345`:

```typescript
async prompt(input: AgentInput) {
    const request = this.getFullRequestFromInput(input)

    // Submit the request to the agent
    await this.request(request)

    // After the request is handled, check if there are any outstanding todo items or requests
    let scheduledRequest = this.$scheduledRequest.get()
    const todoItemsRemaining = this.$todoList.get().filter((item) => item.status !== 'done')

    if (!scheduledRequest) {
        // If there are no outstanding todo items or requests, finish
        if (todoItemsRemaining.length === 0 || !this.cancelFn) {
            return
        }

        // If there are outstanding todo items, schedule a request
        scheduledRequest = {
            messages: request.messages,
            contextItems: request.contextItems,
            bounds: request.bounds,
            modelName: request.modelName,
            selectedShapes: request.selectedShapes,
            data: request.data,
            type: 'todo',
        }
    }

    // Add the scheduled request to chat history
    const resolvedData = await Promise.all(scheduledRequest.data)
    this.$chatHistory.update((prev) => [...prev, {
        type: 'continuation',
        data: resolvedData,
    }])

    // Handle the scheduled request (recursive)
    this.$scheduledRequest.set(null)
    await this.prompt(scheduledRequest)
}
```

**Three continuation mechanisms:**

**1. Scheduled requests:**
From `TldrawAgent.ts:407-431`:

```typescript
schedule(input: AgentInput) {
    const scheduledRequest = this.$scheduledRequest.get()

    // If there's no request scheduled yet, schedule one
    if (!scheduledRequest) {
        this.setScheduledRequest(input)
        return
    }

    const request = this.getPartialRequestFromInput(input)

    this.setScheduledRequest({
        type: 'schedule',

        // Append to properties where possible
        messages: [...scheduledRequest.messages, ...(request.messages ?? [])],
        contextItems: [...scheduledRequest.contextItems, ...(request.contextItems ?? [])],
        selectedShapes: [...scheduledRequest.selectedShapes, ...(request.selectedShapes ?? [])],
        data: [...scheduledRequest.data, ...(request.data ?? [])],

        // Override specific properties
        bounds: request.bounds ?? scheduledRequest.bounds,
        modelName: request.modelName ?? scheduledRequest.modelName,
    })
}
```

**2. Todo list:**
From `TodoListActionUtil.ts:31-49`:

```typescript
override applyAction(action: Streaming<TodoListAction>) {
    if (!action.complete) return
    if (!this.agent) return

    const todoItem = {
        id: action.id,
        status: action.status,
        text: action.text,
    }

    this.agent.$todoList.update((todoItems) => {
        const index = todoItems.findIndex((item) => item.id === action.id)
        if (index !== -1) {
            return [...todoItems.slice(0, index), todoItem, ...todoItems.slice(index + 1)]
        } else {
            return [...todoItems, todoItem]
        }
    })
}
```

**3. Data passing:**
From `RandomWikipediaArticleActionUtil.ts:34-44`:

```typescript
override async applyAction(
    action: Streaming<RandomWikipediaArticleAction>,
    _helpers: AgentHelpers
) {
    // Wait until the action has finished streaming
    if (!action.complete) return
    if (!this.agent) return

    const article = await fetchRandomWikipediaArticle()
    this.agent.schedule({ data: [article] })
}
```

**Loop termination conditions:**

1. No scheduled request AND
2. No incomplete todo items

## Streaming and real-time feedback

**Streaming from worker:**
From `AgentService.ts:50-152`:

```typescript
async function* streamActions(
	model: LanguageModel,
	prompt: AgentPrompt
): AsyncGenerator<Streaming<AgentAction>> {
	messages.push({
		role: 'assistant',
		content: '{"actions": [{"_type":',
	})

	const { textStream } = streamText({
		model,
		system: systemPrompt,
		messages,
		maxOutputTokens: 8192,
		temperature: 0,
	})

	let buffer = canForceResponseStart ? '{"actions": [{"_type":' : ''
	let cursor = 0
	let maybeIncompleteAction: AgentAction | null = null

	for await (const text of textStream) {
		buffer += text

		const partialObject = closeAndParseJson(buffer)
		if (!partialObject) continue

		const actions = partialObject.actions
		if (!Array.isArray(actions)) continue
		if (actions.length === 0) continue

		// If the events list is ahead of the cursor, we know we've completed the current event
		if (actions.length > cursor) {
			const action = actions[cursor - 1]
			if (action) {
				yield {
					...action,
					complete: true,
					time: Date.now() - startTime,
				}
				maybeIncompleteAction = null
			}
			cursor++
		}

		// Now let's check the (potentially new) current event
		const action = actions[cursor - 1]
		if (action) {
			if (!maybeIncompleteAction) {
				startTime = Date.now()
			}

			maybeIncompleteAction = action

			// Yield the potentially incomplete event
			yield {
				...action,
				complete: false,
				time: Date.now() - startTime,
			}
		}
	}

	// Complete final action if incomplete
	if (maybeIncompleteAction) {
		yield {
			...maybeIncompleteAction,
			complete: true,
			time: Date.now() - startTime,
		}
	}
}
```

**JSON parsing for incomplete streams:**
From `closeAndParseJson.ts:1-72`:

```typescript
/**
 * JSON helper. Given a potentially incomplete JSON string, return the parsed object.
 * The string might be missing closing braces, brackets, or other characters like quotation marks.
 */
export function closeAndParseJson(string: string) {
	const stackOfOpenings = []

	// Track openings and closings
	let i = 0
	while (i < string.length) {
		const char = string[i]
		const lastOpening = stackOfOpenings.at(-1)

		if (char === '"') {
			// Check if this quote is escaped
			if (i > 0 && string[i - 1] === '\\') {
				i++
				continue
			}

			if (lastOpening === '"') {
				stackOfOpenings.pop()
			} else {
				stackOfOpenings.push('"')
			}
		}

		if (lastOpening === '"') {
			i++
			continue
		}

		if (char === '{' || char === '[') {
			stackOfOpenings.push(char)
		}

		if (char === '}' && lastOpening === '{') {
			stackOfOpenings.pop()
		}

		if (char === ']' && lastOpening === '[') {
			stackOfOpenings.pop()
		}

		i++
	}

	// Now close all unclosed openings
	for (let i = stackOfOpenings.length - 1; i >= 0; i--) {
		const opening = stackOfOpenings[i]
		if (opening === '{') string += '}'
		if (opening === '[') string += ']'
		if (opening === '"') string += '"'
	}

	try {
		return JSON.parse(string)
	} catch (_e) {
		return null
	}
}
```

**Action yielding pattern:**
Each action is yielded twice:

1. First time: `complete: false` (still streaming, partial data)
2. Second time: `complete: true` (fully received)

**Reverting incomplete actions:**
From `TldrawAgent.ts:746-763`:

```typescript
for await (const action of streamAgent({ prompt, signal })) {
	editor.run(() => {
		const actionUtil = agent.getAgentActionUtil(action._type)

		// Sanitize the agent's action
		const transformedAction = actionUtil.sanitizeAction(action, helpers)
		if (!transformedAction) {
			incompleteDiff = null
			return
		}

		// If there was a diff from an incomplete action, revert it
		if (incompleteDiff) {
			const inversePrevDiff = reverseRecordsDiff(incompleteDiff)
			editor.store.applyDiff(inversePrevDiff)
		}

		// Apply the action to the app and editor
		const { diff, promise } = agent.act(transformedAction, helpers)

		// Save diff if action is incomplete
		if (transformedAction.complete) {
			incompleteDiff = null
		} else {
			incompleteDiff = diff
		}
	})
}
```

## Architecture patterns

**Reactive state management:**
From `TldrawAgent.ts:70-115`:

```typescript
/**
 * An atom containing the currently active request.
 */
$activeRequest = atom<AgentRequest | null>('activeRequest', null)

/**
 * An atom containing the next request that the agent has scheduled for itself.
 */
$scheduledRequest = atom<AgentRequest | null>('scheduledRequest', null)

/**
 * An atom containing the agent's chat history.
 */
$chatHistory = atom<ChatHistoryItem[]>('chatHistory', [])

/**
 * An atom containing the position on the page where the current chat started.
 */
$chatOrigin = atom<VecModel>('chatOrigin', { x: 0, y: 0 })

/**
 * An atom containing the agent's todo list.
 */
$todoList = atom<TodoItem[]>('todoList', [])

/**
 * An atom containing document changes made by the user since the previous request.
 */
$userActionHistory = atom<RecordsDiff<TLRecord>[]>('userActionHistory', [])

/**
 * An atom containing currently selected context items.
 */
$contextItems = atom<ContextItem[]>('contextItems', [])

/**
 * An atom containing the model name that the user has selected.
 */
$modelName = atom<AgentModelName>('modelName', DEFAULT_MODEL_NAME)
```

All state stored in reactive atoms from `@tldraw/state`.

**Persistence:**
From `TldrawAgent.ts:131-135`:

```typescript
persistAtomInLocalStorage(this.$chatHistory, `${id}:chat-history`)
persistAtomInLocalStorage(this.$chatOrigin, `${id}:chat-origin`)
persistAtomInLocalStorage(this.$modelName, `${id}:model-name`)
persistAtomInLocalStorage(this.$todoList, `${id}:todo-items`)
persistAtomInLocalStorage(this.$contextItems, `${id}:context-items`)
```

**User action tracking:**
From `TldrawAgent.ts:591-636`:

```typescript
private startRecordingUserActions() {
    const cleanUpCreate = editor.sideEffects.registerAfterCreateHandler(
        'shape',
        (shape, source) => {
            if (source !== 'user') return
            if (this.isActing) return
            const change = {
                added: { [shape.id]: shape },
                updated: {},
                removed: {},
            }
            this.$userActionHistory.update((prev) => [...prev, change])
        }
    )

    const cleanUpDelete = editor.sideEffects.registerAfterDeleteHandler(
        'shape',
        (shape, source) => {
            if (source !== 'user') return
            if (this.isActing) return
            const change = {
                added: {},
                updated: {},
                removed: { [shape.id]: shape },
            }
            this.$userActionHistory.update((prev) => [...prev, change])
        }
    )

    const cleanUpChange = editor.sideEffects.registerAfterChangeHandler(
        'shape',
        (prev, next, source) => {
            if (source !== 'user') return
            if (this.isActing) return
            const change = {
                added: {},
                updated: { [prev.id]: [prev, next] },
                removed: {},
            }
            this.$userActionHistory.update((prev) => [...prev, change])
        }
    )
}
```

Tracks user edits between agent turns so model can see what changed.

**isActing flag:**
From `TldrawAgent.ts:585`:

```typescript
/**
 * Whether the agent is currently acting on the editor or not.
 * This flag is used to prevent agent actions from being recorded as user actions.
 */
private isActing = false
```

Prevents agent's own actions from being recorded as user actions.

## Key files

**Main agent class:**
`templates/agent/client/agent/TldrawAgent.ts` (983 lines)

- Core agent orchestration
- Request handling and multi-turn loops
- State management with reactive atoms
- Action execution and history tracking

**Coordinate transformation helpers:**
`templates/agent/shared/AgentHelpers.ts` (503 lines)

- Offset calculations (applyOffsetToVec, removeOffsetFromVec)
- Coordinate rounding with diff tracking
- Shape ID validation and uniqueness
- Type validation (ensureValueIsNumber, etc)
- Sanitization helpers

**Utility registry:**
`templates/agent/shared/AgentUtils.ts` (150 lines)

- PROMPT_PART_UTILS array (15 utilities)
- AGENT_ACTION_UTILS array (27 utilities)
- Factory functions to instantiate utilities

**Shape format definitions:**

- `templates/agent/shared/format/BlurryShape.ts` (12 lines) - Minimal viewport format
- `templates/agent/shared/format/SimpleShape.ts` (153 lines) - Full detail format
- `templates/agent/shared/format/PeripheralShapesCluster.ts` (7 lines) - Out-of-viewport format

**Format converters:**

- `templates/agent/shared/format/convertTldrawShapeToBlurryShape.ts` - TLShape → BlurryShape
- `templates/agent/shared/format/convertTldrawShapesToPeripheralShapes.ts` - TLShape[] → clusters
- `templates/agent/shared/format/convertSimpleShapeToTldrawShape.ts` - SimpleShape → TLShape
- `templates/agent/shared/format/convertTldrawShapeToSimpleShape.ts` - TLShape → SimpleShape

**Prompt parts (what model sees):**

- `templates/agent/shared/parts/ScreenshotPartUtil.ts` - JPEG viewport capture
- `templates/agent/shared/parts/BlurryShapesPartUtil.ts` - Shapes in viewport
- `templates/agent/shared/parts/PeripheralShapesPartUtil.ts` - Shapes outside viewport
- `templates/agent/shared/parts/PromptPartUtil.ts` - Base class

**Action utilities (what model can do):**

- `templates/agent/shared/actions/AgentActionUtil.ts` - Base class
- `templates/agent/shared/actions/CreateActionUtil.ts` - Create shapes
- `templates/agent/shared/actions/AddDetailActionUtil.ts` - Schedule follow-up
- `templates/agent/shared/actions/TodoListActionUtil.ts` - Manage todo items
- `templates/agent/shared/actions/RandomWikipediaArticleActionUtil.ts` - External API + data passing

**Streaming infrastructure:**

- `templates/agent/worker/worker.ts` - Cloudflare worker entry point
- `templates/agent/worker/do/AgentService.ts` - Model streaming orchestration
- `templates/agent/worker/do/closeAndParseJson.ts` - Incomplete JSON parsing

## Performance and token optimization

**Screenshot constraints:**

- Maximum dimension: 8000px
- Format: JPEG (lossy compression)
- No shapes = no screenshot sent

**Token savings from three-tier format:**

- BlurryShape: ~6 fields × 20 shapes = ~120 fields
- SimpleShape: ~40 fields × 20 shapes = ~800 fields
- Saving: ~85% reduction for viewport shapes

**Peripheral clustering:**

- Padding: 75px
- Single cluster can represent hundreds of shapes
- Example: "47 shapes to the north" vs sending all 47 shapes

**Coordinate rounding:**

- Reduces decimal noise: `12847.234` → `12847`
- Smaller JSON payloads
- Easier for model to process

**Integer offsetting benefits:**

- Large coordinate: (12847, -3291) - harder for model
- Offset coordinate: (47, 109) - easier for model
- Model accuracy improvement (not quantified in code)

## Edge cases and error handling

**Cancellation:**
From `TldrawAgent.ts:722-800`:

```typescript
const controller = new AbortController()
const signal = controller.signal

const cancel = () => {
	cancelled = true
	controller.abort('Cancelled by user')
}
```

Uses AbortController to cancel in-flight requests.

**Error boundaries:**
From `TldrawAgent.ts:786-791`:

```typescript
catch (e) {
    if (e === 'Cancelled by user' || (e instanceof Error && e.name === 'AbortError')) {
        return
    }
    agent.onError(e)
}
```

**Shape lock handling:**
From `TldrawAgent.ts:779-782`:

```typescript
editor.run(
	() => {
		// action execution
	},
	{
		ignoreShapeLock: false,
		history: 'ignore',
	}
)
```

Respects shape locks, doesn't add to undo/redo history.

**Incomplete action handling:**
If model stops mid-action or changes direction, incomplete diff is reverted before applying new action.

**Shape ID collision:**
Auto-increment numeric suffix until unique ID found, track mapping for future references.

## Constants and configuration

**Peripheral shape clustering:**

- Padding: 75px (from `PeripheralShapesPartUtil.ts:40`)

**Screenshot scaling:**

- Max dimension: 8000px (from `ScreenshotPartUtil.ts:37`)

**Model settings:**
From `AgentService.ts:72-73`:

- maxOutputTokens: 8192
- temperature: 0 (deterministic)

**Action streaming:**

- Format: Server-Sent Events (SSE)
- Prefix: `data: ` (from worker streaming)
- Complete actions yield twice (incomplete + complete)
