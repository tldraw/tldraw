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

With its default setup, the agent can perform many actions:

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

The agent is largely defined by the `AgentUtils.ts` file. In that file, there are two lists of utility classes:

- Prompt Part Utils determine what the agent can **see**.
- Agent Action Utils determine what the agent can **do**.

To change what the agent can **see** and **do**... add, remove or change an entry `PROMPT_PART_UTILS` or `AGENT_ACTION_UTILS` respectively.

## Changing what the agent can see

The full prompt that gets sent to the model is assembled by the agent's Prompt Part Utils, found in the `AgentUtils.ts` file.

Each `PromptPartUtil` adds a different piece of information to the prompt.

_All_ data sent to the model, including the user's message, the model name, the sytem prompt, and the chat history, is defined by a different `PromptPartUtil`.

As an example, let's make a prompt part that adds the current time to the prompt. First, define the part:

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

`getPart()` and `buildContent()` are the only methods that _must_ be overridden for a prompt part to be able to properly collate and send its data to the model, but there are other methods available that give you more control over this process.

- `transformPart()` is covered below.
- `getPriority()` controls where the `PromptPart`'s content will be placed in the list of messages being sent to the model, with lower values being considered higher priority, and sent later in the list. For example, we set the `MessagePromptPartUtil`'s priority to `-Infinity` to ensure the user's message is always the last the the model reads.
- `getModelName()` allows the `PromptPartUtil` to specify which model should be used to respond to this request. This is currently only used by the `ModelNamePartUtil`.
- `buildMessages()` builds an array of messages, all attirbuted to the user, to send to the model. Most `PartUtil`s will not need to override this. Currently, only the `ChatHistoryPartUtil` overrides this in order to buld messages attributed to the agent as well as the user.
- `buildSystemMessage()` allows for `PromptPartUtils` to append their own custom instructions to the system prompt that gets used by the agent.

`getPart()` is where the meat of what the `PromtPartUtil` is, but for many `PromptPartUtil`s, it will be quite simple. The `TodoListPartUtil` simply gets the current value of the agent's `$todoList`, for example. Others are more complex.

You should should try exploring the different `PromptPartUtil`s if you haven't already!

### `transformPart()`

The last piece of a `PromptPartUtil` is the `transformPart()` method. Transforms, all of which are stored in the instance of `AgentRequestTransform` that gets passed in, change the information in `PromptPart`s and `AgentAction`s to be easier for models to understand.

For example, `applyOffsetToShape` adjusts the position of a shape to make it relative to the current chat origin. The `removeOffsetFromShape` method reverses it. This is helpful because it helps to keep numbers low, which is easier for the model to deal with.

Many transformation methods save some state. For example, the `ensureShapeIdIsUnique` method changes a shape's ID if it's not unique, and it saves a record of this change so that further actions can continue to refer to the shape by its untransformed ID.

> note that this is **not** the actual list of messages that is sent directly to the model. the `AgentPrompt` is sent to the worker, which then goes back through the prompt parts and calls their respective `getContent()` and `getMessages()` methods, which it then uses along with `getPriority()` to THEN turn into the raw messages
> _Not necessary? ^_

while being conceptually similar to the concept of converting shapes into Simple or Blurry formats, this is different becasuse **--why?--**

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

### `transformAction()`

Like `PromptPart`s, Agent Actions can also be transformed, and often must.

Because we apply Transforms to some `PromptPart`s, the agent has information that may not line up with the information that's on the canvas. Because of that, it might output actions that, if carried out as-is, would not align with the user's intention. Because of that, we often need to apply the reverse of that transform to the action that the agent outputs.

For example, when we send information about shapes to the model, we call `applyOffsetToShape`, which offsets a shape's coordinates relative to where the user's viewport was when a new chat was started. This means that the model thinks that a shape that at, for example, (10100, 20100), will be at (100,100). When the agent tries to move that shape, we need to call `removeOffsetFromShape` on the action in order to recorrect for this error. **--why is this done in applyaction and not transformaction?--**

See the [section on transforms](#transformpart) for more info on that.

## How to change how actions appear in chat history

You can configure the icon and description of an action in the chat panel UI using an `AgentActionUtil`'s `getInfo()` method. You can also configure whether or not the action is collapsible, and what it should show if it is collapsed, as well as whether or not the action can be grouped with other actions. See `ChatHistoryInfo.ts` for more info.

If you want to customize it further, you can also write custom CSS styling by defining an `.agent-action-type-{TYPE}` CSS class in `client/index.css`. This style will automatically be applied to your actions of that type.

## How to get the agent to schedule further work

What makes an agent agentic, broadly speaking, is its ability carry out a complex task over the course of multiple turns and to evaluate its progress towards that task and adjust its approach given new information.

Further work can be scheduled at any point during an agent's turn using the agent's `schedule()` method, and the agent will continue to work until there is no longer a scheduled request, and there are not outstanding todos left in the agent's `$todoList`. 

Unless further work is scheduled (or there are outstanding todos), the agent will only ever complete one turn. This means that any time you want the agent to access any information not in the first `AgentPrompt`

TODO

- One of the key features that makes an agent agentic is its ability carry out a complex task over the course of multiple turns, and to evaluate its progress towards that task and adjust its approach accordingly.
- our agent does this using its `agent.prompt()` method, which is the main entry point into the agentic loop. it runs in a loop, calling `agent.request()` with the currently request until there is no `$scheduledRequest` waiting for it at the end (it will also initiate another turn if there are outstanding items in its `$todoList`). the agent's ability to add to the `$todoList` and to the `$scheduledRequest` through its actions while it's running powers this loop
- the agent has access to a couple actions that will add `$scheduledRequests`, as well as one to update its `$todoList`
- these actions do this by calling the agent's `schedule()` method within their `applyAction()` method. this method creates a new `$scheduledRequest` if one does not exist already exist. if one exists, you may handle that how you like through the callback
- in order to create your own action that allows the agent to continue its work, all you need to do is call the `agent.schedule()` method in the action's `applyAction()` method. you may want to extend the `AgentRequest` interface to create a new `type` of request or use one of the existing `type`s with a new kind of behavior
- new agentic turns are kicked off by sending another set of messages to the model without the user actually having to send anything. We'll get into `PromptPartUtil`s more later, but the different methods in the `MessagePartUtil` class handle what kind of message to send to the model given different`type`s of `AgentRequest`s. The strings returned from `getUserPrompt()` is the only one that will contain what you type into the chat interface. all the other ones are sent automatically as part of the agentic loop
- by default, when a new agentic loop starts, we sent all the information to the model that we normally send when a user sends a message

## How to get the agent to use an external API

You can give your agent the ability to call and get information from external APIs. For an example of this, see the `GetRandomWikiArticleActionUtil`.
For the most part, your API-calling `AgentActionUtils` behave almost exactly like normal ones, with one important caveat: because the the agent is requesting data from an external source, if you want the agent to be able to use that data in its response, it must be forced to take another turn and given the data.

In order to make this happen, within the `AgentActionUtil`'s `applyAction` method, you must call `agent.scheduleAsync()`, and pass in your `AgentActionUtil`'s `type` as well as the async function that will return your data. It's recommended you do this even if your API just returns a status, as this will let the agent know if the request completed successfully or not.

All API data fetched over the course of the an agent's turn using `agent.scheduleAsync()` will appear in the `ApiDataPartUtil`.

> This means that using information received from an API requires the agent to enter an agentic loop, and thus must be used by the agent within `agent.prompt()`. It can technically _call_ these with `agent.request()`, but without being able to know the response, this is not recommended.

## How to change the system prompt

The agent's system prompt is defined by a `PromptPartUtil`, called `SystemPromptPartUtil`. You can edit this file directly to change the system prompt.

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
