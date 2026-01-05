---
title: Orchestrating multiple AI agents on a canvas
created_at: 01/05/2026
updated_at: 01/05/2026
keywords:
  - agents
  - canvas
  - coordination
  - multiplayer
  - fairies
readability: 5
voice: 6
potential: 7
accuracy: 8
notes: "Strong core problem (underwater problem, FaeOS) but buried under documentation-style explanations. Several AI tells (promotional language, rule of three). Rambling timeline opening instead of problem-first. Code examples accurate but too lengthy without clear purpose. Needs tighter narrative and crisper voice."
---

**(Multi-agent collaboration on the canvas)**

_You are an AI agent. You live inside an infinite canvas inside someone's computer…_

**Introduction**

---

tldraw’s SDK

- something like this
  In 2022 we experimented with mermaid-like syntax for creating content on the canvas, in order that GPT2 could create diagrams using text.
  In 2023 we experimented with driving canvas experiences using a chat interface, or even control of a plotter-like set of tools.
  In 2024, we worked further on prompts that could edit the canvas. The concept was that the models were not yet capable of this work; but if we ignored that fact and tried anyway, what would we need to build? What problems would we need to solve that would be independent of the model’s output?
  In 2025 we returned to this with the AI module and then again with the agent starter.

Now, we’ve put multiple agents on the canvas.

Orchestrating multiple AI agents on an infinite canvas requires solving a unique set of coordination problems. On the canvas, things can overlap and collide in a way that isn’t destructive. This is different to other interfaces like [text editors](https://zed.dev/blog/crdts). You can place objects behind or atop each other, annotate over shapes, or change their size. Things can be positioned close by or far apart; you can zoom in and move around. This makes the interface highly effective for displaying a lot of information at a glance because you can explore multiple regions in parallel.

Do these benefits extend to AI agents? In what ways do they struggle?

Part of the difficulty is in helping agents figure out where things should go in space. This means helping agents plan their actions by defining the bounds within which they should draw—or helping agents place things on the canvas at the right time and in the right order so that, for example, the background of a scene is drawn before the foreground. The other side is in getting agents to collaborate effectively such that work gets done without chaos, duplication, or errors.

On tldraw, we give the agents access to whiteboard tools so they can make these actions. In fact, since you can put any web component on tldraw, it would be possible to give agents access to… a lot. We’re currently building in an era before AI models are ‘good’ at the canvas, which is both exciting and amusing. In that spirit, we’ve released multiple agents on the canvas as _fairies_. Fairies are childlike, mischievous, and interested in helping you out of curiosity.

A month ago, in a team retro, we demo’d this internally: we saw fifteen humans and fifteen AI agents collaborating in blank 2D space for the first time.

In this post, we’ll dive into the details on how we’ve implemented multiple agents on the canvas: starting by looking at the agent starter kit, then the coordination problems found when trying to extend this to multiple agents, the project management system we built to solve this, and how agents handle requests and manage context.

**Agent starter**

---

tldraw’s [agent starter kit](https://tldraw.dev/starter-kits/agent) gives developers the tools to build AI agents that can perceive and interact with the infinite canvas. Since it was used as the foundation for fairies, here’s a brief explainer on the important parts. In the agent starter, the user interacts with the agent through the chat panel on the right side of the screen.

![image.png](attachment:952f50aa-a90b-456c-87a0-ee5638855c98:image.png)

For the AI to interact with the canvas, we distinguish between two types of utility class: what the agent can _see_, and what the agent can _do_.

**Prompt parts** are the eyes of the agent; they define what it can see by returning information from the canvas and chat UI.

For example, we have prompt parts for getting and sending shape data. In tldraw, shape data is just a list of JSON objects. Raw canvas data can be complex, particularly on busy boards, so we had to figure out how best to send this data to the agent. We want to send only relevant data, so the agent starter kit reduces the raw data into two simpler formats.

If a user has selected some shapes, or if shapes are within the agent’s viewport, then we return the ‘blurry shapes’ format. This format only includes the bounds, type, text and position of the shapes in question. For shapes that are not selected and outside of the agent’s viewport, we have an even simpler format: ‘peripheral shapes’ are grouped into clusters, and we return the bounding box of the group along with the number of shapes in the group. So if there are a hundred shapes in a region of the canvas unrelated to its work, the agent gets to know about it without being overloaded by details. Shape data from these simpler formats gets converted to text and sent to the model along with a short description. Here’s the description for the peripheral shapes format:

```tsx
return [
	"There are some groups of shapes in your peripheral vision, outside the your main view. You can't make out their details or content. If you want to see their content, you need to get closer. The groups are as follows",
	JSON.stringify(clusters),
]
```

- extra info
  For other visual context: we grab and send a screenshot of the agent’s viewport for a ‘birds-eye’ view to get the overall composition of content. We also get viewport data: what portion of the canvas the agent can currently see, what portion the user sees, and how these relate to each other spatially. Then we have a ‘context items’ prompt part to focus the agent on a specific request: a particular shape, or area, or point.
  Aside from visual context, we also send the user’s messages, the chat history, and the items on the todo list. Models have recency bias: they pay more attention to information that appears _later_ in the prompt. To account for this, we made a priority system that sorts the messages in reverse order. User messages are the most important context, so they’re placed last in the prompt. The chat history is the least important, so it goes first. The visual context sits in between.

Prompt parts give the agent the context it needs to be able to process a user request and make decisions about what changes it wants to make. **Agent actions** are how \*\*they’re able to make those changes to the canvas. This could be through using tldraw’s editor APIs to access whiteboarding tools; with `CreateActionUtil` an agent can create objects on the canvas, and with `MoveActionUtil` it can move them around. But developers can also add actions to give agents new abilities, such as fetching random Wikipedia articles.

This utility class system is designed to be modular. You can define what behavior and set of abilities you want a particular agent to have by selectively deactivating prompt parts or agent actions. We make extensive use of this with the fairies, which we’ll go through below.

**Coordination problems**

---

There are broadly two types of problem we faced when trying to orchestrate multiple agents.

(1)

Agents process the data we send to them and then stream text back. In this, they spend a lot more time ‘writing’ than they do ‘reading’. And while writing, they cannot read. So unlike humans who actively observe, communicate and learn while working collaboratively, agents are severely limited in their ability to receive real-time feedback.

For example, on tldraw, one person can draw something while speaking to their collaborator and looking at what they are drawing. An agent can only see the state of the canvas or communicate with other agents before and after it has finished drawing. In a multi-agent system, things can change while each agent is ‘writing’—agents could write together, or humans could delete or move things around.

We call this the underwater problem: how do you coordinate agents that only briefly and intermittently ‘return to the surface’ for context?

(2)

In the agent starter, the agent creates a todo list to break down a complex user request.

An early experiment in orchestrating multiple agents was to take the todo list from the agent starter kit and make it shared state between many agents. This shared todo list object was context the agents had access to in addition to the visual screenshots and structured shape data from the canvas.

There were many issues with this. What if two agents start working on the same task? Even if they work on different tasks, how do they work together towards an overall goal? And in doing this, how do they coordinate between different parts of the overall goal?

For example, if a user asks for a website wireframe, and different agents are assigned to the header, body and footer, then we need to ensure that these different sections are placed well in relation to each other.

The assignment of tasks becomes even more complex when you add skills or personality types to the agents (which existed in earlier testing versions!) The orchestrator should prefer to use a more creative fairy for some things, and the operationally inclined fairy for other things.

**FaeOS**

---

To tackle this, we built a project-management system for the fairies. We call it FaeOS. It mirrors [subagent architectures](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) used to separate concerns: the lead agent plans, synthesizes and analyses results while subagents perform specific work with specialized tools.

**Projects** are the natural abstraction for the system that emerged as we tried to guide fairies to successfully collaborate—and as they themselves tried to break down tasks and solve problems by asking their friends for help.

As mentioned, at the beginning we gave every fairy full access to all actions and shared the todo list between them. Fairies were assigned items from the todo list at random, and chaos ensued. In a later iteration, we noticed that the shared todo list approach was better when one fairy made a plan and asked other fairies to help on specific items. This led to the current iteration: one fairy is set to focus solely on project management and the high-level todo list is available to that fairy alone.

**Tasks** are containers for distinct units of work assigned to the fairies. Tasks have a few key properties including a title, a description for the work, and the spatial bounds within which work should be completed.

One fairy can receive a complex request, break it down into chunks, create a todo list of items to complete, and complete those items. When a group of fairies receives a complex request, one of them manages projects and the others work on tasks. For this, we needed to distinguish between different **roles**: with many fairies, the ‘orchestrator’ creates projects and directs ‘workers’ towards tasks.

[ gif ]

**Modes** are the state machine system for what a given fairy is able to see and do. This is the design doc from our scratchpad:

![image.png](attachment:83c083cd-5226-4510-845f-74e24edea3b0:image.png)

An agent’s role determines what modes it can have. We do this simply by selectively activating (or deactivating) prompt parts and agent actions. For example, the orchestrator is not able to change things on the canvas - it is only able to see things on the canvas and the chat UI, then move, think, and assign tasks to the workers:

```tsx
	{
		type: 'orchestrating-active',
		memoryLevel: 'project',
		active: true,
		pose: 'active',
		parts: () => [
			'modelName', 'mode', 'messages', 'screenshot', 'userViewportBounds',
			'agentViewportBounds', 'blurryShapes', 'peripheralShapes', 'selectedShapes',
			'canvasLints', 'chatHistory',	'userActionHistory', 'time', 'otherFairies',
			'sign',	'currentProjectOrchestrator',	'debug',
		],
		actions: () => [
			'message', 'think',	'fly-to-bounds',

			// Project management
			'abort-project', 'start-project', 'end-project',
			'create-project-task', 'delete-project-task',
			'direct-to-start-project-task',	'await-tasks-completion',
		],
	},
```

By contrast, the workers are able to change things on the canvas:

```tsx
{
		type: 'working-drone',
		memoryLevel: 'task',
		active: true,
		pose: 'active',
		parts: (_work: FairyWork) => [
			'modelName', 'mode', 'messages',	'currentProjectDrone',
			'agentViewportBounds', 'screenshot', 'blurryShapes',	'chatHistory',
			'workingTasks',	'sign',	'debug',
		],
		actions: (_work: FairyWork) => [
			'mark-my-task-done', 'think',	'create',	'delete',	'update',	'label',
			'move',	'place', 'bring-to-front', 'send-to-back', 'rotate',
			'resize',	'align', 'distribute', 'stack',	'pen',
		],
	},
```

What about when there are only two fairies? It was a bit silly for one fairy to just manage projects and wait while the other worked, so we created the ‘duo-orchestrator’ role. The duo-orchestrator can both work and orchestrate the project with the other fairy, making it the only role that can switch between orchestrating and working modes.

To make all these different modes, we had to add more prompt parts and agent actions beyond what existed in the agent starter kit. Here’s an example: the `OtherFairiesPartUtil` gives awareness of other fairies on the canvas - with their name, position, what project they’re working on, and the bounds they’re working in.

```tsx
export const OtherFairiesPartDefinition: PromptPartDefinition<OtherFairiesPart> = {
	type: 'otherFairies',
	priority: 100,
	buildContent({ otherFairies, thisFairy }: OtherFairiesPart) {
		const messages = [`You: ${JSON.stringify(thisFairy)}`]
		if (otherFairies.length > 0) {
			messages.push(`Other fairies in this document: ${JSON.stringify(otherFairies)}`)
		}

		return messages
	},
}
```

This prompt part helps with coordination by separating concerns. Orchestrators get this prompt part to keep track of projects—workers don’t; they only need to know their working bounds.

**Handling requests**

---

What happens between the user sending a request and the fairy doing something on the canvas?

Prompts are built each time a user enters a message in the chat or an fairy schedules follow-up work for itself. Follow-ups happen when a task is completed or when an agent action triggers the next in a sequence. The prompt is based on the fairy’s mode, which gives it context on how it should behave and what tools it should use.

[ gif ]

Suppose the user requests a fairy to “make a birthday cake”. The fairy then enters the ‘one-shotting’ mode. This mode exists so a solo fairy can skip task creation and review and just get on with it. This is its system prompt:

_“You should directly respond to the user's request by working on the canvas immediately. You have access to all the editing tools you need to create, modify, and arrange shapes. You can use your personal todo list to plan out your approach if needed.”_

Actions available to the agent are listed in a schema. For example, our birthday cake fairy might choose to create a todo list and break down the request into smaller items. For this, we send the relevant action from the schema:

```tsx
export const UpsertPersonalTodoItemActionSchema = z
	.object({
		_type: z.literal('upsert-personal-todo-item'),
		id: z.string(),
		status: z.enum(['todo', 'in-progress', 'done']),
		text: z.string().optional(),
	})
	.meta({
		title: 'Upsert Personal Todo Item',
		description:
			'The agent updates or creates a new personal todo list item. If the id is provided, the todo item is updated. If the id is not provided and text is provided, a new todo item is created and its status is set to "todo".',
	})
```

We get back actions from the model. This is a think action, it shows the agent’s reasoning and plan to break down the request:

```
{
  "actions": [
    {
      "_type": "think",
      "text": "I need to add frosting, decorations, and candles to a birthday cake. First, let me understand my workspace - I'm working in bounds x:600-900, y:350-550.
      Since there are no shapes visible, I should first check if there's a cake base nearby that I need to decorate, or if I need to work with the assumption that the cake base exists but is outside my current view.
      Given the task says 'work in the same area as the cake base', I'll assume the cake structure is centered around this area. Let me plan my decorations: 1) Frosting layers and swirls, 2) Decorative flowers, 3) Patterns/details, 4) Birthday candles on top.
      I'll use bright, festive colors like pink, yellow, light-blue, and light-red.",
      "complete": true,
      "time": 4955
    }
  ]
}
```

Before making changes to the canvas, we check for mistakes. We sanitize each action to make sure the agent isn’t hallucinating or dealing with stale data. This also validates each action before it happens in case a human or another agent has made blocking changes. For example, if the agent chooses to delete a shape, or send a shape back one layer, we’d first check whether that shape’s ID exists on the canvas:

```tsx
	override sanitizeAction(action: Streaming<SendToBackAction>, helpers: AgentHelpers) {
		action.shapeIds = helpers.ensureShapeIdsExist(action.shapeIds ?? [])
		return action
	}
```

If all is well, we apply the action using tldraw’s canvas editor APIs:

```tsx
	override applyAction(action: Streaming<SendToBackAction>) {
		if (!this.agent) return

		if (!action.shapeIds) return
		this.agent.editor.sendToBack(action.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId))
	}
```

Each mode uses the `onPromptEnd` hook to schedule the _next_ action. This is how our birthday cake fairy could create a todo list for itself and successfully iterate through it, scheduling requests to complete work at each stage and returning to the `idle` mode once all work is complete.

```tsx
['one-shotting']: {
	onPromptEnd(agent) {
		const todo list = agent.$personaltodo list.get()
		const incompleteTodoItems = todo list.filter((item) => item.status !== 'done')
		if (incompleteTodoItems.length > 0) {
			agent.schedule(
				"Continue until all your todo items are marked as done. If you've completed the work, feel free to mark them as done, otherwise keep going."
			)
		} else {
			agent.setMode('idling')
		}
	},
```

That’s if all goes smoothly… what if there is intervention from a human, or if the fairy tries to make an illegal move? We use the `interrupt` method to force the agent to ‘resurface’ and update its context before taking a new state. This is how we tackle the underwater problem.

```tsx
interrupt({ input, mode }: { input: AgentInput | null; mode?: FairyModeDefinition['type'] }) {
	this.cancelFn?.()
	this.$activeRequest.set(null)
	this.$scheduledRequest.set(null)
	this.cancelFn = null

	if (mode) {
		this.setMode(mode)
	}
	if (input !== null) {
		this.schedule(input)
	}
}
```

An example of this (though unrelated to our solo birthday cake fairy) is when the user disbands a group of working fairies. To disband, we just interrupt each agent and set its mode to `idle`, then delete the project and associated tasks.

```tsx
export function disbandProject(projectId: string, agents: FairyAgent[]) {
	...

	memberAgents.forEach((memberAgent) => {
		memberAgent.interrupt({ mode: 'idling', input: null })
		memberAgent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false } : f))
	})

	deleteProjectAndAssociatedTasks(projectId)
}
```

**Prompt engineering**

---

It is also possible to tackle coordination problems by giving autonomy to the agents.

The system prompt directs agents to actions.

Here’s an [excerpt](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) from Anthropic’s Applied AI team:

_“System prompts should be extremely clear and use simple, direct language that presents ideas at the right altitude for the agent … The optimal altitude strikes a balance: specific enough to guide behavior effectively, yet flexible enough to provide the agent with strong heuristics to guide behavior.”_

We’ve tried to dance within that goldilocks zone with the system prompt. Part of the system prompt is built based on the fairy’s mode.

```tsx
function buildModePromptSection(flags: SystemPromptFlags) {
	if (flags.isOneshotting) {
		return buildOneshottingModePromptSection(flags)
	}
	if (flags.isSoloing) {
		return buildSoloingModePromptSection(flags)
	}
	if (flags.isWorking) {
		return buildWorkingModePromptSection(flags)
	}
	if (flags.isOrchestrating) {
		return buildOrchestratingModePromptSection(flags)
	}
	if (flags.isDuoOrchestrating) {
		return buildDuoOrchestratingModePromptSection(flags)
	}
	throw new Error(`Unknown mode`)
}
```

Let’s look at the prompt for the orchestrator.

Guide the agent towards good coordination:

_…What makes a good project plan?_

_The project plan should describe the high level tasks, and the order in which they should be carried out._

_Projects should be coherent. Agents are only able to see and work within the bounds of current task. Therefore, tasks should be positioned and sized in a way that allows them to be completed in a coherent way. If you're drawing a picture, the task to add a background should obviously overlap a task to add an object to the foreground. The logic of what should go where should rule how you position and size tasks._

_However, fully overlapping tasks should not be worked on coherently. A moderate amount of overlap is fine for concurrent tasks._

_You may also make follow-up tasks to move elements around and layer them on top of each other. If you have two agents on your team and you want one to work on a background and the other to work on a foreground, you can have those bounds not overlap at first, and later make a follow-up task to move the foreground element on top of the background element (just make sure the bounds of that task encompasses both elements)…_

Give the ability to act using action flags:

_…Then, direct the agents to start their tasks in the order you've planned. You can do this by using the `\direct-to-start-project-task\\` action. You should then use the `\await-tasks-completion\\` action to wait for the first set of tasks to be completed. This will give you a notification when any of those tasks are completed, allowing you to review them._

_When you review the tasks, you may find that you need to add more tasks to fix or adjust things. This is okay; things sometimes don't go according to plan. You can direct agents to start tasks in any order, so feel free to add new tasks to fix something that went wrong, await its completion, and only then continue with the plan._

_Once you’ve confirmed the first set of tasks are complete, you can start the next set of tasks._

_You will possibly need to spend some time near the end of the project making sure each different task is integrated into the project as a whole. This will possibly require the creation of more tasks…_

Note coordination problems:

_…You cannot edit the canvas. As the recruits work on the project, the state is ever changing, so don't be surprised if states of different tasks or the canvas changes as you go._

Give the ability to abort if not enough info from the user’s request:

_Before starting a project, if the user's input doesn't make sense in context or is unclear, you can abort the project using the `\abort-project\\` action with a brief reason explaining why._

Once satisfied, make the decision to end the project:

_Once the project is fully complete, end it._

In addition to the system prompt, we send messages to the fairy containing prompt parts. As mentioned above, each mode gets a different set of parts. For example, a working fairy gets the `workingTasks` prompt part. This lets it know what task it is working on, and the bounds of the task.

Each worker is aware of only its own tasks, since in earlier versions, workers would get distracted by seeing what other fairies were doing.

```tsx
export const WorkingTasksPartDefinition: PromptPartDefinition<WorkingTasksPart> = {
	type: 'workingTasks',
	priority: -4,
	buildContent(part: WorkingTasksPart) {
		if (part.tasks.length === 0) {
			return ['There are no tasks currently in progress.']
		}

		const taskContent = part.tasks.map((task) => {
			let text = `Task ${task.id}: "${task.text}"`
			if (task.x && task.y && task.w && task.h) {
				text += ` (within bounds: x: ${task.x}, y: ${task.y}, w: ${task.w}, h: ${task.h})`
			}
			return text
		})

		if (taskContent.length === 1) {
			return [`Here is the task you are currently working on:`, taskContent[0]]
		}

		return [`Here are the tasks you are currently working on:`, ...taskContent]
	},
}
```

The orchestrator role also desperately requires management of context. Its context window needs to be free from minor details of work. It therefore does not have access to the `workingTasks` part and sees only the high-level.

**Context engineering**

---

Finally, we have the problem of [context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)—the ‘[delicate art and science](https://x.com/karpathy/status/1937902205765607626?lang=en) of filling the context window with just the right information for the next step’. The performance of LLMs degrades considerably as input length increases, even on simple tasks. Chroma Research calls this ‘[context rot](https://research.trychroma.com/context-rot)’: when adding extraneous context forces the agent to first figure out what is relevant, and then retrieve that information to complete the tasks assigned.

Giving agents the right amount of context is key to lowering cost, improving speed and improving quality of agent output. We avoid overloading or confusing the agent at inference time by _focusing_ this context. Focusing context is partially solved by introducing roles and modes, but there is still more to do: agents stream a lot of text while reviewing, thinking and acting - most of which quickly becomes irrelevant.

![image.png](attachment:4a67ad29-9c42-417c-b0fa-7a57038d1c21:image.png)

For this, we’ve added ‘memory levels’ - a way of filtering out tokens once tasks are complete. There are three memory levels, which mirrors the hierarchy of roles of fairies in a project.

(1) The ‘task level’ provides high-detail, short-term memory scoped to individual tasks, and is cleared when the task ends.

(2) The ‘project level’ provides medium-term memory scoped to projects. This persists across tasks but is cleared when the project ends.

(3) The ‘fairy level’ provides long-term memory containing global instructions that persist across projects.

As a fairy switches through modes, it moves through different memory levels. The ‘task level’ is typically for working modes, the ‘project level’ is typically for orchestrating modes, and the ‘fairy level’ is typically for idle and soloing modes. The ‘duo-orchestrator’ is the most versatile and jumps between all three memory levels since it both works and orchestrates.

For example, we filter the chat history before sending it to the agent:

```tsx
export class ChatHistoryPartUtil extends PromptPartUtil<ChatHistoryPart> {
	static override type = 'chatHistory' as const

	override async getPart(_request: AgentRequest) {
		const allItems = structuredClone(this.agent.chatManager.getHistory())

		// Get the current mode's memory level
		const modeDefinition = getFairyModeDefinition(this.agent.modeManager.getMode())
		const { memoryLevel } = modeDefinition

		const filteredItems = filterChatHistoryByMode(allItems, memoryLevel)

		return {
			type: 'chatHistory' as const,
			items: filteredItems,
		}
	}
}
```

This prompt part:

1. Gets all chat history items,
2. Determines the current agent’s memory level,
3. Filters the chat history text based on that memory level,
4. Returns that selected text

[ img ]

However, filtering memory in this way adds gaps which the fairies were initially quite confused about. To address this, we added brief summaries of the filtered context called ‘memory transitions’. This is to expose details of the changes made, both to the agent and to the user. If the user wants to carry on the conversation, the agent won’t be totally oblivious to previous actions made.

[ img ]

Memory transitions also serve as a scaffold for more detailed context engineering in future, like if we wanted to give fairies an additional set of high-signal tokens that help them with future queries. For example, instead of a memory transition description like “I finished the birthday cake task”, we could give the worker a specific detail on what it has done and learnt - or we could give the orchestrator details on what each worker did and how well they did it. Memory levels provide an adjustable middle between no context and full context.

**Conclusion**

---

The canvas makes multi-agent orchestration an interesting challenge because of its spatial interface.

problem: giving agents read/write access to the canvas

utility class system: prompt parts & agent actions

problem: chaos on canvas with multiple agents and multiple humans. what if you delete a shape while working?

sanitize before apply to catch hallucinations or illegal moves

interrupts to prevent illegal moves

problem: figuring out how to put things in the right space, and in the right order

`AgentViewportBoundsPartUtil`: each fairy works within its own bounds

FairyTask includes spatial bounds

when an orchestrator creates tasks, they assign specific regions (this is in `createFairyTask` in `CreateProjectTaskActionUtil`

instructed as part of the built prompt

problem: managing projects

FaeOS. break down request into projects and tasks and assign to different fairies. this meant building roles (orchestrator-worker) and modes for different phases of a project (using the utility class system)

problem: context engineering

designing prompts in the goldilocks zone, and adding memory levels to focus context

The source is available in the tldraw monorepo on github.

The agent starter kit makes it possible for you to implement your own version.

All of this is powered by tldraw’s infinite canvas SDK.

Multiplayer sync built-in

In fact, building fairies was partly an experiment in combining the agent starter with the multiplayer \*\*starter. Starter kits make it possible to rapidly prototype new products; we’re eager to see what you build.

Bringing agents to the canvas is just one of the problems we are interested in. We’re hiring product engineers in London. Come work with us.
