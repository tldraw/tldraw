import { createTldrawAiTransform } from '@tldraw/ai'
import { Box } from 'tldraw'

export const SimpleCoordinatesTransform = createTldrawAiTransform((editor, prompt) => {
	const before: Record<string, number> = {}

	// Save the original coordinates of context bounds (the user's viewport)
	const originalContextBounds = Box.From(prompt.contextBounds)
	const promptBounds = Box.From(prompt.promptBounds)
	const contextBounds = Box.From(prompt.contextBounds)

	// Save the original coordinates of all shapes
	for (const s of prompt.canvasContent.shapes) {
		for (const prop of ['x', 'y'] as const) {
			before[s.id + '_' + prop] = s[prop]
			s[prop] = Math.floor(s[prop] - originalContextBounds[prop])
		}
		for (const key in s.props) {
			const v = (s.props as any)[key]
			if (Number.isFinite(v)) {
				;(s.props as any)[key] = Math.floor(v)
			}
		}
	}

	// Make the prompt bounds relative to the context bounds
	promptBounds.x -= contextBounds.x
	promptBounds.y -= contextBounds.y

	// Zero the context bounds
	contextBounds.x = 0
	contextBounds.y = 0

	return {
		prompt: {
			...prompt,
			promptBounds,
			contextBounds,
		},
		handleChange(change) {
			switch (change.type) {
				case 'createShape':
				case 'updateShape': {
					const { shape } = change
					if (!shape) return change

					// Add back in the offset
					for (const prop of ['x', 'y'] as const) {
						if (shape[prop] !== undefined) {
							shape[prop]! += originalContextBounds[prop]
						} else {
							const initial = before[shape.id + '_' + prop]
							if (initial != null) {
								shape[prop] = initial
							}
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
