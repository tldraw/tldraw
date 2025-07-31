import { TLAiChange, TldrawAiTransform } from '@tldraw/ai'

/*

This transform adds the intent of the model's change to the shape's meta. This
can be helpful for debugging as it lets you see what the model was trying to
achieve when it created or updated a shape. You might also want to pass this
information back to the model in a later request, to give it more context.

Note: You could also do this within `getTldrawAiChangesFromSimpleEvents` by
adding the intent to the shape's meta there.

*/
export class ShapeIntents extends TldrawAiTransform {
	override transformChange = (change: TLAiChange) => {
		switch (change.type) {
			case 'createShape': {
				const { shape, description } = change

				if (description) {
					shape.meta = {
						...shape.meta,
						intent: description,
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
						intent: description,
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
