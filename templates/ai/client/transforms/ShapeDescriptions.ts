import { TLAiChange, TldrawAiTransform } from '@tldraw/ai'

export class ShapeDescriptions extends TldrawAiTransform {
	override transformChange = (change: TLAiChange) => {
		switch (change.type) {
			case 'createShape': {
				const { shape, description } = change

				if (description) {
					shape.meta = {
						...shape.meta,
						description,
					}
				}
				return {
					...change,
					shape,
				}
			}
			case 'updateShape': {
				const { shape, description } = change

				if (description) {
					shape.meta = {
						...shape.meta,
						description,
					}
				}
				return {
					...change,
					shape,
				}
			}
			default: {
				return change
			}
		}
	}
}
