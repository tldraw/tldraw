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
	'custom-1',
	'custom-2',
	'custom-3',
	'custom-4',
	'custom-5',
	'custom-6',
	'custom-7',
	'custom-8',
	'custom-9',
	'custom-10',
	'custom-11',
	'custom-12',
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
