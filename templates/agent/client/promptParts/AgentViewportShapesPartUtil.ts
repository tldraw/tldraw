import { Box } from 'tldraw'
import { ISimpleShape } from '../../worker/simple/SimpleShape'
import { AgentTransform } from '../AgentTransform'
import { getWholePageContent } from '../ai/promptConstruction/getWholePageContent'
import { convertShapeToSimpleShape } from '../ai/promptConstruction/translateFromDrawishToSimplish'
import { AgentPrompt, AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class AgentViewportShapesPartUtil extends PromptPartUtil {
	static override type = 'agentViewportShapes' as const

	static override getPriority(_prompt: AgentPrompt): number {
		return 70 // viewport shapes after bounds (low priority)
	}

	override async getPart(options: AgentPromptOptions) {
		const currentPageContent = getWholePageContent({ editor: this.editor })
		const contextBounds = options.request?.bounds
		if (!contextBounds) return undefined

		const shapes = currentPageContent.shapes
			.map((shape) => {
				const bounds = this.editor.getShapeMaskedPageBounds(shape)
				if (!bounds) return null
				if (!Box.From(contextBounds).includes(bounds)) return null
				return convertShapeToSimpleShape(shape, this.editor)
			})
			.filter((s) => s !== null)

		return shapes
	}

	override transformPromptPart(
		promptPart: ISimpleShape[],
		transform: AgentTransform,
		_prompt: Partial<AgentPrompt>
	): ISimpleShape[] {
		return promptPart
			.map((shape) => transform.sanitizeExistingShape(shape))
			.filter((shape): shape is ISimpleShape => shape !== null)
	}

	static override buildContent(
		_prompt: AgentPrompt,
		agentViewportShapes: ISimpleShape[]
	): string[] {
		return agentViewportShapes.length > 0
			? [`Here are the shapes in your current viewport:`, JSON.stringify(agentViewportShapes)]
			: ['Your current viewport is empty.']
	}
}
