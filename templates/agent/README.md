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

The following example shows how to let the model see what the current time is.

Define a prompt part:

```ts
interface TimePart extends BasePromptPart<'time'> {
	time: string
}
```

Create a prompt part util:

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

To enable the prompt part util, add it to the `PROMPT_PART_UTILS` list in `AgentUtils.ts`. It will use its methods to assemble its data and send it to the model.

- `getPart` - Gather any data needed to construct the prompt.
- `buildContent` - Turn the data into messages to send to the model.

There are other methods available on the `PromptPartUtil` class that you can override for more granular control.

- `getPriority` - Control where this prompt part will appear in the list of messages we send to the model. A lower value indicates higher priority, so we send it later on in the request.
- `getModelName` - Determine which AI model to use.
- `buildSystemPrompt` - Append a string to the system prompt.
- `buildMessages` - Manually override how prompt messages are constructed from the prompt part.
- `transformPart` - Apply transformations to the prompt part before we add it to the final prompt. More details on [transformations](#transformations) below.

## Change what the agent can do

**Change what the agent can do by adding, editing or removing an `AgentActionUtil` within `AgentUtils.ts`.**

Agent action utils define the actions the agent can perform. Each `AgentActionUtil` adds a different capability.

The following example shows how to allow the agent to clear the screen.

Define an agent action by creating a schema for it:

```ts
const ClearAction = z
	.object({
		// All agent actions must have a _type field
		// The underscore encourages the model to put this field first
		_type: z.literal('clear'),
	})
	.meta({
		// A title and description tell the model what the action does
		title: 'Clear',
		description: 'The agent deletes all shapes on the canvas.',
	})

// Infer this action's type
type IClearAction = z.infer<typeof ClearAction>
```

Create an agent action util:

```ts
export class ClearActionUtil extends AgentActionUtil<IClearAction> {
	static override type = 'clear' as const

	// Tell the model what the action's schema is
	override getSchema() {
		return ClearAction
	}

	// Choose how the action gets displayed in the chat panel UI
	override getInfo() {
		return {
			icon: 'trash' as const,
			description: 'Cleared the canvas',
		}
	}

	// Execute the action
	override applyAction(action: Streaming<IClearAction>, transform: AgentRequestTransform) {
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

- `getSchema` - Get the schema the model should use to carry out the action.
- `getInfo` - Determine how the action gets displayed in the chat panel UI.
- `applyAction` - Execute the action.

There are other methods available on the `AgentActionUtil` class that you can override for more granular control.

- `savesToHistory` - Control whether actions get saved to chat history or not.
- `transformAction` - Apply transformations to the action before saving it to history and applying it. More details on [transformations](#transformations) below.

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
override applyAction(action: Streaming<IAddDetailAction>, transform: AgentRequestTransform) {
	if (!action.complete) return

	const { agent } = transform
	agent.schedule('Add more detail to the canvas.')
}
```

<!-- You can also pass a callback to the `agent.schedule(input)` method to create a request based on the currently scheduled request. If there is no currently scheduled request, the callback will be called with the default request.

```ts
override applyAction(action: Streaming<IMoveRightAction>, transform: AgentRequestTransform) {
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
``` -->

<!-- You can also see `shared/actions/SetMyViewActionUtil.ts` and `shared/actions/ReviewActionUtil.ts` for other examples that use `agent.schedule()`.

The `RandomWikipediaArticleActionUtil` also uses `schedule()`, but to handle fetching async data, which is slightly more complex. More on that in the [next section](#how-to-get-the-agent-to-use-an-external-api). -->

You can also schedule further work by adding to the agent's todo list. It won't stop working until all todos are resolved.

```ts
override applyAction(action: Streaming<IAddDetailAction>, transform: AgentRequestTransform) {
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

## How to get the agent to use an external API

You can give your agent the ability to call and retrieve information from external APIs by creating an `AgentActionUtil` for the specific API you want to call. See the `RandomWikiArticleActionUtil` for an example.

Like any `AgentActionUtil` that passes data from one turn to the next (like `SetMyViewActionUtil` or `ReviewActionUtil`), we must schedule a request to force the agent to take another turn. However, it's not possible to `await` async functions directly from within the context `applyAction()` is called. We handle that by returning the promise so that the next request will have access to it.

```ts
override async applyAction(
	action: Streaming<IRandomWikipediaArticleAction>,
	transform: AgentRequestTransform
) {
	if (!action.complete) return
	const { agent } = transform

	// Schedule a follow-up request and return the wikipedia article
	agent.schedule()
	return await fetchRandomWikipediaArticle()
}
```

<!-- If an Action returns anything, async or otherwise, we store that returned value, along with any others, in the next `AgentRequest`'s `actionResults`. By returning `await myAsyncFunction()` from an Action, we ensure that when the next turn starts, that promise will be waiting for us in our new `AgentRequest`. -->

### Reading the data from the API

In order to get this data into our prompt, there is a dedicated `PromptPartUtil` that will collate all promises returned from Actions taken in the previous turn. This part, called `ActionResultsPartUtil`, awaits all of the promises returned from the previous turn's actions, and will add their data to the prompt of the agent's new turn.

This works out of the boss with any Action set up like the above example.

<!-- > You should always use this strategy when dealing with Actions that have async calls, even if your API just returns a status (such as sending an email, or updating an external database). This is because you cannot await async calls from within `applyAction()` directly (and so you cannot handle errors), and passing that status back to the agent will let it know if the request completed successfully or not, which they can then tell you. -->

## Transforming data on its round trip from the model

In order to keep the information we send to the model simple and easy for the model to understand, we apply a number of 'transforms' the different Prompt Parts we send. To undo these transforms, as well as correct for any mistakes the model may have made, we also have to apply transforms to the Actions that the agent outputs.

### Example: `applyOffsetToBox()` and `applyOffsetToBox()`

LLMs are better at understanding the differences between smaller numbers than between bigger numbers. To improve the agent's accuracy, we offset the coordinates we send to it by the coordinates of the viewport when a new chat is started. To keep these changes consistent, we pass every coordinate we send it in a Prompt Part through the `applyOffsetToBox()` method on the `AgentRequestTransform`, which is called within `transformPart()`. (We also do something similar with `applyOffsetToVec()` and `applyOffsetToShape()`)

This means the agent now thinks the shapes and viewports it knows exists are in different positions than they are. In order to correct for this in the actions that the agent outputs, we call our `removeOffsetToBox()`, `removeOffsetToVec()`, and `removeOffsetToShape()` methods.

**This is the main idea behind transforms: Corrections are made to give the model easier-to-understand data, which then must be reversed.**

### Transforming `PromptPart`s

To improve a model's ability to understand the information we give it,

### Transforming `AgentActions`s

#### `transformAction()`

#### `applyAction()`

-- parts are transofrmed for adjustments for clarity and for keeping track of different changes we make
-- actions are transformed for corrections

TODO

<!-- ### `transformPart()`

The last piece of a `PromptPartUtil` is the `transformPart()` method. Transforms, all of which are stored in the instance of `AgentRequestTransform` that gets passed in, change the information in `PromptPart`s and `AgentAction`s to be easier for models to understand.

For example, `applyOffsetToShape` adjusts the position of a shape to make it relative to the current chat origin. The `removeOffsetFromShape` method reverses it. This is helpful because it helps to keep numbers low, which is easier for the model to deal with.

Many transformation methods save some state. For example, the `ensureShapeIdIsUnique` method changes a shape's ID if it's not unique, and it saves a record of this change so that further actions can continue to refer to the shape by its untransformed ID.

> note that this is **not** the actual list of messages that is sent directly to the model. the `AgentPrompt` is sent to the worker, which then goes back through the prompt parts and calls their respective `getContent()` and `getMessages()` methods, which it then uses along with `getPriority()` to THEN turn into the raw messages
> _Not necessary? ^_

while being conceptually similar to the concept of converting shapes into Simple or Blurry formats, this is different becasuse **--why?--**

### `transformAction()`

Like `PromptPart`s, Agent Actions can also be transformed, and often must.

Because we apply Transforms to some `PromptPart`s, the agent has information that may not line up with the information that's on the canvas. Because of that, it might output actions that, if carried out as-is, would not align with the user's intention. Because of that, we often need to apply the reverse of that transform to the action that the agent outputs.

For example, when we send information about shapes to the model, we call `applyOffsetToShape`, which offsets a shape's coordinates relative to where the user's viewport was when a new chat was started. This means that the model thinks that a shape that at, for example, (10100, 20100), will be at (100,100). When the agent tries to move that shape, we need to call `removeOffsetFromShape` on the action in order to recorrect for this error.

-->

## How to change the system prompt

The agent's system prompt is defined by a `PromptPartUtil`, called `SystemPromptPartUtil`. You can edit this file directly to change the system prompt.

You can also override the `buildSystemPrompt()` method on any `PromptPartUtil` if you want specific Prompt Parts to add specific information to the system prompt when enabled.

```ts
override buildSystemPrompt(_part: MyCustomPromptPart) {
	return 'You can use the MyCustomPromptPart to...'
}
```

## How to add support for a different model

In order to allow your agent to use a different model, add the model's defition to `AGENT_MODEL_DEFINITIONS` in `worker/models.ts`.

## How to support custom shapes

The agent can see and move, delete, and arrange any custom shapes out of the box. However, it will see the shape's `type` as `'unknown'`, with a `subType` field that will show the internal name of the shape's `type`. It will also only be able to see the shape's `shapeId` and `x` and `y` coordinates. If you want the agent to be able to see and edit other props, you can add your custom shape to the schema we use to help the model understand shapes.

Let's add support for in-canvas embeds, and allow the model to read and update their urls if they like. TLdraw has a builtin `TLEmbedShape` already, so we'll be using that.

1. Define the fields of your new shape in `shared/format/SimpleShape.ts` using a zod object. Every shape is required to have a `_type` and a `shapeId` field, and it's strongly recommended that you give it a `note` field as well, as that is where the model stores information about the shape's purposes when creating or updating it.
   These fields are what the model will see, so it's worthwhile to give them descriptive names.

```ts
const SimpleEmbedShape = z.object({
	_type: z.literal('bookmark'),
	note: z.string(),
	shapeId: z.string(),
	url: z.string(),
})

export type ISimpleEmbedShape = z.infer<typeof SimpleEmbedShape>
```

2. Now we add our new shape to the `SIMPLE_SHAPES` union.

```ts
const SIMPLE_SHAPES = [
	SimpleDrawShape,
	SimpleGeoShape,
	SimpleLineShape,
	SimpleTextShape,
	SimpleArrowShape,
	SimpleNoteShape,
	SimpleUnknownShape,
	SimpleEmbedShape, // our new SimpleEmbedShape
] as const
```

3. Now we have to define how to convert our shape from its representation on the canvas (`TLEmbedShape`) to one our model can interact with (`SimpleEmbedShape`). We do this defining a `convertEmbedShapeToSimple` function and by adding a case to `convertTldrawShapeToSimpleShape`.

```ts
function convertEmbedShapeToSimple(editor: Editor, shape: TLEmbedShape): ISimpleEmbedShape {
	return {
		_type: 'bookmark',
		url: shape.props.url,
		note: (shape.meta?.note as string) ?? '',
		shapeId: convertTldrawIdToSimpleId(shape.id),
		x: shape.x,
		y: shape.y,
	}
}
```

```ts
export function convertTldrawShapeToSimpleShape(shape: TLShape, editor: Editor): ISimpleShape {
	switch (shape.type) {
		// ...
		case 'bookmark':
			return convertEmbedShapeToSimple(editor, shape as TLEmbedShape)
		// ...
	}
}
```

4. Now the agent can see and fully understand embeds on the canvas. However, it still can't create or edit them. To allow them to do this, we need to head to `CreateActionUtil.ts` and `UpdateActionUtil.ts` respectively and add support for those. This is where we convert from the `SimpleShape` format the model outputs to the 'real' format required by the canvas.

Here's how we handle the new shape from within `CreateActionUtil.ts`'s `getTldrawAiChangesFromCreateAction()` function. It's handled very similarly in `UpdateActionUtil.ts`

```ts
case 'bookmark': { // the type the model returns
	const embedShape = shape as ISimpleEmbedShape
	changes.push({
		type: 'createShape',
		description: action.intent ?? '',
		shape: {
			id: shapeId,
			type: 'bookmark', // the official tldraw shape type
			x: embedShape.x,
			y: embedShape.y,
			props: {
				url: embedShape.url,
			},
			meta: {
				note: embedShape.note ?? '',
			},
		},
	})
	break
}
```

5. And we're done! The model can now see, create, and update the url of `TLEmbedShape`s on the canvas.

> _Why does `_type` start with an underscore? And why are the properties of all of the simple shapes in alphabetical order?_ Good question! Unfortunately as users of LLMs we exist at the behest of their strange quirks we've found this helps for some models: in this case the quirk was [property ordering.](https://ai.google.dev/gemini-api/docs/structured-output#property-ordering) If you have no intention of using Gemini, you can remove the underscores from `_type` and change the orders of the properties to be more reasonable at your own peril.

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
