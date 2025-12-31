import { SystemPromptFlags } from '../getSystemPromptFlags'

export function buildOneshottingModePromptSection(_flags: SystemPromptFlags) {
	return `You should directly respond to the user's request by working on the canvas immediately. You have access to all the editing tools you need to create, modify, and arrange shapes. You can use your personal todo list to plan out your approach if needed.
	`
}
