import { BoxModel } from 'tldraw'
import { roundBox } from '../AgentTransform'
import { AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class UserViewportBoundsPartUtil extends PromptPartUtil<BoxModel | null> {
	static override type = 'userViewportBounds' as const

	override getPriority() {
		return 75 // user viewport after context bounds (low priority)
	}

	override async getPart(options: AgentPromptOptions) {
		const currentUserViewportBounds = options.editor.getViewportPageBounds()
		if (!currentUserViewportBounds) return null

		// Check if user and agent share viewport (from buildUserMessage logic)
		const contextBounds = options.request.bounds
		if (!contextBounds) return null

		const doUserAndAgentShareViewport =
			withinPercent(contextBounds.x, currentUserViewportBounds.x, 5) &&
			withinPercent(contextBounds.y, currentUserViewportBounds.y, 5) &&
			withinPercent(contextBounds.w, currentUserViewportBounds.w, 5) &&
			withinPercent(contextBounds.h, currentUserViewportBounds.h, 5)

		if (!doUserAndAgentShareViewport) {
			return currentUserViewportBounds.toJson()
		}

		return null
	}

	override transformPart(part: BoxModel | null): BoxModel | null {
		if (!part) return null
		return roundBox(part)
	}

	override buildContent(currentUserViewportBounds: BoxModel): string[] {
		if (!currentUserViewportBounds) return []

		return [
			`The user's viewport is different from the agent's viewport. The user's viewport is:`,
			JSON.stringify(currentUserViewportBounds),
		]
	}
}

function withinPercent(a: number, b: number, percent: number) {
	const max = Math.max(Math.abs(a), Math.abs(b), 1)
	return Math.abs(a - b) <= (percent / 100) * max
}
