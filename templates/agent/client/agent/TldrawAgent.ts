import { atom, Editor, RecordsDiff, TLRecord } from 'tldraw'
import { AgentActionUtil } from '../../shared/actions/AgentActionUtil'
import { getAgentActionUtilsRecord, getPromptPartUtilsRecord } from '../../shared/AgentUtils'
import { PromptPartUtil } from '../../shared/parts/PromptPartUtil'
import { AgentAction } from '../../shared/types/AgentAction'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { IChatHistoryItem } from '../../shared/types/ChatHistoryItem'
import { PromptPart } from '../../shared/types/PromptPart'
import { TodoItem } from '../../shared/types/TodoItem'
import { $modelName } from '../atoms/modelName'
import { persistAtomInLocalStorage } from '../atoms/persistAtomInLocalStorage'
import { promptAgent } from './promptAgent'

export class TldrawAgent {
	/** The editor associated with this agent. */
	public editor: Editor

	/** A key used to persist the agent's state to localStorage. */
	public persistenceKey: string

	/** A function to call when an error occurs. */
	public onError: (e: any) => void

	/**
	 * An atom containing the current request.
	 * This is mainly used to render highlights and other UI elements.
	 */
	$currentRequest = atom<AgentRequest | null>('currentRequest', null)

	/**
	 * An atom containing the next request that the agent has scheduled for itself.
	 * Null if there is no scheduled request.
	 */
	$scheduledRequest = atom<AgentRequest | null>('scheduledRequest', null)

	/** An atom containing the todo list that the agent may write for itself. */
	$todoList = atom<TodoItem[]>('todoList', [])

	/** An atom containing the chat history. */
	$chatHistory = atom<IChatHistoryItem[]>('chatHistory', [])

	/** An atom that is used to store document changes that the user makes. */
	$userActionsHistory = atom<RecordsDiff<TLRecord>[]>('userActionsHistory', [])

	constructor({
		editor,
		persistenceKey,
		onError,
	}: {
		editor: Editor
		persistenceKey: string
		onError: (e: any) => void
	}) {
		this.editor = editor
		this.persistenceKey = persistenceKey
		this.onError = onError

		this.agentActionUtilsRecord = getAgentActionUtilsRecord()
		this.promptPartUtilsRecord = getPromptPartUtilsRecord()
		this.unknownActionUtil = this.agentActionUtilsRecord.unknown

		persistAtomInLocalStorage(this.$chatHistory, 'chat-history-items')
		persistAtomInLocalStorage(this.$todoList, 'todo-items')
	}

	/**
	 * Get an agent action util for a specific action type.
	 *
	 * @param type - The type of action to get the util for.
	 * @returns The action util.
	 */
	getAgentActionUtil(type?: string) {
		if (!type) return this.unknownActionUtil
		const util = this.agentActionUtilsRecord[type as AgentAction['_type']]
		if (!util) return this.unknownActionUtil
		return util
	}

	/**
	 * Get a prompt part util for a specific part type.
	 *
	 * @param type - The type of part to get the util for.
	 * @returns The part util.
	 */
	getPromptPartUtil(type: PromptPart['type']) {
		return this.promptPartUtilsRecord[type]
	}

	/**
	 * A record of the agent's action util instances.
	 * Used by the `getAgentActionUtil` method.
	 */
	private agentActionUtilsRecord: Record<AgentAction['_type'], AgentActionUtil<AgentAction>>

	/**
	 * The agent action util instance for the "unknown" action type.
	 * Returned by the `getAgentActionUtil` method when the action type isn't properly specified.
	 * This can happen if the model isn't finished streaming yet or makes a mistake.
	 */
	private unknownActionUtil: AgentActionUtil<AgentAction>

	/**
	 * A record of the agent's prompt part util instances.
	 * Used by the `getPromptPartUtil` method.
	 */
	private promptPartUtilsRecord: Record<PromptPart['type'], PromptPartUtil<PromptPart>>

	/**
	 * Prompt the agent to edit the canvas.
	 *
	 * @example
	 * ```tsx
	 * const agent = useTldrawAgent({ editor })
	 * agent.prompt({ message: 'Draw a snowman' })
	 * ```
	 *
	 * @returns A promise that resolves when the agent has finished editing the canvas.
	 */
	prompt({
		message = '',
		bounds = this.editor.getViewportPageBounds(),
		contextItems = [],
		modelName = $modelName.get(),
		type = 'user',
	}: Partial<AgentRequest>) {
		return promptAgent({
			agent: this,
			agentActionsUtils: this.agentActionUtilsRecord,
			promptPartUtils: this.promptPartUtilsRecord,
			request: {
				message,
				bounds,
				contextItems,
				modelName,
				type,
			},
			onError: this.onError,
		})
	}

	/**
	 * Start recording document changes.
	 * @returns A cleanup function to stop recording changes.
	 */
	startRecordingDocumentChanges() {
		const cleanUp = this.editor.store.listen(
			(change) => {
				this.$userActionsHistory.update((prev) => [...prev, change.changes])
			},
			{ scope: 'document', source: 'user' }
		)

		return cleanUp
	}
}
