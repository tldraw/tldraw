import z from 'zod'

export const FocusColorSchema = z.enum([
	'red',
	'light-red',
	'green',
	'light-green',
	'blue',
	'light-blue',
	'orange',
	'yellow',
	'black',
	'violet',
	'light-violet',
	'grey',
	'white',
])

export type FocusColor = z.infer<typeof FocusColorSchema>

export function asColor(color: string): FocusColor {
	if (FocusColorSchema.safeParse(color).success) {
		return color as FocusColor
	}

	switch (color) {
		case 'pink': {
			return 'light-violet'
		}
		case 'light-pink': {
			return 'light-violet'
		}
	}

	return 'black'
}
