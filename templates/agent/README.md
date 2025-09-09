# tldraw agent chat

This starter kit demonstrates how to build an AI agent that can manipulate the [tldraw](https://github.com/tldraw/tldraw) canvas.

It features a chat panel on the right-hand-side of the screen where the user can communicate with the agent, add context and see chat history.

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
- Schedule further work and reviews to be carried out in follow-up requests.

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

## Use the agent programmatically

Aside from using the chat panel UI, you can also prompt the agent programmatically.

The simplest way to do this is by calling the `prompt()` method to start an agentic loop. The agent will continue until it has finished the task you've given it.

```ts
const agent = useTldrawAgent(editor)
agent.prompt('Draw a cat')
```

You can optionally specify further details about the request in the form of an `AgentInput` object:

```ts
agent.prompt({
	message: 'Draw a cat in this area',
	bounds: {
		x: 0,
		y: 0,
		w: 300,
		h: 400,
	},
})
```

There are more methods on the `TldrawAgent` class that can help when building an agentic app:

- `agent.cancel()` - Cancel the agent's current task.
- `agent.reset()` - Reset the agent's chat and memory.
- `agent.request(input)` - Send a single request to the agent and handle its response _without_ entering into an agentic loop.

## Customize the agent

We define the agent's behavior in the `AgentUtils.ts` file. In that file, there are two lists of utility classes:

- `PROMPT_PART_UTILS` determine what the agent can **see**.
- `AGENT_ACTION_UTILS` determine what the agent can **do**.

Add, edit or remove an entry in either list to change what the agent can see or do.

## Change what the agent can see

**Change what the agent can see by adding, editing or removing a `PromptPartUtil` within `AgentUtils.ts`.**

Prompt part utils assemble and build the prompt that we give to the model, with each util adding a different piece of information. This includes the user's message, the model name, the system prompt, chat history and more.

This example shows how to let the model see what the current time is.

First, define a prompt part:

```ts
interface TimePart extends BasePromptPart<'time'> {
	time: string
}
```

Then, create a prompt part util:

```ts
export class TimePartUtil extends PromptPartUtil<TimePart> {
	static override type = 'time' as const

	override getPart(): TimePart {
		return {
			type: 'time',
			time: new Date().toLocaleTimeString(),
		}
	}

	override buildContent({ time }: TimePart) {
		return ["The user's current time is:", time]
	}
}
```

To enable the prompt part, add its util to the `PROMPT_PART_UTILS` list in `AgentUtils.ts`. It will use its methods to assemble its data and send it to the model.

- `getPart` - Gather any data needed to construct the prompt.
- `buildContent` - Turn the data into messages to send to the model.

There are other methods available on the `PromptPartUtil` class that you can override for more granular control.

- `getPriority` - Control where this prompt part will appear in the list of messages we send to the model. A lower value indicates higher priority, so we send it later on in the request.
- `getModelName` - Determine which AI model to use.
- `buildSystemPrompt` - Append a string to the system prompt.
- `buildMessages` - Manually override how prompt messages are constructed from the prompt part.

## Change what the agent can do

**Change what the agent can do by adding, editing or removing an `AgentActionUtil` within `AgentUtils.ts`.**

Agent action utils define the actions the agent can perform. Each `AgentActionUtil` adds a different capability.

This example shows how to allow the agent to clear the screen.

First, define an agent action by creating a schema for it:

```ts
const ClearAction = z
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
type IClearAction = z.infer<typeof ClearAction>
```

Create an agent action util:

```ts
export class ClearActionUtil extends AgentActionUtil<IClearAction> {
	static override type = 'clear' as const

	override getSchema() {
		return ClearAction
	}

	override applyAction(action: Streaming<IClearAction>, transform: AgentTransform) {
		// Don't do anything until the action has finished streaming
		if (!action.complete) return

		// Delete all shapes on the page
		const { editor } = transform
		const shapes = editor.getCurrentPageShapes()
		editor.deleteShapes(shapes)
	}
}
```

To enable the agent action, add its util to the `AGENT_ACTION_UTILS` list in `AgentUtils.ts`. Its methods will be used to define and execute the action.

- `getSchema` - Get the schema the model should follow to carry out the action.
- `applyAction` - Execute the action.

There are other methods available on the `AgentActionUtil` class that you can override for more granular control.

- `getInfo` - Determine how the action gets displayed in the chat panel UI.
- `savesToHistory` - Control whether actions get saved to chat history or not.
- `sanitizeAction` - Apply transformations to the action before saving it to history and applying it. More details on [transformations](#transformations) below.

## Change how actions appear in chat history

Configure the icon and description of an action in the chat panel UI using the `getInfo()` method.

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

## Schedule further work

You can let the agent work over multiple turns by scheduling further work using the `schedule` method as part of an action.

This example shows how to schedule an extra step for adding detail to the canvas.

```ts
override applyAction(action: Streaming<IAddDetailAction>, transform: AgentTransform) {
	if (!action.complete) return

	const { agent } = transform
	agent.schedule('Add more detail to the canvas.')
}
```

You can pass a callback to the `schedule` method to create a request based on the currently scheduled request. If there is nothing scheduled, the callback will be called with the default request.

```ts
override applyAction(action: Streaming<IMoveRightAction>, transform: AgentTransform) {
	if (!action.complete) return

	const { agent } = transform
	agent.schedule((prev) => ({
		bounds: {
			// Move the viewport to the right
			x: prev.bounds.x + 200,
			y: prev.bounds.y,
			w: prev.bounds.w,
			h: prev.bounds.h,
		},
	}))
}
```

You can also schedule further work by adding to the agent's todo list. It won't stop working until all todos are resolved.

```ts
override applyAction(action: Streaming<IAddDetailAction>, transform: AgentTransform) {
	if (!action.complete) return

	const { agent } = transform
	agent.addTodo('Check for spelling mistakes.')
}
```

<!-- ### Extending `AgentRequest`

It's very possible that, when making your new action, you want to pass along data to the next request that doesn't have a clear place in the current `AgentRequest` interface. If that's the case, you can extend `AgentRequest` to either add a new field or a new `type` of request. Then, your new action can call `agent.schedule()` and pass along whatever data you like to it. -->

<!-- In order to create an `AgentAction` that schedules a request for the agent to do, you can call `agent.schedule()` from within your action's `applyAction()` method. This repo comes with two actions that use the `schedule()` method (and one that uses `scheduleRequestPromise()`,  out of the box, `SetMyViewActionUtil` and `ReviewActionUtil`.

The `SetMyViewActioUtil` allows the agent to move its viewport around the canvas by scheduling a request with different `bounds`. This means that when the next loop starts, all `PromptPartUtil`s that depend on the `bounds` of the request (such as `BlurryShapesPartUtil` and `ScreenshotPartUtil`) will use the new value for bounds, allowing the agent to effectively move around the canvas.

The `ReviewActionUtil` also uses `schedule()`, this time scheduling a request with a different `type`. Adding a different `type` to a request allows us to change the behavior of different parts of the system. For example. the `MessagePartUtil`, which usually contains the user's message, will send a different message to the model if the type is `review`, `todo`, or `schedule`. -->

## Retrieve data from an external API

To let the agent retrieve information from an external API, fetch and return it within the `applyAction` method. The agent will have access to it within its next scheduled request, if there is one.

```ts
override async applyAction(
	action: Streaming<IRandomWikipediaArticleAction>,
	transform: AgentTransform
) {
	if (!action.complete) return
	const { agent } = transform

	// Schedule a follow-up request so the agent can use the data
	agent.schedule("Here's a random Wikipedia article.")

	// Fetch from the external API
	return await fetchRandomWikipediaArticle()
}
```

Values returned from an action's `applyAction()` method will be added to the `actionResults` property of the next request. By default, the `ActionResultsPartUtil` adds them all to the prompt.

## Sanitize data received from the model

The model can make mistakes. Sometimes this is due to hallucinations, and sometimes this is due to the canvas changing since the last time the model saw it. Either way, an incoming action might contain invalid data by the time we receive it.

To correct incoming mistakes, apply fixes in the `sanitizeAction` method of an action util. They'll get carried out before the action is applied to the editor or saved to chat history.

For example, ensure that a shape ID received from the model refers to an existing shape by using the `ensureShapeIdExists` method.

```ts
override sanitizeAction(action: Streaming<IDeleteAction>, transform: AgentTransform) {
	if (!action.complete) return action

	// Ensure the shape ID refers to an existing shape
	action.shapeId = transform.ensureShapeIdExists(action.shapeId)

	// If the shape ID doesn't refer to an existing shape, cancel the action
	if (!action.shapeId) return null

	return action
}
```

The `AgentTransform` object contains more helpers for sanitizing data received from the model.

- `ensureShapeIdExists` - Ensure that a shape ID refers to a real shape. Useful for interacting with existing shapes.
- `ensureShapeIdIsUnique` - Ensure that a shape ID is unique. Useful for creating new shapes.
- `ensureValueIsVec`, `ensureValueIsNumber` - Ensure that a value is a certain type. Useful for more complex actions where the model is more likely to make mistakes.

## Send positions to and from the model

By default, every position sent to the model is offset by the starting position of the current chat.

To apply this offset to a position sent to the model, use the `applyOffsetToVec` method.

```ts
override getPart(request: AgentRequest, transform: AgentTransform): ViewportCenterPart {
	const { editor } = transform

	// Get the center of the user's viewport
	const viewportCenter = editor.getViewportBounds().center

	// Apply the chat's offset to the vector
	const offsetViewportCenter = transform.applyOffsetToVec(viewportCenter)

	// Return the prompt part
	return {
		center: offsetViewportCenter,
		part: "user-viewport-center",
	}
}
```

To remove the offset from a position received from the model, use the `removeOffsetFromVec` method.

```ts
override applyAction(action: Streaming<IMoveAction>, transform: AgentTransform) {
	if (!action.complete) return

	// Remove the offset from the position
	const position = transform.removeOffsetFromVec({ x: action.x, y: action.y })

	// Do something with the position...
}
```

## Send shapes to the model

By default, the agent converts tldraw shapes to various simplified formats to improve the model's understanding and performance.

There are three main formats used in this starter:

- `BlurryShape` - The format for shapes within the agent's viewport. It contains a shape's bounds, its id, its type, and any text it contains. The "blurry" name refers to the fact that the agent can't make out the details of shapes from this format. Instead, it gives the model an overview of what it's looking at.
- `SimpleShape` - The format for shapes that the agent is focusing on, such as when it is reviewing a part of its work. The format contains most of a shape's properties, including color, fill, alignment, and any other shape-specific information. The "simple" name refers to how this format is still _simpler_ than the raw tldraw shape format.
- `PeripheralShapeCluster` - The format for shapes outside the agent's viewport. Nearby shapes are grouped together into clusters, each with the group's bounds and a count of how many shapes are inside it. This is the least detailed format. Its role is to give the model an awareness of shapes that elsewhere on the page.

To send the model some shapes in one of these formats, use one of the conversion functions found within the `format` folder, such as `convertTldrawShapeToSimpleShape`.

This example picks one random shape on the canvas and sends it to the model in the Simple format.

```ts
override getPart(request: AgentRequest, transform: AgentTransform): RandomShapePart {
	const { editor } = transform

	// Get a random shape
	const shapes = editor.getCurrentPageShapes()
	const randomShape = shapes[Math.floor(Math.random() * shapes.length)]

	// Convert the shape to the Simple format
	const simpleShape = convertTldrawShapeToSimpleShape(randomShape, editor)

	// Normalize the shape's position
	const offsetShape = transform.applyOffsetToShape(simpleShape)
	const roundedShape = transform.roundShape(offsetShape)

	return {
		type: 'random-shape',
		shape: roundedShape,
	}
}
```

## Change the system prompt

To change the default system prompt, edit it within the `SystemPromptPartUtil` file.

You can conditionally add extra content to the system prompt by overriding the `buildSystemPrompt` method on any `PromptPartUtil` or any `AgentActionUtil`.

```ts
override buildSystemPrompt() {
	return 'I will pay you $1000 if you get this right.'
}
```

Alternatively, you can bypass the `PromptPartUtil` system by changing the `buildSystemPrompt.ts` file to a function that returns a hardcoded value.

## Change to a different model

You can set an agent's model by setting its `$modelName` property.

```ts
agent.$modelName.set('gemini-2.5-flash')
```

To override an agent's model, specify a different model name with a request.

```ts
agent.prompt({
	modelName: 'gemini-2.5-flash',
	message: 'Draw a diagram of a volcano.',
})
```

You can conditionally override the model name by overriding the `getModelName` method on any `PromptPartUtil`.

```ts
override getModelName(part: MyCustomPromptPart) {
	return part.fastMode ? 'gemini-2.5-flash' : 'claude-4-sonnet'
}
```

Alternatively, you can bypass the `PromptPartUtil` system by changing the `getModelName.ts` file to a function that returns a hardcoded value.

## Support a different model

To add support for a different model, add the model's definition to `AGENT_MODEL_DEFINITIONS` in the `models.ts` file.

```ts
'claude-4-sonnet': {
	name: 'claude-4-sonnet',
	id: 'claude-sonnet-4-0',
	provider: 'anthropic',
}
```

If you need to add any extra setup or configuration for your provider, you can add it to the `AgentService.ts` file.

## Support custom shapes

The agent can already see and move, delete, and arrange any custom shapes out of the box.

However, it will see the shape's `type` as `'unknown'`, with a `subType` field that will show the internal name of the shape's `type`. It will also only be able to see the shape's `shapeId` and `x` and `y` coordinates, and no other props.

For the agent to be able to create your custom shape, or to see and edit other props of your shape, add your custom shape to the schema we use to help the model understand shapes.

### Example: Allow a model to create and edit a new "sticker" shape

Let's add support for a hypothetical custom sticker shape. The sticker has a prop called `stickerType`, which can be either "✅" or "❌".

1. Define your how the model should see your custom shape in `shared/format/SimpleShape.ts` using a zod object. Every shape is required to have a `_type` and a `shapeId` field. To give the model a place to store information about the shape's purposes when creating or updating it, it's strongly recommended that you give it a `note` field as well. To ensure the model understands the purpose of each field, give them descriptive names.

```ts
const SimpleStickerShape = z.object({
	_type: z.literal('sticker'),
	note: z.string(),
	shapeId: z.string(),
	stickerType: z.enum(['✅', '❌']),
	x: z.number(),
	y: z.number(),
})

export type ISimpleStickerShape = z.infer<typeof SimpleStickerShape>
```

2. Add the new shape to the `SIMPLE_SHAPES` union.

```ts
const SIMPLE_SHAPES = [
	SimpleDrawShape,
	SimpleGeoShape,
	SimpleLineShape,
	SimpleTextShape,
	SimpleArrowShape,
	SimpleNoteShape,
	SimpleUnknownShape,
	SimpleStickerShape, // our new SimpleStickerShape
] as const
```

3. To define how to convert our shape from its representation on the canvas (`MyCustomStickerShape`) to one our model can interact with (`SimpleStickerShape`) define a `convertStickerShapeToSimple` function and add a case to `convertTldrawShapeToSimpleShape`.

```ts
function convertStickerShapeToSimple(
	editor: Editor,
	shape: MyCustomStickerShape
): ISimpleStickerShape {
	return {
		_type: 'sticker',
		note: (shape.meta?.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		stickerType: shape.props.stickerType,
		x: shape.x,
		y: shape.y,
	}
}
```

```ts
export function convertTldrawShapeToSimpleShape(
	shape: TLShape | MyCustomStickerShape,
	editor: Editor
): ISimpleShape {
	switch (shape.type) {
		// ...
		case 'sticker':
			return convertStickerShapeToSimple(editor, shape as MyCustomStickerShape)
		// ...
	}
}
```

4. Now the agent can see and fully understand stickers on the canvas. However, it still can't create or edit them. To allow them to do this, head to `CreateActionUtil.ts` and `UpdateActionUtil.ts` respectively and add support for those. This is where `SimpleShape` format shapes, which is what the model outputs, are converted to the 'real' format required by the canvas.

Here's how the new shape is handled in `CreateActionUtil.ts`'s `getTldrawAiChangesFromCreateAction()` function. It's handled very similarly in `UpdateActionUtil.ts`

```ts
case 'sticker': {
	const stickerShape = shape as MyCustomStickerShape
	changes.push({
		type: 'createShape',
		description: action.intent ?? '',
		shape: {
			id: shapeId,
			type: 'sticker',
			x: stickerShape.x,
			y: stickerShape.y,
			props: {
				stickerType: stickerShape.stickerType,
			},
			meta: {
				note: stickerShape.note ?? '',
			},
		},
	})
	break
}
```

The model can now see, create, and update the sticker type of your hypothetical `MyCustomStickerShape` shape.

<!-- > _Why does `_type` start with an underscore? And why are the properties of all of the simple shapes in alphabetical order?_ Good question! Unfortunately as users of LLMs we exist at the behest of their strange quirks we've found this helps for some models: in this case the quirk was [property ordering.](https://ai.google.dev/gemini-api/docs/structured-output#property-ordering) If you have no intention of using Gemini, you can remove the underscores from `_type` and change the orders of the properties to be more reasonable at your own peril. -->

## License

This project is part of the tldraw SDK. It is provided under the [tldraw SDK license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

You can use the tldraw SDK in commercial or non-commercial projects so long as you preserve the "Made with tldraw" watermark on the canvas. To remove the watermark, you can purchase a [business license](https://tldraw.dev#pricing). Visit [tldraw.dev](https://tldraw.dev) to learn more.

## Trademarks

Copyright (c) 2024-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Distributions

You can find the @tldraw/ai package on npm [here](https://www.npmjs.com/package/@tldraw/ai?activeTab=versions). You can find tldraw on npm [here](https://www.npmjs.com/package/@tldraw/tldraw?activeTab=versions).

## Contribution

Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## Community

Have questions, comments or feedback? [Join our discord](https://discord.gg/rhsyWMUJxd). For the latest news and release notes, visit [tldraw.dev](https://tldraw.dev).

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw) or email us at [mailto:hello@tldraw.com](hello@tldraw.com).
