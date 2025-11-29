import type { FocusColor } from '@tldraw/fairy-shared'
import { T } from 'tldraw'

// For now
export const jsonValueValidator = T.any

export const focusColorValidator = T.setEnum(
	new Set<FocusColor>([
		'red',
		'light-red',
		'green',
		'light-green',
		'blue',
		'light-blue',
		'orange',
		'yellow',
		'black',
		'violet',
		'light-violet',
		'grey',
		'white',
	])
)

export const faeProjectRoleValidator = T.setEnum(
	new Set(['orchestrator', 'duo-orchestrator', 'drone'])
)
export type FaeProjectRole = T.TypeOf<typeof faeProjectRoleValidator>

export const faeProjectMemberValidator = T.object({
	id: T.string,
	role: faeProjectRoleValidator,
})
export type FaeProjectMember = T.TypeOf<typeof faeProjectMemberValidator>

export const faeFairyPoseValidator = T.setEnum(
	new Set(['sleeping', 'idling', 'working', 'thinking', 'poof'])
)
export type FaeFairyPose = T.TypeOf<typeof faeFairyPoseValidator>

export const faeFairyModeValidator = T.setEnum(
	new Set(['sleeping', 'idling', 'working', 'thinking', 'poof'])
)
export type FaeFairyMode = T.TypeOf<typeof faeFairyModeValidator>

export const faeTodoItemStatusValidator = T.setEnum(new Set(['todo', 'done']))
export type FaeTodoItemStatus = T.TypeOf<typeof faeTodoItemStatusValidator>

export const faeMemoryLevelValidator = T.setEnum(new Set(['fairy', 'project', 'task']))
export type FaeMemoryLevel = T.TypeOf<typeof faeMemoryLevelValidator>

export const faeChatHistoryAcceptanceValidator = T.setEnum(
	new Set(['pending', 'accepted', 'rejected'])
)
export type FaeChatHistoryActionItemAcceptance = T.TypeOf<typeof faeChatHistoryAcceptanceValidator>

export const faeChatHistoryPromptItemPromptSourceValidator = T.setEnum(
	new Set(['user', 'self', 'other-agent'])
)
export type FaeChatHistoryPromptItemPromptSource = T.TypeOf<
	typeof faeChatHistoryPromptItemPromptSourceValidator
>

// Validators for nested types
export const VecModelValidator = T.object({
	x: T.number,
	y: T.number,
})

export const FaeFairyEntityValidator = T.object({
	position: VecModelValidator,
	flipX: T.boolean,
	isSelected: T.boolean,
	pose: faeFairyPoseValidator,
	gesture: T.string.nullable(),
	currentPageId: T.string,
})
export type FaeFairyEntity = T.TypeOf<typeof FaeFairyEntityValidator>

export const FaeFairyConfigValidator = T.object({
	name: T.string,
	model: T.string,
})
export type FaeFairyConfig = T.TypeOf<typeof FaeFairyConfigValidator>

export const FaeFairyDebugFlagsValidator = T.object({
	logSystemPrompt: T.boolean,
	logMessages: T.boolean,
	logResponseTime: T.boolean,
})
export type FaeFairyDebugFlags = T.TypeOf<typeof FaeFairyDebugFlagsValidator>
