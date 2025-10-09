import { Editor } from '@tldraw/editor'
import { Atom } from '@tldraw/state'
import { AgentActionUtil } from '../actions/AgentActionUtil'
import { AgentRequest } from './AgentRequest'
import { AgentAction } from './AgentAction'
import { ChatHistoryItem } from './ChatHistoryItem'
import { TodoItem } from './TodoItem'
import { RecordsDiff } from '@tldraw/store'
import { TLRecord } from '@tldraw/tlschema'
import { VecModel } from '@tldraw/tlschema'
import { ContextItem } from './ContextItem'
import { AgentModelName } from '../models'
import { PromptPart } from './PromptPart'
import { PromptPartUtil } from '../parts/PromptPartUtil'
import { AgentInput } from './AgentInput'
import { AgentHelpers } from '../AgentHelpers'
import { AgentPrompt } from './AgentPrompt'
import { Streaming } from './Streaming'

export interface TldrawAgentOptions {
	/** The editor to associate the agent with. */
	editor: Editor
	/** A key used to differentiate the agent from other agents. */
	id: string
	/** A callback for when an error occurs. */
	onError(e: any): void
}

/**
 * Interface for the TldrawAgent.
 * Defines the public API of an agent that can be prompted to edit the canvas.
 */
export interface TldrawAgent {
	/** The editor associated with this agent. */
	editor: Editor

	/** An id to differentiate the agent from other agents. */
	id: string

	/** A callback for when an error occurs. */
	onError(e: any): void

	/** An atom containing the currently active request. */
	$activeRequest: Atom<AgentRequest | null>

	/** An atom containing the next request that the agent has scheduled for itself. */
	$scheduledRequest: Atom<AgentRequest | null>

	/** An atom containing the agent's chat history. */
	$chatHistory: Atom<ChatHistoryItem[]>

	/** An atom containing the position on the page where the current chat started. */
	$chatOrigin: Atom<VecModel>

	/** An atom containing the agent's todo list. */
	$todoList: Atom<TodoItem[]>

	/** An atom that's used to store document changes made by the user since the previous request. */
	$userActionHistory: Atom<RecordsDiff<TLRecord>[]>

	/** An atom containing currently selected context items. */
	$contextItems: Atom<ContextItem[]>

	/** An atom containing the model name that the user has selected. */
	$modelName: Atom<AgentModelName>

	/** A record of the agent's action util instances. */
	agentActionUtils: Record<AgentAction['_type'], AgentActionUtil<AgentAction>>

	/** The agent action util instance for the "unknown" action type. */
	unknownActionUtil: AgentActionUtil<AgentAction>

	/** A record of the agent's prompt part util instances. */
	promptPartUtils: Record<PromptPart['type'], PromptPartUtil<PromptPart>>

	/** Dispose of the agent by cancelling requests and stopping listeners. */
	dispose(): void

	/** Get an agent action util for a specific action type. */
	getAgentActionUtil(type?: string): AgentActionUtil<AgentAction>

	/** Get the util type for a provided action type. */
	getAgentActionUtilType(type?: string): string

	/** Get a prompt part util for a specific part type. */
	getPromptPartUtil(type: PromptPart['type']): PromptPartUtil<PromptPart>

	/** Get a full agent request from a user input by filling out any missing values with defaults. */
	getFullRequestFromInput(input: AgentInput): AgentRequest

	/** Get a full prompt based on a request. */
	preparePrompt(request: AgentRequest, helpers: AgentHelpers): Promise<AgentPrompt>

	/** Prompt the agent to edit the canvas. */
	prompt(input: AgentInput): Promise<void>

	/** Send a single request to the agent and handle its response. */
	request(input: AgentInput): Promise<any>

	/** Schedule further work for the agent to do after this request has finished. */
	schedule(input: AgentInput): void

	/** Manually override what the agent should do next. */
	setScheduledRequest(input: AgentInput | null): void

	/** Add a todo item to the agent's todo list. */
	addTodo(text: string): number

	/** Make the agent perform an action. */
	act(
		action: Streaming<AgentAction>,
		helpers?: AgentHelpers
	): { diff: RecordsDiff<TLRecord>; promise: Promise<void> | null }

	/** Cancel the agent's current prompt, if one is active. */
	cancel(): void

	/** Reset the agent's chat and memory. */
	reset(): void

	/** Check if the agent is currently working on a request or not. */
	isGenerating(): boolean

	/** Add a context item to the agent's context, ensuring that duplicates are not included. */
	addToContext(item: ContextItem): void

	/** Remove a context item from the agent's context. */
	removeFromContext(item: ContextItem): void

	/** Check if the agent's context contains a specific context item. */
	hasContextItem(item: ContextItem): boolean
}