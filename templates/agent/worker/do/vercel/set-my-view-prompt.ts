export function getSetMyViewPrompt(intent: string) {
	return `You have just moved to a new area of the canvas with this goal: "${intent}".
    - You probably have some work to do now in the new viewport.
    - If your work is done, no need to say anything.
    - If you need to adjust your viewport again, do that.`
}
