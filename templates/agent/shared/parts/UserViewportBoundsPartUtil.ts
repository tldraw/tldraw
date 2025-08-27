import { Box, BoxModel } from 'tldraw'
import { roundBox } from '../AgentTransform'
import { AgentPrompt, AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUtil'

export class UserViewportBoundsPartUtil extends PromptPartUtil<BoxModel | null> {
	static override type = 'userViewportBounds' as const

	override getPriority() {
		return 75 // user viewport after context bounds (low priority)
	}

	override async getPart(options: AgentPromptOptions) {
		const currentUserViewportBounds = options.editor.getViewportPageBounds()
		if (!currentUserViewportBounds) return null

		return currentUserViewportBounds.toJson()
	}

	override transformPart(part: BoxModel | null): BoxModel | null {
		if (!part) return null
		return roundBox(part)
	}

	override buildContent(currentUserViewportBounds: BoxModel, prompt: AgentPrompt): string[] {
		if (!currentUserViewportBounds) return []

		const agentViewportBounds: BoxModel = prompt.agentViewportBounds

		// all this stuff below is logic to give the agent a more detailed description of the user's view, helping it stay grounded on the canvas
		const doUserAndAgentShareViewport =
			withinPercent(agentViewportBounds.x, currentUserViewportBounds.x, 5) &&
			withinPercent(agentViewportBounds.y, currentUserViewportBounds.y, 5) &&
			withinPercent(agentViewportBounds.w, currentUserViewportBounds.w, 5) &&
			withinPercent(agentViewportBounds.h, currentUserViewportBounds.h, 5)

		const agentViewportBoundsBox = Box.From(agentViewportBounds)
		const currentUserViewportBoundsBox = Box.From(currentUserViewportBounds)

		const agentContainsUser = agentViewportBoundsBox.contains(currentUserViewportBoundsBox)
		const userContainsAgent = currentUserViewportBoundsBox.contains(agentViewportBoundsBox)

		let relativeViewportDescription: string = ''

		if (doUserAndAgentShareViewport) {
			relativeViewportDescription = 'is the same as'
		} else {
			if (agentContainsUser) {
				relativeViewportDescription = 'contains'
			} else if (userContainsAgent) {
				relativeViewportDescription = 'is contained by'
			} else {
				relativeViewportDescription = getRelativePositionDescription(
					agentViewportBounds,
					currentUserViewportBounds
				)
			}
		}

		const response = [`The user's view is ${relativeViewportDescription} your view.`]

		if (!doUserAndAgentShareViewport) {
			// if they share a viewport, we don't need to say anything about the bounds
			response.push(
				`The bounds of what the user can see are:`,
				JSON.stringify(currentUserViewportBounds)
			)
		}

		return response
	}
}

function withinPercent(a: number, b: number, percent: number) {
	const max = Math.max(Math.abs(a), Math.abs(b), 1)
	return Math.abs(a - b) <= (percent / 100) * max
}

/**
 * Determines the relative position of box B from box A's perspective.
 */
export function getRelativePositionDescription(boxA: BoxModel, boxB: BoxModel): string {
	// Find centers of both boxes
	const centerA = {
		x: boxA.x + boxA.w / 2,
		y: boxA.y + boxA.h / 2,
	}

	const centerB = {
		x: boxB.x + boxB.w / 2,
		y: boxB.y + boxB.h / 2,
	}

	// Calculate the difference vector from A to B
	const dx = centerB.x - centerA.x
	const dy = centerB.y - centerA.y

	// Handle the case where centers are the same
	if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
		return 'is concentric with'
	}

	// Calculate angle from A to B (in radians)
	const angle = Math.atan2(dy, dx)

	// Convert to degrees and normalize to 0-360
	let degrees = (angle * 180) / Math.PI
	if (degrees < 0) degrees += 360

	// Map degrees to 8 cardinal/ordinal directions
	// 0° = right, 90° = bottom, 180° = left, 270° = top
	if (degrees >= 337.5 || degrees < 22.5) return 'to the right of'
	if (degrees >= 22.5 && degrees < 67.5) return 'to the bottom right of'
	if (degrees >= 67.5 && degrees < 112.5) return 'below'
	if (degrees >= 112.5 && degrees < 157.5) return 'to the bottom left of'
	if (degrees >= 157.5 && degrees < 202.5) return 'to the left of'
	if (degrees >= 202.5 && degrees < 247.5) return 'to the top left of'
	if (degrees >= 247.5 && degrees < 292.5) return 'above'
	if (degrees >= 292.5 && degrees < 337.5) return 'to the top right of'

	return 'is different from'
}
