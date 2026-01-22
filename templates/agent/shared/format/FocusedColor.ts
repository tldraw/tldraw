import z from 'zod'

export const FocusedColor = z.enum([
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

export type IFocusedColor = z.infer<typeof FocusedColor>

export function asColor(color: string): IFocusedColor {
	if (FocusedColor.safeParse(color).success) {
		return color as IFocusedColor
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
