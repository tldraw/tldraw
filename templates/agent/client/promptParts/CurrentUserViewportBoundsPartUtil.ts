import { TLAgentPrompt, TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class CurrentUserViewportBoundsPartUtil extends PromptPartUtil {
	static override type = 'currentUserViewportBounds' as const

	static override getPriority(_prompt: TLAgentPrompt): number {
		return 75 // user viewport after context bounds (low priority)
	}

	override async getPart(options: TLAgentPromptOptions) {
		const currentUserViewportBounds = options.editor.getViewportPageBounds()
		if (!currentUserViewportBounds) return undefined
		return currentUserViewportBounds
	}

	static override buildContent(
		_prompt: TLAgentPrompt,
		currentUserViewportBounds: any,
		contextBounds?: any
	): string[] {
		if (!contextBounds) return []

		// Check if user and agent share viewport (from buildUserMessage logic)
		const withinPercent = (a: number, b: number, percent: number) => {
			const max = Math.max(Math.abs(a), Math.abs(b), 1)
			return Math.abs(a - b) <= (percent / 100) * max
		}
		const doUserAndAgentShareViewport =
			withinPercent(contextBounds.x, currentUserViewportBounds.x, 5) &&
			withinPercent(contextBounds.y, currentUserViewportBounds.y, 5) &&
			withinPercent(contextBounds.w, currentUserViewportBounds.w, 5) &&
			withinPercent(contextBounds.h, currentUserViewportBounds.h, 5)

		if (!doUserAndAgentShareViewport) {
			return [
				`The user's viewport is different from the agent's viewport. The user's viewport is:`,
				JSON.stringify(currentUserViewportBounds),
			]
		}

		return []
	}
}
