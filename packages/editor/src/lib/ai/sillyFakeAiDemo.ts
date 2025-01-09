import { sleep } from '@tldraw/utils'
import { GenerativeAiAdapter, UpdateShapeChange } from './GenerativeModel'
import { simpleIds } from './simpleIds'

/** @internal */
export const sillyFakeAiDemo: GenerativeAiAdapter = {
	transforms: [simpleIds],
	async *generate(input) {
		for (const shape of input.shapes) {
			const update: UpdateShapeChange = {
				type: 'updateShape',
				shape: { id: shape.id, type: shape.type, rotation: shape.rotation + 1 },
			}
			if ('text' in shape.props) {
				update.shape.props = { text: input.prompt }
			}
			yield update
			await sleep(200)
		}
	},
}
