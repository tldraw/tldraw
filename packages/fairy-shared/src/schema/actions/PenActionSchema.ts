import z from 'zod'
import { FocusColorSchema } from '../../format/FocusColor'
import { FocusFillSchema } from '../../format/FocusFill'

export const PenActionSchema = z
	.object({
		_type: z.literal('pen'),
		color: FocusColorSchema,
		closed: z.boolean(),
		fill: FocusFillSchema,
		intent: z.string(),
		points: z.array(
			z.object({
				x: z.number(),
				y: z.number(),
			})
		),
		style: z.enum(['smooth', 'straight']),
	})
	.meta({
		title: 'Pen',
		description:
			'The fairy draws a freeform line with a pen. This is useful for drawing custom paths that are not available with the other available shapes. The "smooth" style will automatically smooth the line between points. The "straight" style will render a straight line between points. The "closed" property will determine if the drawn line gets automatically closed to form a complete shape or not. Remember that the pen will be *down* until the action is over. If you want to lift up the pen, start a new pen action.',
	})

export type PenAction = z.infer<typeof PenActionSchema>
