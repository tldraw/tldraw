import { Box, FileHelpers } from 'tldraw'
import { ScreenshotPart } from '../../shared/schema/PromptPartDefinitions'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

export const ScreenshotPartUtil = registerPromptPartUtil(
	class ScreenshotPartUtil extends PromptPartUtil<ScreenshotPart> {
		static override type = 'screenshot' as const

		override async getPart(request: AgentRequest): Promise<ScreenshotPart> {
			const shapes = this.getShapesInBounds(request.bounds)
			if (shapes.length === 0) {
				return { type: 'screenshot', screenshot: '' }
			}

			const largestDimension = Math.max(request.bounds.w, request.bounds.h)
			const scale = largestDimension > 8000 ? 8000 / largestDimension : 1

			const result = await this.editor.toImage(shapes, {
				format: 'jpeg',
				background: true,
				bounds: Box.From(request.bounds),
				padding: 0,
				pixelRatio: 1,
				scale,
			})

			return {
				type: 'screenshot',
				screenshot: await FileHelpers.blobToDataUrl(result.blob),
			}
		}
	}
)
