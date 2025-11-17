import { Box, BoxModel, JsonValue } from 'tldraw'
import { BlurryShape } from '../format/BlurryShape'
import { FocusedShapePartial, FocusedShapeType } from '../format/FocusedShape'
import { OtherFairy } from '../format/OtherFairy'
import { PeripheralCluster } from '../format/PeripheralCluster'
import { AgentMessage, AgentMessageContent } from '../types/AgentMessage'
import { BasePromptPart } from '../types/BasePromptPart'
import { ChatHistoryItem } from '../types/ChatHistoryItem'
import { FairyProject, FairyProjectRole } from '../types/FairyProject'
import { FairyTask, FairyTodoItem } from '../types/FairyTask'
import { FairyWork } from '../types/FairyWork'
import { ActiveFairyModeDefinition } from './FairyModeDefinition'

export interface PromptPartDefinition<T extends BasePromptPart> {
	/**
	 * The unique type of the prompt part.
	 */
	type: T['type']

	/**
	 * The priority of the prompt part. Higher priority = later in the prompt.
	 */
	priority?: number

	/**
	 * Override the default buildContent function to choose which content to send to the model.
	 */
	buildContent?(part: T): string[]

	/**
	 * Override the default buildMessages function to choose how to turn content into AgentMessages.
	 */
	buildMessages?(part: T): AgentMessage[]
}

// BlurryShapesPart
export interface BlurryShapesPart {
	type: 'blurryShapes'
	shapes: BlurryShape[]
}

export const BlurryShapesPartDefinition: PromptPartDefinition<BlurryShapesPart> = {
	type: 'blurryShapes',
	priority: -70,
	buildContent(part: BlurryShapesPart) {
		const { shapes } = part
		if (!shapes || shapes.length === 0) {
			return ['There are no shapes in your view at the moment.']
		}

		return [`These are the shapes you can currently see:`, JSON.stringify(shapes)]
	},
}

// ChatHistoryPart
export interface ChatHistoryPart {
	type: 'chatHistory'
	items: ChatHistoryItem[] | null
}

const CHAT_HISTORY_PRIORITY = 999999

export const ChatHistoryPartDefinition: PromptPartDefinition<ChatHistoryPart> = {
	type: 'chatHistory',
	priority: CHAT_HISTORY_PRIORITY,
	buildContent() {
		return []
	},
	buildMessages({ items }: ChatHistoryPart) {
		if (!items) return []

		const messages: AgentMessage[] = []
		const priority = CHAT_HISTORY_PRIORITY

		// If the last message is from the user, skip it
		const lastIndex = items.length - 1
		let end = items.length
		if (end > 0 && items[lastIndex].type === 'prompt') {
			end = lastIndex
		}

		for (let i = 0; i < end; i++) {
			const item = items[i]
			const message = buildHistoryItemMessage(item, priority)
			if (message) messages.push(message)
		}

		return messages
	},
}

function buildHistoryItemMessage(item: ChatHistoryItem, priority: number): AgentMessage | null {
	switch (item.type) {
		case 'prompt': {
			const content: AgentMessageContent[] = []

			if (item.message.trim() !== '') {
				content.push({
					type: 'text',
					text: item.message,
				})
			}

			if (content.length === 0) {
				return null
			}

			return {
				role: 'user',
				content,
				priority,
			}
		}
		case 'continuation': {
			if (item.data.length === 0) {
				return null
			}
			const text = `[DATA RETRIEVED]: ${JSON.stringify(item.data)}`
			return {
				role: 'assistant',
				content: [{ type: 'text', text }],
				priority,
			}
		}
		case 'action': {
			const { action } = item
			let text: string
			switch (action._type) {
				case 'message': {
					text = action.text || '<message data lost>'
					break
				}
				case 'think': {
					text = '[THOUGHT]: ' + (action.text || '<thought data lost>')
					break
				}
				default: {
					const { complete: _complete, time: _time, ...rawAction } = action || {}
					text = '[ACTION]: ' + JSON.stringify(rawAction)
					break
				}
			}
			return {
				role: 'assistant',
				content: [{ type: 'text', text }],
				priority,
			}
		}
	}
}

// DataPart
export interface DataPart {
	type: 'data'
	data: JsonValue[]
}

export const DataPartDefinition: PromptPartDefinition<DataPart> = {
	type: 'data',
	priority: 200,
	buildContent({ data }: DataPart) {
		if (data.length === 0) return []

		const formattedData = data.map((item) => {
			return `${JSON.stringify(item)}`
		})

		return ["Here's the data you requested:", ...formattedData]
	},
}

// MessagesPart
export interface MessagesPart {
	type: 'messages'
	messages: string[]
	source: 'user' | 'self' | 'other-agent'
}

export const MessagesPartDefinition: PromptPartDefinition<MessagesPart> = {
	type: 'messages',
	priority: Infinity,
	buildContent({ messages, source }: MessagesPart) {
		switch (source) {
			case 'user':
				return [...messages]
			case 'self':
				return [...messages]
			case 'other-agent':
				return [...messages]
		}
	},
}

// OtherFairiesPart
export interface OtherFairiesPart {
	type: 'otherFairies'
	otherFairies: OtherFairy[]
	thisFairy: OtherFairy
}

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

// PeripheralShapesPart
export interface PeripheralShapesPart {
	type: 'peripheralShapes'
	clusters: PeripheralCluster[] | null
}

export const PeripheralShapesPartDefinition: PromptPartDefinition<PeripheralShapesPart> = {
	type: 'peripheralShapes',
	priority: -65,
	buildContent({ clusters }: PeripheralShapesPart) {
		if (!clusters || clusters.length === 0) {
			return []
		}
		return [
			"There are some groups of shapes in your peripheral vision, outside the your main view. You can't make out their details or content. If you want to see their content, you need to get closer. The groups are as follows",
			JSON.stringify(clusters),
		]
	},
}

// PersonalityPart
export interface PersonalityPart {
	type: 'personality'
	personality: string
}

export const PersonalityPartDefinition: PromptPartDefinition<PersonalityPart> = {
	type: 'personality',
	priority: 150,
	buildContent({ personality }: PersonalityPart) {
		if (!personality || personality.trim() === '') {
			return []
		}
		return [
			`You are actually a specific kind of AI agent; a fairy! And so is everyone else (besides the user). So, if you hear other agents (or the user) refer to you or anyone else as a fairy, that's why.`,
			`Your personality is: ${personality}`,
		]
	},
}

// ScreenshotPart
export interface ScreenshotPart {
	type: 'screenshot'
	screenshot: string | null
}

export const ScreenshotPartDefinition: PromptPartDefinition<ScreenshotPart> = {
	type: 'screenshot',
	priority: -40,
	buildContent({ screenshot }: ScreenshotPart) {
		if (!screenshot) return []
		return [
			'Here is the part of the canvas that you can currently see at this moment. It is not a reference image.',
			screenshot,
		]
	},
}

// SelectedShapesPart
export interface SelectedShapesPart {
	type: 'selectedShapes'
	shapeIds: string[]
}

export const SelectedShapesPartDefinition: PromptPartDefinition<SelectedShapesPart> = {
	type: 'selectedShapes',
	priority: -55,
	buildContent({ shapeIds }: SelectedShapesPart) {
		if (!shapeIds || shapeIds.length === 0) {
			return []
		}

		if (shapeIds.length === 1) {
			return [`The user has this shape selected: ${shapeIds[0]}`]
		}

		return [`The user has these shapes selected: ${shapeIds.join(', ')}`]
	},
}

// SharedTodoListPart
export interface SoloTasksPart {
	type: 'soloTasks'
	tasks: Array<FairyTask>
}

export const SoloTasksPartDefinition: PromptPartDefinition<SoloTasksPart> = {
	type: 'soloTasks',
	priority: -10,
	buildContent(part: SoloTasksPart) {
		if (part.tasks.length === 0) {
			return ['There are no tasks at the moment.']
		}

		const taskContent = part.tasks.map((task) => {
			return `Task ${task.id} [${task.status}]: "${task.text}"`
		})

		if (taskContent.length === 1) {
			return [`Here is the task assigned to you:`, taskContent[0]]
		}

		return [`Here are all the tasks assigned to you:`, ...taskContent]
	},
}

// WorkingTasksPart
export interface WorkingTasksPart {
	type: 'workingTasks'
	tasks: Array<FairyTask>
}

export const WorkingTasksPartDefinition: PromptPartDefinition<WorkingTasksPart> = {
	type: 'workingTasks',
	priority: -10,
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

// SharedTodoListPart
export interface SharedTodoListPart {
	type: 'sharedTodoList'
	items: Array<FairyTask & { fairyName: string }>
}

export const SharedTodoListPartDefinition: PromptPartDefinition<SharedTodoListPart> = {
	type: 'sharedTodoList',
	priority: -10,
	buildContent(part: SharedTodoListPart) {
		if (part.items.length === 0) {
			return ['There are no shared todo items at the moment.']
		}

		const itemContent = part.items.map((item) => {
			let text = `Todo ${item.id} [${item.status}]: "${item.text}"`
			if (item.fairyName) {
				text += ` (assigned to: ${item.fairyName})`
			}
			if (item.x && item.y) {
				text += ` (position: x: ${item.x}, y: ${item.y})`
			}
			return text
		})

		if (itemContent.length === 1) {
			return [`Here is the shared todo item:`, itemContent[0]]
		}

		return [`Here are all the shared todo items:`, ...itemContent]
	},
}

// TodoListPart
export interface PersonalTodoListPart {
	type: 'personalTodoList'
	items: FairyTodoItem[]
}

export const PersonalTodoListPartDefinition: PromptPartDefinition<PersonalTodoListPart> = {
	type: 'personalTodoList',
	priority: 10,
	buildContent(part: PersonalTodoListPart) {
		if (part.items.length === 0) {
			return [
				'You have no personal todos yet. Use the `update-personal-todo-list` action to create a todo.',
			]
		}
		return [
			`Here is your current personal todo list for the task at hand:`,
			JSON.stringify(part.items),
		]
	},
}

// CurrentProjectPart
export interface CurrentProjectPart {
	type: 'currentProject'
	currentProject: FairyProject | null
	currentProjectTasks: FairyTask[]
	role: FairyProjectRole | null
}

export const CurrentProjectPartDefinition: PromptPartDefinition<CurrentProjectPart> = {
	type: 'currentProject',
	priority: -5,
	buildContent(part: CurrentProjectPart) {
		const { currentProject, currentProjectTasks, role } = part

		if (!currentProject) {
			return ['There is no current project.']
		}

		const baseResponse = [
			`You are currently working on project "${currentProject.title}".`,
			`Project description: ${currentProject.description}`,
			`Project color: ${currentProject.color}`,
		]

		// do we want to split part into multiple parts? should we be more clear about which roles have access to what?
		if (role === 'orchestrator') {
			const orchestratorResponse = [
				`You came up with this project plan:\n${currentProject.plan}`,
				`Project members:\n${currentProject.members.map((m) => `${m.id} (${m.role})`).join(', ')}`,
				currentProjectTasks.length > 0
					? `Tasks in the project and their status:\n${currentProjectTasks.map((t) => `id: ${t.id}, ${t.text}, status: ${t.status}`).join(', ')}`
					: 'There are no tasks in the project.',
			]
			return baseResponse.concat(orchestratorResponse)
		}

		return baseResponse
	},
}

// TimePart
export interface TimePart {
	type: 'time'
	time: string
}

export const TimePartDefinition: PromptPartDefinition<TimePart> = {
	type: 'time',
	priority: -100,
	buildContent({ time }: TimePart) {
		return ["The user's current time is:", time]
	},
}

// UserActionHistoryPart
export interface UserActionHistoryPart {
	type: 'userActionHistory'
	added: Array<{
		shapeId: string
		type: FocusedShapeType
	}>
	removed: Array<{
		shapeId: string
		type: FocusedShapeType
	}>
	updated: Array<{
		shapeId: string
		type: FocusedShapeType
		before: FocusedShapePartial
		after: FocusedShapePartial
	}>
}

export const UserActionHistoryPartDefinition: PromptPartDefinition<UserActionHistoryPart> = {
	type: 'userActionHistory',
	priority: -40,
	buildContent(part: UserActionHistoryPart) {
		const { updated, removed, added } = part
		if (updated.length === 0 && removed.length === 0 && added.length === 0) {
			return []
		}
		return [
			'Since the previous request, the user has made the following changes to the canvas:',
			JSON.stringify(part),
		]
	},
}

// UserViewportBoundsPart
export interface UserViewportBoundsPart {
	type: 'userViewportBounds'
	userBounds: BoxModel | null
}

export const UserViewportBoundsPartDefinition: PromptPartDefinition<UserViewportBoundsPart> = {
	type: 'userViewportBounds',
	priority: -80,
	buildContent({ userBounds }: UserViewportBoundsPart) {
		if (!userBounds) {
			return []
		}
		const userViewCenter = Box.From(userBounds).center
		return [`The user's view is centered at (${userViewCenter.x}, ${userViewCenter.y}).`]
	},
}

// AgentViewportBoundsPart
export interface AgentViewportBoundsPart {
	type: 'agentViewportBounds'
	agentBounds: BoxModel | null
}

export const AgentViewportBoundsPartDefinition: PromptPartDefinition<AgentViewportBoundsPart> = {
	type: 'agentViewportBounds',
	priority: -80,
	buildContent({ agentBounds }: AgentViewportBoundsPart) {
		if (!agentBounds) {
			return []
		}
		return [
			`The bounds of the part of the canvas that you can currently see are: ${JSON.stringify(agentBounds)}`,
		]
	},
}

// PagesPart
export interface PagesPart {
	type: 'pages'
	pages: Array<{
		id: string
		name: string
	}>
	currentPageId: string
	currentPageName: string
}

export const PagesPartDefinition: PromptPartDefinition<PagesPart> = {
	type: 'pages',
	priority: -60,
	buildContent(part: PagesPart) {
		const { pages, currentPageName } = part
		if (!pages || pages.length === 0) {
			return ['There are no pages available.']
		}

		const pageList = pages.map((p) => `- ${p.name}`).join('\n')
		return [
			`You are currently on page "${currentPageName}".`,
			`Available pages:\n${pageList}`,
			//'You can change to a different page using the "change-page" action, or create a new page using the "create-page" action.',
		]
	},
}

// ModePart
export interface ModePart {
	type: 'mode'
	mode: ActiveFairyModeDefinition['type']
	work: FairyWork
}

export const ModePartDefinition: PromptPartDefinition<ModePart> = {
	type: 'mode',
}

// DebugPart
export interface DebugPart {
	type: 'debug'
	logSystemPrompt: boolean
	logMessages: boolean
}

export const DebugPartDefinition: PromptPartDefinition<DebugPart> = {
	type: 'debug',
}
