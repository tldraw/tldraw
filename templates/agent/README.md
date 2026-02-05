# tldraw agent

This starter kit demonstrates how to build an agent that can manipulate the [tldraw](https://github.com/tldraw/tldraw) canvas.

A chat panel on the right side of the screen lets users communicate with the agent, add context, and see chat history.

## Environment setup

Create a `.dev.vars` file in the root directory and add API keys for any model providers you want to use.

```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

We recommend using Anthropic for best results. Get your API key from the [Anthropic dashboard](https://console.anthropic.com/settings/keys).

## Local development

Install dependencies with `yarn` or `npm install`.

Run the development server with `yarn dev` or `npm run dev`.

Open `http://localhost:5173/` in your browser to see the app.

## Agent overview

With its default configuration, the agent can perform the following actions:

- Create, update and delete shapes.
- Draw freehand pen strokes.
- Use higher-level operations on multiple shapes at once: Rotate, resize, align, distribute, stack and reorder shapes.
- Write out its thinking and send messages to the user.
- Keep track of its task by writing and updating a todo list.
- Move its viewport to look at different parts of the canvas.
- Count shapes matching a given expression.
- Schedule further work and reviews to be carried out in follow-up requests.
- Call example external APIs: Looking up country information.

To make decisions on what to do, we send the agent information from various sources:

- The user's message.
- The user's current selection of shapes.
- What the user can currently see on their screen.
- Any additional context that the user has provided, such as specific shapes or a particular position or area on the canvas.
- Actions the user has recently taken.
- A screenshot of the agent's current view of the canvas.
- A simplified format of all shapes within the agent's viewport.
- Information on clusters of shapes outside the agent's viewport.
- The history of the current session, including the user's messages and all the agent's actions.
- Lints identifying potential issues with shapes on the canvas.

## Use the agent programmatically

Aside from using the chat panel UI, you can also prompt the agent programmatically.

The simplest way is to call the `prompt()` method to start an agentic loop. The agent continues until it finishes the task.

```ts
// Inside a component wrapped by TldrawAgentAppProvider
const agent = useAgent()
agent.prompt('Draw a cat')
```

You can specify further details about the request as an `AgentInput` object:

```ts
agent.prompt({
	message: 'Draw a cat in this area',
	bounds: { x: 0, y: 0, w: 300, h: 400 },
})
```

The `TldrawAgent` class has additional methods:

- `agent.cancel()` - Cancel the agent's current task.
- `agent.reset()` - Reset the agent's chat and memory.
- `agent.request(input)` - Send a single request to the agent and handle its response _without_ entering into an agentic loop.

## Architecture overview

The agent starter is organized into three main areas:

- **`client/`** - React components, agent logic, and utils that run in the browser
- **`worker/`** - Cloudflare Worker that handles model requests and prompt building
- **`shared/`** - Types, schemas, and utilities shared between client and worker

## Customize the agent

The agent's behavior is defined in `client/modes/AgentModeDefinitions.ts`. The `AGENT_MODE_DEFINITIONS` array contains mode definitions. Each mode has two arrays:

- `parts` determine what the agent can **see**.
- `actions` determine what the agent can **do**.

Add, edit or remove an entry in either array to change what the agent can see or do in a given mode.

### Mode system

The agent uses a **mode system** to control what parts and actions it has access to at any given time. Modes are defined in `client/modes/AgentModeDefinitions.ts`.

The default `working` mode includes all standard capabilities. You can create additional modes with different subsets of parts and actions.

Modes can be transitioned between over the course of a prompt depending on the behavior you desire. Call `agent.mode.setMode(modeType)` to change modes. To control the lifecycles of different modes, you can optionally implement any desired mode lifecycle hooks in `client/modes/AgentModeChart.ts`. You have access to:

- `onEnter(agent, fromMode)` - runs when you enter a mode
- `onExit(agent, toMode)` - runs when you exit a mode
- `onPromptStart(agent, request)` - runs when a prompt commences, either because a user has prompted it or because it has entered another step in its agentic loop
- `onPromptEnd(agent, request)` - runs when a prompt ends
- `onPromptCancel(agent, request)` - runs when a prompt is canceled

## Change what the agent can see

**Change what the agent can see by adding, editing or removing a prompt part.**

Prompt parts assemble and build the prompt that we give to the model, with each util adding a different piece of information. This includes the user's message, the model name, the system prompt, chat history and more.

This example shows how to let the model see what the current time is.

First, define a prompt part type in `shared/schema/PromptPartDefinitions.ts`:

```ts
export interface TimePart extends BasePromptPart<'time'> {
	time: string
}
```

Next, create a prompt part util in `client/parts/`:

```ts
export const TimePartUtil = registerPromptPartUtil(
	class TimePartUtil extends PromptPartUtil<TimePart> {
		static override type = 'time' as const

		override getPart(): TimePart {
			return {
				type: 'time',
				time: new Date().toLocaleTimeString(),
			}
		}
	}
)
```

The `getPart` method gather any data needed to construct the prompt. It can take `(request: AgentRequest, helpers: AgentHelpers)` parameters for access to the current request and helper methods.

Then, back in `shared/schema/PromptPartDefinition.ts`, create the definition for that prompt part.

```ts
export const TimePartDefinition: PromptPartDefinition<TimePart> = {
	type: 'time',
	priority: -100,
	buildContent({ time }: TimePart) {
		return [`The user's current time is: ${time}`]
	},
}
```

The prompt part definition is used by the worker to turn prompt parts into messages sent to the model. Override `priority` to control what order the part should be added in the messages. Override `buildContent` to control how the data is turned into a message for the model.

There are other methods available on the `PromptPartDefinition` interface that you can override for more granular control.

- `getModelName` - Determine which AI model to use.
- `buildMessages` - Manually override how prompt messages are constructed from the prompt part.

**Enable the prompt part**

To enable the prompt part, import its util in `client/modes/AgentModeDefinitions.ts` and add its type to a mode's `parts` array. It's important to make sure you import it here and use its `type` field, instead of using the type string literal. This is to ensure the util properly self-registers.

```ts
import { TimePartUtil } from '../parts/TimePartUtil'

// Then in the mode definition:
parts: [
	// ... other parts
	TimePartUtil.type,
]
```

## Change what the agent can do

**Change what the agent can do by adding, editing or removing an agent action.**

Agent action utils define the actions the agent can perform. Each `AgentActionUtil` adds a different capability.

This example shows how to allow the agent to clear the screen.

First, define an agent action schema in `shared/schema/AgentActionSchemas.ts`:

```ts
export const ClearAction = z
	// All agent actions must have a _type field
	// The underscore encourages the model to put this field first
	.object({
		_type: z.literal('clear'),
	})
	// A title and description tell the model what the action does
	.meta({
		title: 'Clear',
		description: 'The agent deletes all shapes on the canvas.',
	})

// Infer the action's type
export type ClearAction = z.infer<typeof ClearAction>
```

Then, create an agent action util in `client/actions/`:

```ts
export const ClearActionUtil = registerActionUtil(
	class ClearActionUtil extends AgentActionUtil<ClearAction> {
		static override type = 'clear' as const

		override applyAction(action: Streaming<ClearAction>) {
			// Don't do anything until the action has finished streaming
			if (!action.complete) return

			// Delete all shapes on the page
			const { editor } = this
			const shapes = editor.getCurrentPageShapes()
			editor.deleteShapes(shapes)
		}
	}
)
```

The `applyAction` method executes the action. It can take a second `helpers: AgentHelpers` parameter for access to helper methods.

Override these methods on `AgentActionUtil` for more control:

- `getInfo` - Determine how the action gets displayed in the chat panel UI.
- `savesToHistory` - Control whether actions get saved to chat history or not.
- `sanitizeAction` - Sanitize the action before saving it to history and applying it. More details on [sanitization](#sanitize-data-received-from-the-model) below.

**Enable the agent action part**

To enable the agent action, import its util in `client/modes/AgentModeDefinitions.ts` and add its type to a mode's `actions` array.

```ts
import { ClearActionUtil } from '../actions/ClearActionUtil'

// Then in the mode definition:
actions: [
	// ... other actions
	ClearActionUtil.type,
]
```

## Change how actions appear in chat history

Configure the icon and description of an action in the chat panel using the `getInfo()` method.

```ts
override getInfo() {
	return {
		icon: 'trash' as const,
		description: 'Cleared the canvas',
	}
}
```

You can make an action collapsible by adding a `summary` property.

```ts
override getInfo() {
	return {
		summary: 'Cleared the canvas',
		description: 'After much consideration, the agent decided to clear the canvas',
	}
}
```

To customize an action's appearance via CSS, you can define style for the `agent-action-type-{TYPE}` class where `{TYPE}` is the type of the action.

```css
.agent-action-type-clear {
	color: red;
}
```

## Managers

Managers are classes that encapsulate specific concerns and extend the functionality of `TldrawAgent` or `TldrawAgentApp`. Each manager handles a single responsibility—like chat history, model selection, or context management—and exposes methods to interact with that state.

Managers are available as properties on the agent instance (e.g., `agent.chat`, `agent.modelName`, `agent.context`). To create a custom manager, extend `BaseAgentManager` or `BaseAgentAppManager` and add it to the agent in `client/agent/TldrawAgent.ts`.

## Registering `PromptPartUtil`s and `AgentActionUtil`s

Utils use a **self-registration pattern**. When you create a new `PromptPartUtil` or `AgentActionUtil`, wrap it with a registration function:

```ts
export const MyPartUtil = registerPromptPartUtil(
	class MyPartUtil extends PromptPartUtil<MyPart> {
		// ...
	}
)
```

This pattern ensures utils are discovered automatically when their modules are imported in `AgentModeDefinitions.ts`.

### Mode-scoped actions

Different modes can implement actions with the same `_type`. This allows modes to have different behavior for the same action type without requiring globally unique action names.

For example, a "team-member" mode and a "solo" mode might both have a `mark-task-done` action, but with different implementations. The system automatically resolves the correct `AgentActionUtil` and schema based on the current mode.

**Registering a mode-specific action util:**

Use the `forModes` option when registering a util:

```ts
// client/actions/MarkSoloTaskDoneActionUtil.ts
// Default implementation (used when no mode-specific binding exists)
export const MarkSoloTaskDoneActionUtil = registerActionUtil(
	class MarkSoloTaskDoneActionUtil extends AgentActionUtil<MarkSoloTaskDoneAction> {
		static override type = 'mark-task-done' as const
		override applyAction(action: Streaming<MarkSoloTaskDoneAction>) {
			// Default implementation
		}
	}
)

// client/actions/MarkTeamMemberTaskDoneActionUtil.ts
// Mode-specific implementation for "drone" mode
export const MarkTeamMemberTaskDoneActionUtil = registerActionUtil(
	class MarkTeamMemberTaskDoneActionUtil extends AgentActionUtil<MarkTeamMemberTaskDoneAction> {
		static override type = 'mark-task-done' as const // Same type as default
		override applyAction(action: Streaming<MarkTeamMemberTaskDoneAction>) {
			// Team member-specific implementation
		}
	},
	{ forModes: ['team-member'] }
)
```

**Registering a mode-specific schema:**

If a mode needs a different schema for an action, register the schema with `forModes`:

```ts
// shared/schema/AgentActionSchemas.ts

// Default schema
export const MarkSoloTaskDoneAction = z
	.object({
		_type: z.literal('mark-task-done'),
		taskId: z.string(),
	})
	.meta({ title: 'Mark Task Done', description: 'Mark a task as complete.' })

// Mode-specific schema with additional fields
export const MarkTeamMemberTaskDoneAction = z
	.object({
		_type: z.literal('mark-task-done'),
		taskId: z.string(),
		teamId: z.string(), // Extra field for this mode
	})
	.meta({ title: 'Mark Task Done', description: 'Mark a task as complete with notes.' })

// Register the mode-specific schema
registerActionSchema('mark-task-done', MarkTeamMemberTaskDoneAction, { forModes: ['team-member'] })
```

Default schemas are auto-registered when exported from `AgentActionSchemas.ts`. Call `registerActionSchema` explicitly only for mode-specific schemas.

The system maintains two registries (default and mode-specific) and resolves the correct util/schema based on the current mode, falling back to the default when no mode-specific binding exists.

## Schedule further work

Let the agent work over multiple turns by scheduling further work using the `schedule` method.

This example shows how to schedule an extra step for adding detail to the canvas.

```ts
override applyAction(action: Streaming<AddDetailAction>) {
	if (!action.complete) return
	this.agent.schedule('Add more detail to the canvas.')
}
```

As with the `prompt` method, you can specify further details about the request.

```ts
agent.schedule({
	message: 'Add more detail in this area.',
	bounds: { x: 0, y: 0, w: 100, h: 100 },
})
```

Schedule multiple items by calling the `schedule` method more than once.

```ts
agent.schedule('Add more detail to the canvas.')
agent.schedule('Check for spelling mistakes.')
```

If you want to interrupt the agent with a new prompt, instead of waiting until the current prompt ends, you can use the agent's `interrupt` method. `interrupt` also lets you specify a mode to transition into.

This example shows how one might use the `interrupt` method to allow the agent to decide to enter a new mode called `'reviewing'` in order to review some work.

```ts
override applyAction(action: Streaming<EnterReviewingModeAction>){
	if (!action.complete) return
	this.agent.interrupt({
		mode: 'reviewing',
		input: {
			message: 'Review the new area thoroughly for any mistakes',
			bounds: action.bounds
		}
	})
}
```

Use this for things like switching modes, or for programatically telling it to correct a mistake it's made.

## Retrieve data from an external API

To retrieve information from an external API, fetch the data within `applyAction` and schedule a follow-up request with the data.

```ts
override async applyAction(action: Streaming<CountryInfoAction>) {
	if (!action.complete) return

	// Fetch from the external API
	const data = await fetchCountryInfo(action.code)

	// Schedule a follow-up request with the data
	this.agent.schedule({ data: [data] })
}
```

## Sanitize data received from the model

The model can make mistakes. Sometimes this is due to hallucinations, sometimes because the canvas changed since the model last saw it. Either way, an incoming action might contain invalid data.

To correct mistakes, apply fixes in the `sanitizeAction` method. The system runs these before applying the action to the editor or saving it to chat history.

For example, use `ensureShapeIdExists` to verify that a shape ID from the model refers to an existing shape.

```ts
override sanitizeAction(action: Streaming<DeleteAction>, helpers: AgentHelpers) {
	if (!action.complete) return action

	// Ensure the shape ID refers to an existing shape
	action.shapeId = helpers.ensureShapeIdExists(action.shapeId)

	// If the shape ID doesn't refer to an existing shape, cancel the action
	if (!action.shapeId) return null

	return action
}
```

`AgentHelpers` provides these sanitization helpers:

- `ensureShapeIdExists` - Ensure that a shape ID refers to a real shape. Useful for interacting with existing shapes.
- `ensureShapeIdsExist` - Ensure that multiple shape IDs refer to real shapes. Useful for bulk operations.
- `ensureShapeIdIsUnique` - Ensure that a shape ID is unique. Useful for creating new shapes.
- `ensureValueIsVec`, `ensureValueIsNumber`, etc - Useful for more complex actions where the model is more likely to make mistakes.

## Send positions to and from the model

By default, every position sent to the model is offset by the starting position of the current chat.

To apply this offset to a position sent to the model, use the `applyOffsetToVec` method.

```ts
override getPart(request: AgentRequest, helpers: AgentHelpers): ViewportCenterPart {
	if (!this.editor) return { part: 'user-viewport-center', center: null, }

	// Get the center of the user's viewport
	const viewportCenter = this.editor.getViewportBounds().center

	// Apply the chat's offset to the vector
	const offsetViewportCenter = helpers.applyOffsetToVec(viewportCenter)

	// Return the prompt part
	return {
		part: 'user-viewport-center',
		center: offsetViewportCenter,
	}
}
```

To remove the offset from a position received from the model, use the `removeOffsetFromVec` method.

```ts
override applyAction(action: Streaming<MoveAction>, helpers: AgentHelpers) {
	if (!action.complete) return

	// Remove the offset from the position
	const position = helpers.removeOffsetFromVec({ x: action.x, y: action.y })

	// Do something with the position...
}
```

Box-level helpers for working with bounds:

- `applyOffsetToBox` / `removeOffsetFromBox` - Apply or remove offset from a `{ x, y, w, h }` box.
- `applyOffsetToShapePartial` / `removeOffsetFromShapePartial` - Apply or remove offset from a partial shape.

Round numbers before sending them to the model. To restore the original number later, use `roundAndSaveNumber` and `unroundAndRestoreNumber`.

```ts
// In `getPart`...
const roundedX = helpers.roundAndSaveNumber(x, 'my_key_x')
const roundedY = helpers.roundAndSaveNumber(y, 'my_key_y')

// In `applyAction`...
const unroundedX = helpers.unroundAndRestoreNumber(x, 'my_key_x')
const unroundedY = helpers.unroundAndRestoreNumber(y, 'my_key_y')
```

To round all the numbers on a shape, use the `roundShape` and `unroundShape` methods. See the [shapes](#send-shapes-to-the-model) section below for more details on sending shapes to the model.

```ts
// In `getPart`...
const roundedShape = helpers.roundShape(shape)

// In `applyAction`...
const unroundedShape = helpers.unroundShape(roundedShape)
```

Additional rounding helpers:

- `roundBox` - Round the coordinates and dimensions of a box.

## Send shapes to the model

The agent converts tldraw shapes to simplified formats to improve model understanding and performance.

Three main formats:

- `BlurryShape` - Format for shapes within the agent's viewport. Contains bounds, id, type, and text. The "blurry" name indicates the agent can't make out shape details—it provides an overview of what the agent sees.
- `FocusedShape` - Format for shapes the agent is focusing on, such as those you've manually added to its context. Contains most shape properties: color, fill, alignment, and shape-specific information. The "focused" name indicates these are shapes the agent is directly examining.
  - This is also the format that the model outputs when creating shapes.
- `PeripheralShapeCluster` - Format for shapes outside the agent's viewport. Groups nearby shapes into clusters with bounds and shape count. The least detailed format—gives the model awareness of shapes elsewhere on the page.

Use conversion functions in `shared/format/` to send shapes in these formats, such as `convertTldrawShapeToFocusedShape`.

This example picks one random shape on the canvas and sends it to the model in the Focused format.

```ts
override getPart(request: AgentRequest, helpers: AgentHelpers): RandomShapePart {
	if (!this.editor) return { type: 'random-shape', shape: null}
	const { editor } = this

	// Get a random shape
	const shapes = editor.getCurrentPageShapes()
	const randomShape = shapes[Math.floor(Math.random() * shapes.length)]

	// Convert the shape to the Focused format
	const focusedShape = convertTldrawShapeToFocusedShape(randomShape, editor)

	// Normalize the shape's position
	const offsetShape = helpers.applyOffsetToShape(focusedShape)
	const roundedShape = helpers.roundShape(offsetShape)

	return {
		type: 'random-shape',
		shape: roundedShape,
	}
}
```

## Change the system prompt

The system prompt lives in `worker/prompt/buildSystemPrompt.ts`. Edit the sections in `worker/prompt/sections/` to change the system prompt.

The system prompt is rebuilt for each step in the agentic loop depending on which actions and parts are available in the agent's current mode. If you add new actions or parts, you can give the model more detailed instructions for how to use them in `worker/prompt/sections/rules-section.ts`.

The schema showing the actions the agent can output is also automatically added to the system prompt.

## Change to a different model

Set an agent's model using the `setModelName` method on the `modelName` manager.

```ts
agent.modelName.setModelName('gemini-3-flash-preview')
```

To change the logic for deciding which model to use for a request, you can edit `ModelNamePartUtil`.

## Support a different model

Add the model's definition to `AGENT_MODEL_DEFINITIONS` in `shared/models.ts`.

```ts
'claude-sonnet-4-5': {
	name: 'claude-sonnet-4-5',
	id: 'claude-sonnet-4-5',
	provider: 'anthropic',
}
```

Add extra setup or configuration for your provider in `worker/do/AgentService.ts`.

## Support custom shapes

If your app includes [custom shapes](https://tldraw.dev/docs/shapes#Custom-shapes-1), the agent can see, move, delete, resize, rotate, and arrange them with no extra setup. However, you might also want to let the agent create and edit them, and read their custom properties.

To support custom shapes, you have two main options:

1. Add an action that lets the agent create your custom shape.
   See the [Let the agent create custom shapes with an action](#let-the-agent-create-custom-shapes-with-an-action) section below.
2. Add your custom shape to the schema so that the agent read, edit and create it like any other shape.
   See the [Add your custom shape to the schema](#add-your-custom-shape-to-the-schema) section below.

### Let the agent create a custom shape with an action

For partial support, let the agent create a custom shape with an [agent action](#change-what-the-agent-can-do). This example creates a custom "sticker" shape:

```ts
// In shared/schema/AgentActionSchemas.ts
export const StickerAction = z
	.object({
		_type: z.literal('sticker'),
		stickerType: z.enum(['heart', 'star']),
		x: z.number(),
		y: z.number(),
	})
	.meta({
		title: 'Sticker',
		description: 'Add a sticker to the canvas.',
	})

export type StickerAction = z.infer<typeof StickerAction>
```

Create an action util to define how the action applies to the canvas:

```ts
// client/actions/StickerActionUtil.ts
export const StickerActionUtil = registerActionUtil(
	class StickerActionUtil extends AgentActionUtil<StickerAction> {
		static override type = 'sticker' as const

		// How to display the action in chat history
		override getInfo(action: Streaming<StickerAction>) {
			return {
				icon: 'pencil' as const,
				description: 'Added a sticker',
			}
		}

		// Execute the action
		override applyAction(action: Streaming<StickerAction>, helpers: AgentHelpers) {
			if (!action.complete) return

			// Normalize the position
			const position = helpers.removeOffsetFromVec({ x: action.x, y: action.y })

			// Create the custom shape
			this.editor.createShape({
				type: 'sticker',
				id: createShapeId(),
				x: position.x,
				y: position.y,
				props: { stickerType: action.stickerType },
			})
		}
	}
)
```

### Add a custom shape to the schema

To let the agent see the custom properties of your custom shape, add it to the schema in `shared/format/FocusedShape.ts`

For example, here's a schema for a custom sticker shape.

```ts
const FocusedStickerShape = z
	.object({
		// Required properties
		_type: z.literal('sticker'),
		note: z.string(),
		shapeId: z.string(),

		// Custom properties
		stickerType: z.enum(['heart', 'star']),
		x: z.number(),
		y: z.number(),
	})
	.meta({
		// Information about the shape to give to the agent
		title: 'Sticker Shape',
		description:
			'A sticker shape is a small symbol stamped onto the canvas. There are two types of stickers: heart and star.',
	})
```

The `_type` and `shapeId` properties are required so that the app can identify your shape. The `note` property is also required. The agent uses it to leave notes for itself.

For optional properties, it's worth considering how the agent should see your custom shape. You might want to leave out some properties and focus on showing the most important ones. It's also best to keep them in alphabetical order for better performance with Gemini models.

Enable your custom shape schema by adding it to the list of `FOCUSED_SHAPES` in the same file to enable it.

```ts
const FOCUSED_SHAPES = [
	FocusedDrawShape,
	FocusedGeoShape,
	FocusedLineShape,
	FocusedTextShape,
	FocusedArrowShape,
	FocusedNoteShape,
	FocusedUnknownShape,

	// Our custom shape
	FocusedStickerShape,
] as const
```

Tell the app how to convert your custom shape into the `FocusedShape` format by adding it as a case in `shared/format/convertTldrawShapeToFocusedShape.ts`.

```ts
export function convertTldrawShapeToFocusedShape(editor: Editor, shape: TLShape): FocusedShape {
	switch (shape.type) {
		// ...
		case 'sticker':
			const bounds = getShapeBounds(shape)
			return {
				_type: 'sticker',
				note: (shape.meta.note as string) ?? '',
				shapeId: convertTldrawIdToSimpleId(shape.id),
				stickerType: shape.props.stickerType,
				x: bounds.x,
				y: bounds.y,
			}
		// ...
	}
}
```

To allow the agent to edit your custom shape's properties, tell the app how to convert your shape from the `FocusedShape` format that the model outputs to the actual format of your shape.

```ts
export function convertFocusedShapeToTldrawShape(
	editor: Editor,
	focusedShape: TLShape
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): {
	switch (focusedShape.type) {
		// ...
		case 'sticker':
			const shapeId = convertSimpleIdToTldrawId(focusedShape.shapeId)
			return {
				shape: {
					id: shapeId
					x: focusedShape.x,
					y: focusedShape.y
					// ...
					props: {
						// ...
						stickerType: focusedShape.stickerType
					},
					meta: {
						note: focusedShape.note ?? ''
					}
				}
			}
		// ...
	}
}
```

## License

This project is part of the tldraw SDK. It is provided under the [tldraw SDK license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

You can use the tldraw SDK in commercial or non-commercial projects so long as you preserve the "Made with tldraw" watermark on the canvas. To remove the watermark, you can purchase a [business license](https://tldraw.dev/pricing). Visit [tldraw.dev](https://tldraw.dev) to learn more.

## Trademarks

Copyright (c) 2025-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Distributions

You can find tldraw on npm [here](https://www.npmjs.com/package/@tldraw/tldraw?activeTab=versions).

## Contribution

Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## Community

Have questions, comments or feedback? [Join our discord](https://discord.gg/rhsyWMUJxd). For the latest news and release notes, visit [tldraw.dev](https://tldraw.dev).

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw) or email us at [mailto:hello@tldraw.com](hello@tldraw.com).
