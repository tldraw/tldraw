export function getReviewPrompt(intent: string) {
	return `Examine the actions that you (the agent) took since the most recent user message, with the intent: "${intent}". What's next?

- Are you awaiting a response from the user? If so, there's no need to do or say anything.
- Is there still more work to do? If so, continue it.
- Is the task supposed to be complete? If so, it's time to review the results of that. Did you do what the user asked for? Did the plan work? Think through your findings and pay close attention to the screenshot because that's what the user sees. If you make any corrections, let the user know what you did and why. If no corrections are needed, there's no need to say anything.`
}
