import { createTldrawAiTransform } from '@tldraw/ai'

// TODO(#ai-v2): this should only add the description property if it's actually needed.
export const ShapeDescriptionsTransform = createTldrawAiTransform((editor, prompt) => {
	return {
		prompt,
		handleChange: (change) => {
			switch (change.type) {
				case 'createShape': {
					const { shape, description } = change
					if (!shape) return change

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
					if (!shape) return change

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
		},
	}
})
