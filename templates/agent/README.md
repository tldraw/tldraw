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

- Creating, updating, and deleting shapes.
- Drawing freehand pen strokes.
- Using higher-level operations on multiple shapes at once: Rotating, resizing, aligning, distributing, stacking and reordering shapes.
- Writing out its thinking and sending messages to the user.
- Keeping track of its task by writing and updating a todo list.
- Moving its viewport to look at different parts of the canvas.
- Scheduling further work and reviews to be carried out in follow-up requests.

To make decisions on what to do, we send the agent information from various sources:

- The user's message.
- The user's current selection of shapes.
- What the user can currently see on their screen.
- Any additional context that the user has provided, such as specific shapes or a particular position or area on the canvas.
- Actions the user has recently taken.
- A screenshot of the agent's current view of the canvas.
- A simplified format of all shapes within the agent's viewport.
- Clusters of shapes outside the agent's viewport.
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
	message: 'Draw a cat here',
	bounds: {
		x: 0,
		y: 0,
		w: 300,
		h: 400,
	},
})
```

There are some more methods that help with building an application around the agent:

- `cancel()` - Cancel the agent's current prompt.
- `reset()` - Reset the agent's chat and memory.
- `request(input: AgentInput)` - Send a single request to the agent and handle its response _without_ entering into an agentic loop.

## Changing what the agent can do

TODO

- what the agent can do is dependent on something called `AgentActionUtil`s.
- everything (!) the agent can do is dependent on `AgentActionUtil`s
  - thinking, creating, editing, even messaging!
- `AgentActionUtil`s are defined when an agent is instantiated, calling from the master list called `AGENT_ACTION_UTILS` defined in `AgentUtils.ts`
- In order to change what the model can do, you can either add, remove, or change an entry in `AGENT_ACTION_UTILS`
- An `AgentActionUtil` defines a couple things
  - a method for getting the zod schema that the model must output in order ot carry out that action, (`getSchema()`)
  - a method for getting the information needed to display the action in the chat history (`getInfo()`)
  - a method for 'transforming' the action before it's carried out (`transformAction()`)
    - we often give the model simplified information about the state of the canvas in order to improve its performance. for instance, we remove the prefix `shape:` from shape ids before sending them to the model (more on this in the prompt parts utils section). however, if a model wants to then move that shape, for example, it will specify the shape id without the `shape:` prefix, because that's what it thinks the shape's id is. so we must put the `shape:` back in front of the shape's id BEFORE the action is carried out and before it's added to chat history.
    - the `transform` argument of instance of an `AgentTransform`, which has the ability to save the values of certain properties, like the shape ids, before and after they're transformed, allowing us to map them back to their original values (more on this in the ppu section)
      - _we should probably go into the difference between this and the simple format, although probably in the ppu section_
  - a method for carrying out the action (`applyAction()`)
    - this method has access to the action itself, as well as the agent instance. you can access the editor, and many other useful properties of the agent through this. this is where the code that constitutes what the action actually 'does' goes.
      - for example for the `DeleteActionUtil`, you get the editor from the agent, the shapeId that the model wants to delete from the action, and then run `editor.deleteShape(shapeId)`. for something more complex like the `ReviewActionUtil`, which lets the agent get updated information about the canvas, it interfaces with the agent's `$scheduledRequest` atom to add a new 'review' event to the schedule, which the agent will carry out after if finishes its current work (more on this in the 'How to get the agent to schedule further work' section)
  - a method you can override to determine if the action will or will not be shown in the chat history, returns true by default.
    - currently only used by the `DebugActionUtil`, which logs all actions to the browser console and so should not log anything to the chat history
- try experimenting by commenting out different actions in `AGENT_ACTION_UTILS` and seeing how the model performs differently. what will happen if you remove its ability to use its todo list? what about thinking?
- then, try making your own action! what do you want the agent to be able to do? make shapes concentric? email someone? get the weather?

## How to change how actions appear in chat history

TODO

- Using agent action util methods
  - Grouping actions
- Using CSS

## How to get the agent to schedule further work

TODO

- One of the key features that makes an agent agentic is its ability carry out a complex task over the course of multiple turns, and to evaluate its progress towards that task and adjust its approach accordingly.
- our agent does this using its `agent.prompt()` method, which is the main entry point into the agentic loop. it runs in a loop, calling `agent.request()` with the currently request until there is no `$scheduledRequest` waiting for it at the end (it will also initiate another turn if there are outstanding items in its `$todoList`). the agent's ability to add to the `$todoList` and to the `$scheduledRequest` through its actions while it's running powers this loop
- the agent has access to a couple actions that will add `$scheduledRequests`, as well as one to update its `$todoList`
- these actions do this by calling the agent's `schedule()` method within their `applyAction()` method. this method creates a new `$scheduledRequest` if one does not exist already exist. if one exists, you may handle that how you like through the callback
- in order to create your own action that allows the agent to continue its work, all you need to do is call the `agent.schedule()` method in the action's `applyAction()` method. you may want to extend the `AgentRequest` interface to create a new `type` of request or use one of the existing `type`s with a new kind of behavior
- new agentic turns are kicked off by sending another set of messages to the model without the user actually having to send anything. We'll get into `PromptPartUtil`s more later, but the different methods in the `MessagePartUtil` class handle what kind of message to send to the model given different`type`s of `AgentRequest`s. The strings returned from `getUserPrompt()` is the only one that will contain what you type into the chat interface. all the other ones are sent automatically as part of the agentic loop
- by default, when a new agentic loop starts, we sent all the information to the model that we normally send when a user sends a message

## How to get the agent to use an external API

TODO

- see example (if we complete the stretch goal)
- you def want to make a new action (`GetWeatherActtionUtil`, etc)
- you probably want to create a new kind of `AgentRequest` `type` (call it `'api'` or w/e) and do some custom logic within `MessagePartUtil`
- you could also do some other conditional logic in the prompt parts, like maybe for example you don't want to send a screenshot for api requests?
  - TODO figure this out

## How to get the agent to use MCP

TODO

## How to change what the model can see

TODO

- Besides changing what the agent can do using `AgentActionUtil`s, the other main way you can add functionality to change what the agent can see. We do this using `PromptPartUtil`s
- Each `PromptPartUtil` allows a devleoper to send some information to the model as part of the prompt. what this information is it entirely up to the developer
- we have a large set of currently existing `PromptPartUtil`s that, taken together with the system prompt (which is itself a `PromptPartUtil`), give the model the ability to understand the state of the canvas, some parts of what the user is doing, as well as the state of the task it's trying to accomplish
- you can see all `PromptPartUtil`s that the agent has access to in `AgentUtils.ts`, in the `PROMPT_PART_UTILS` list.
- these are treated very similarly to `AgentActionUtil`s in that they are instantiated when the `TldrawAgent` class is initialized, and stored in the class itself
- when a new request is sent to the model, the `preparePrompt()` function is called to assemble all the various prompt parts into a single `AgentPrompt`, which contains a.

> note that this is **not** the actual list of messages that is sent directly to the model. the `AgentPrompt` is sent to the worker, which then goes back through the prompt parts and calls their respective `getContent()` and `getMessages()` methods, which it then uses along with `getPriority()` to THEN turn into the raw messages

- in order to for each individual prompt part, the `getPart()` and then the `transformPart()` methods are called.
- `getPart()` takes the `AgentRequest` and the agent as arguments and allows the `PromptPartUtil` to construct the prompt part itself. the prompt part itself is generally just raw, unsantized data, and doesn't include any 'plain english' text.
  - for many `PromptPartUtil`s, this is quite simple. The `TodoListPartUtil` simply gets the current value of the agent's `$todoList`, for example
  - others are more complex. you should should try exploring the different `PromptPartUtil`s if you haven't already!
- then, the prompt part is transformed using its `transformPart` method. this uses the same `AgentTransform` that will later be used to transform the actions. to refresh, the `transform` exists to allow us to simplify the information we send to the model in order to improve its performance and generally confuse it less
  - one way we do this is by rounding the coordinates and widths and heights of the shapes (this is beacause `x: 512` is easier for the model to parse, and requires less tokens, than `x: 512.328947832`, especially when there may be dozens or even hundreds of coordinates for the model to read)
  - when these coordinates are rounded, the amount they were rounded by is stored in the `transform`. this allows us to apply the revserse of this transformation to any actions that affect a given shape.

## How to change the system prompt

TODO

ie: Edit the system prompt part util

## How to support custom shapes

TODO

ie: It should work out-of-the-box, but you can still add extra detail if you want.

- Add a new agent action.
- Add a custom shape to the schema.

## How to use a different model

TODO

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
