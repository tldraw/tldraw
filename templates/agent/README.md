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

## Using the agent programmatically

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

There are more methods on the `TldrawAgent` class that can help when building an agentic application:

- `agent.cancel()` - Cancel the agent's current task.
- `agent.reset()` - Reset the agent's chat and memory.
- `agent.request(input)` - Send a single request to the agent and handle its response _without_ entering into an agentic loop.

## Customizing the agent

We define the agent's behavior in the `AgentUtils.ts` file. In that file, there are two lists of utility classes:

- `PROMPT_PART_UTILS` determine what the agent can **see**.
- `AGENT_ACTION_UTILS` determine what the agent can **do**.

Add, edit or remove an entry in either list to change what the agent can **see** or **do**.

## Changing what the agent can see

Change what the agent can see by adding, editing or removing a `PromptPartUtil` in the `PROMPT_PART_UTILS` list, found in the `AgentUtils.ts` file.

Prompt part utils assemble the prompt that we give the model, as well as all the other data we send it. Each `PromptPartUtil` adds a different piece of information. These include the user's message, the model name, the system prompt, chat history and more.

To add extra data to the prompt, make a new prompt part util. As an example, let's make a util that adds the current time to the prompt. First, define the prompt part:

```ts
interface TimePart extends BasePromptPart<'time'> {
	time: string
}
```

Then, create its util:

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

Finally, add it to the `PROMPT_PART_UTILS` list in `AgentUtils.ts`. The methods of your new util will be used to assemble the prompt part and send it to the model.

- `getPart` - Gather any data needed to construct the prompt.
- `buildContent` - Turn the data into messages to send to the model.

There are other methods available on the `PromptPartUtil` class that you can override for more granular control.

- `getPriority` - Control where this prompt part will appear in the list of messages we send to the model. A lower value indicates higher priority, so we send it later on in the request.
- `getModelName` - Determine which AI model to use.
- `buildSystemPrompt` - Append a string to the system prompt.
- `buildMessages` - Manually override how prompt messages are constructed from the prompt part.
- `transformPart` - Apply transformations to the prompt part before we add it to the final prompt. More details on [transformations](#transformations) below.

## Changing what the agent can do

The full set of actions the agent can perform is assembled by the agent's Agent Action Utils, found in the `AgentUtils.ts` file.

Each adds a different capability to the agent.

_All_ actions the model can take, incuding thinking, messaging the user, and reviewing its work, are defined by different `AgentActionUtils`.

An `AgentActionUtil` consists of a couple methods that characterize its behavior.

- `getSchema()` - defines the zod schema the model must output to carry out the action
- `getInfo()` - returns information used to display the action in the chat panel UI. See [here](#how-to-change-how-actions-appear-in-chat-history) for more info.
- `transformAction()` - _addressed below_
- `applyAction()` - executes the action with access to the agent instance and editor
  - This is where the action is actually 'done'. Note that the `CreateActionUtil` and `UpdateActionUtil` abstract the logic for creating and updating shapes into the `applyAiChage()` function. These are special cases that you don't need to worry about this when creating your own actions.
- `savesToHistory()` - optional override to hide actions from chat history (defaults to true). This removes them from the chat panel UI AND hides them from the agent on future turns.

Of these, overriding only `getSchema()` and `applyAction` are strictly necessary for an action to work, although `getInfo()` is necessary to display information about the action in the chat panel.

Try making your own action! What do you want the agent to be able to do? Make shapes concentric? Email someone? Get the weather? (To add an action that calls an external API, look at the ['How to get the agent to use an external API'](#how-to-get-the-agent-to-use-an-external-api) section below)

<!-- See the [section on transforms](#transformpart) for more info on that. -->

## How to change how actions appear in chat history

You can configure the icon and description of an action in the chat panel UI using an `AgentActionUtil`'s `getInfo()` method. You can also configure whether or not the action is collapsible, and what it should show if it is collapsed, as well as whether or not the action can be grouped with other actions. See `ChatHistoryInfo.ts` for more info.

If you want to customize it further, you can also write custom CSS styling by defining an `.agent-action-type-{TYPE}` CSS class in `client/index.css`. This style will automatically be applied to your actions of that type.

## How to get the agent to schedule further work

The agent has the ability carry out complex tasks over the course of multiple turns and to evaluate its progress towards that task and adjust its approach given new information. It does this by scheduling further work for itself.

Further work can be scheduled at any point during an agent's turn using the agent's `schedule()` method, and the agent will continue to work until there is no longer a scheduled `AgentRequest`, and there are not outstanding todos left in the agent's `$todoList`. The `schedule()` method creates a new `AgentRequest` and sets `$scheduledRequest` to it if one does not exist already exist. If one exists, you can use the callback it takes to decide how to handle any conflicts between the existing `AgentRequest` and the one you want to add.

Unless further work is scheduled (or there are outstanding todos), the agent will only ever complete one turn. This means that if you want to give the agent the ability to access any information not in the original `AgentPrompt`, you give give it the ability must schedule a request.

In order to create an `AgentAction` that schedules a request for the agent to do, you can call `agent.schedule()` from within your action's `applyAction()` method. This repo comes with two actions that use the `schedule()` method (and one that uses `scheduleRequestPromise()`, more on that in the [next section](#how-to-get-the-agent-to-use-an-external-api)) out of the box, `SetMyViewActionUtil` and `ReviewActionUtil`.

The `SetMyViewActioUtil` allows the agent to move its viewport around the canvas by scheduling a request with different `bounds`. This means that when the next loop starts, all `PromptPartUtil`s that depend on the `bounds` of the request (such as `BlurryShapesPartUtil` and `ScreenshotPartUtil`) will use the new value for bounds, allowing the agent to effectively move around the canvas.

The `ReviewActionUtil` also uses `schedule()`, this time scheduling a request with a different `type`. Adding a different `type` to a request allows us to change the behavior of different parts of the system. For example. the `MessagePartUtil`, which usually contains the user's message, will send a different message to the model if the type is `review`, `todo`, or `schedule`.

> You can also use `$todoList` to force an agent to take another turn. If you create a new action that programatically creates a new `TodoItem` as a side effect, this will force the agent to take another turn, as it always takes another turn if there are unresolved todos.

It's very possible that, when making your new action, you want to pass along data to the next request that doesn't have a clear place in the current `AgentRequest` interface. If that's the case, you can extend `AgentRequest` to either add a new field or a new `type`. Then, your new action can call `agent.schedule()` and pass along whatever data you like to it.

## How to get the agent to use an external API

You can give your agent the ability to call and retrieve information from external APIs by creating an `AgentActionUtil` for the specific API you want to call. See the `GetRandomWikiArticleActionUtil` for an example.

Like any `AgentActionUtil` that gives the agent access to information not included in the original prompt (like `SetMyViewActionUtil` or `ReviewActionUtil`), we must schedule a request to force the agent to take another turn. However, it's not possible to `await` async functions directly from within the context `applyAction()` is called. We handle that below:

```ts
override async applyAction(
	action: Streaming<IGetRandomWikipediaArticleAction>,
	transform: AgentRequestTransform
) {
	if (!action.complete) return
	const { agent } = transform

	// Schedule a follow-up request and return the wikipedia article
	agent.schedule()
	return await fetchRandomWikipediaArticle()
}
```

If an Action returns anything, async or otherwise, we store that returned value, along with any others, in the next `AgentRequest`'s `actionResults`. By returning `await myAsyncFunction()` from an Action, we ensure that when the next turn starts, that promise will be waiting for us in our new `AgentRequest`.

In order to get this data into our prompt, there is a dedicated `PromptPartUtil` that will collate all promises returned from Actions taken in the previous turn. This part, called `ActionResults`, awaits all of the promises within `request.actionResults`, and will add their data to the prompt of the agent's new turn.

> You should always use this strategy when dealing with Actions that have async calls, even if your API just returns a status (such as sending an email, or updating an external database). This is because you cannot await async calls from within `applyAction()` directly (and so you cannot handle errors), and passing that status back to the agent will let it know if the request completed successfully or not, which they can then tell you.

## Transformations

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

You can also override the `buildSystemMessage()` method on any `PromptPartUtil` if you want specific Prompt Parts to add specific information to the system prompt when enabled.

```ts
override buildSystemMessage(_part: MyCustomPromptPart) {
	return 'You can use the MyCustomPromptPart to...'
}
```

## How to add support for a different model

In order to allow your agent to use a different model, add the model's defition to `AGENT_MODEL_DEFINITIONS` in `worker/models.ts`.

## How to support custom shapes

The agent can see and move, delete, and arrange any custom shapes out of the box. However, it will see the shape's `type` as `'unknown'`, with a `subType` field that will show the internal name of the shape's `type`.

The only props of the shape it will be able to see are the shape's `shapeId` and `x` and `y` coordinates. If you want the agent to be able to see and edit other props, you can add your custom shape to the schema we use to help the model understand shapes.

Let's add support for in-canvas embeds, and allow the model to read and update their urls if they like. TLdraw has a builtin `TLEmbedShape` already, so we'll be using that.

1. Define the fields of your new shape in `shared/format/SimpleShape.ts` using a zod object. Every shape is required to have a `_type` and a `shapeId` field, and it's strongly recommended that you give it a `note` field as well, as that is where the model stores information about the shape's purposes.
   Note that these fields are what the model will see, so it's worthwhile to give them descriptive names (these don't need to be the same names as the fields on your actual shape, we'll go over how to convert these later).

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

3. Now we have to decide how to convert our shape from its representation on the canvas to our `SimpleEmbedShape`, or what the model will see. We do the by adding a case to `convertTldrawShapeToSimpleShape` and defining a `convertImageShapeToSimple` function.
   Note that we're currently telling the model how to handle the `TLEmbedShape`, which is already included in `TLDefaultShape` and thus implicitly support in `convertTldrawShapeToSimpleShape`. If you're adding your own custom shape, you'll have to tell `convertTldrawShapeToSimpleShape` it can accept your custom shape.
4. Great! Now the agent can see and fully understand embeds on the canvas. However, it still can't create or edit them. To allow them to do this, we need to head to `CreateActionUtil.ts` and `UpdateActionUtil.ts` respectively and add support for those. This is where we handle creating a shape using the `SimpleShape` format you get from the model.
5. And we're done! The model can now see, create, and update the url of `TlEmbedShape`s on the canvas.

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
