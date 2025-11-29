import {
	type BaseRecord,
	createRecordMigrationSequence,
	createRecordType,
	idValidator,
	type RecordId,
	T,
} from 'tldraw'
import {
	faeChatHistoryAcceptanceValidator,
	faeChatHistoryPromptItemPromptSourceValidator,
	faeMemoryLevelValidator,
	jsonValueValidator,
} from './fae-validators'

/**
 * Validator for prompt chat history items
 * promptSource: user | self | other-agent
 * userFacingMessage can be null
 * memoryLevel: fairy | project | task
 */
export const FaeChatHistoryPromptValidator = T.object({
	id: T.optional(T.string),
	type: T.literal('prompt'),
	promptSource: faeChatHistoryPromptItemPromptSourceValidator,
	agentFacingMessage: T.string,
	userFacingMessage: T.string.nullable(),
	memoryLevel: faeMemoryLevelValidator,
})
export type FaeChatHistoryPrompt = T.TypeOf<typeof FaeChatHistoryPromptValidator>

/**
 * Validator for action chat history items
 * action: Streaming<AgentAction> - the streaming action from the agent
 * diff: RecordsDiff<TLRecord> - the changes made by the action
 * acceptance: pending | accepted | rejected - whether the action was accepted
 */
export const FaeChatHistoryActionItemValidator = T.object({
	id: T.optional(T.string),
	type: T.literal('action'),
	action: T.any, // Streaming<AgentAction> - complex type
	diff: T.any, // RecordsDiff<TLRecord>
	acceptance: faeChatHistoryAcceptanceValidator,
	memoryLevel: faeMemoryLevelValidator,
})

export type FaeChatHistoryActionItem = T.TypeOf<typeof FaeChatHistoryActionItemValidator>

/**
 * Validator for continuation chat history items
 * data: JsonValue[] - data retrieved from the previous request
 * memoryLevel: fairy | project | task
 */
const FaeChatHistoryContinuationValidator = T.object({
	id: T.string.optional(),
	type: T.literal('continuation'),
	data: T.arrayOf(jsonValueValidator), // JsonValue[]
	memoryLevel: faeMemoryLevelValidator,
})
export type FaeChatHistoryContinuationItem = T.TypeOf<typeof FaeChatHistoryContinuationValidator>

/**
 * Validator for memory transition chat history items
 * Marks a transition between memory levels
 * userFacingMessage can be null
 */
export const FaeChatHistoryMemoryTransitionItemValidator = T.object({
	id: T.optional(T.string),
	type: T.literal('memory-transition'),
	memoryLevel: faeMemoryLevelValidator,
	agentFacingMessage: T.string,
	userFacingMessage: T.string.nullable(),
})
export type FaeChatHistoryMemoryTransitionItem = T.TypeOf<
	typeof FaeChatHistoryMemoryTransitionItemValidator
>

/**
 * Validator for ChatHistoryItem union type
 * Validates prompt, action, continuation, or memory-transition chat history entries
 */
export const FaeChatHistoryItemInfoValidator = T.union('type', {
	prompt: FaeChatHistoryPromptValidator,
	action: FaeChatHistoryActionItemValidator,
	continuation: FaeChatHistoryContinuationValidator,
	'memory-transition': FaeChatHistoryMemoryTransitionItemValidator,
})
export type FaeChatHistoryItemInfo = T.TypeOf<typeof FaeChatHistoryItemInfoValidator>

// todo: could use subtypes here

export interface FaeChatHistoryItemRecord
	extends BaseRecord<'fairy-chat-history-item', FaeChatHistoryItemId> {
	info: FaeChatHistoryItemInfo
}

export type FaeChatHistoryItemId = RecordId<FaeChatHistoryItemRecord>

const FaeChatHistoryItemValidator = T.object<FaeChatHistoryItemRecord>({
	id: idValidator<FaeChatHistoryItemId>('fairy-chat-history-item'),
	typeName: T.literal('fairy-chat-history-item'),
	info: FaeChatHistoryItemInfoValidator,
})
export type FaeChatHistoryItem = T.TypeOf<typeof FaeChatHistoryItemValidator>

export const faeChatHistoryItemRecordType = createRecordType<FaeChatHistoryItemRecord>(
	'fairy-chat-history-item',
	{
		validator: FaeChatHistoryItemValidator,
		scope: 'session',
	}
)

export const faeChatHistoryItemMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.chat-history-item',
	recordType: 'fairy-chat-history-item',
	sequence: [],
})
