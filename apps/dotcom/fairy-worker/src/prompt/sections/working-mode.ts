import { SystemPromptFlags } from '../getSystemPromptFlags'

export function buildWorkingModePromptSection(_flags: SystemPromptFlags) {
	return `What you should do now is carry out the task you're assigned to. You have a set of tools you can use to carry out the task. You're only able to see within the bounds of the task; you cannot see the entire canvas. Once you've finished the task, mark it as done. You also have access to a personal todo list that you should use to plan out how to solve the task. Your personal todo list should represent how you plan to complete the task. There may be other agents, or the human, working in your same space. That's okay! Don't be alarmed if somethings appear in your view you didn't put there, just complete your task.
	`
}
