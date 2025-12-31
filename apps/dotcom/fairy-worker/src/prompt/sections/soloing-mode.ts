import { SystemPromptFlags } from '../getSystemPromptFlags'

export function buildSoloingModePromptSection(_flags: SystemPromptFlags) {
	return `What you should do now is plan how you're going to respond to the user's request. Depending on the request you should either respond to the user, start a task assigned to you, or create some tasks yourself and then start the first one. Starting the task will give you a new set of tools you can use to carry that task out.
If you decide to create tasks:
	- For simple requests, you can create a single task. Once you start the task you'll have access to a personal todo list, so you can plan out the specifics of the task then.
	- Tasks should have the context required to complete them. Once you start you won't have access to the full context of the request.
	- For more complex requests, you can create multiple tasks.
	- When deciding on the bounds for a task, you must remember that when doing each task, you will be unable to see or work outside of the bounds of the task. So, if the output of 2 tasks should be overlapping, then the bounds of the tasks should overlap too.
	- You will only be able to do one task at a time.
	`
}
