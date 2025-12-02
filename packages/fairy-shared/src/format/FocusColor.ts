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

// it's worth noting that because of how the zod schema is defined, using this new, shorter ProjectColorSchema with will only result in a shorter system prompt if the ProjectColorSchema and FocusColorSchema aren't available to the same agent. This is because the zod schema, when all stringified and sent to the model, uses references to refer to the schemas you send it (eg, if there are 2 actions that have a FocusColorSchema field, it won't send the schema twice). So, adding another schema to the system prompt will make the system prompt longer because now the schema has to store references to both color schemas, not just one. However, currently, no agent has access to actions that use both schemas, so this is technically simplifying the system prompt by including less colors.
export const ProjectColorSchema = z.enum([
	'red',
	'light-red',
	'orange',
	'yellow',
	'green',
	'blue',
	'light-violet',
	'violet',
])

export type ProjectColor = z.infer<typeof ProjectColorSchema>

export function asColor(color: string): FocusColor {
	if (FocusColorSchema.safeParse(color).success) {
		return color as FocusColor
	}

	switch (color) {
		case 'pink':
		case 'light-pink': {
			return 'light-violet'
		}
	}

	return 'black'
}

/**
 * Gets the CSS color value for a project color, using the editor's theme.
 *
 * @param color - The ProjectColor value to convert
 * @returns The fairy color css variable
 */
export function getProjectColor(color: ProjectColor | ''): string {
	switch (color) {
		case 'red': {
			return 'var(--tl-color-fairy-rose)'
		}
		case 'light-red': {
			return 'var(--tl-color-fairy-coral)'
		}
		case 'orange': {
			return 'var(--tl-color-fairy-gold)'
		}
		case 'yellow': {
			return 'var(--tl-color-fairy-peach)'
		}
		case 'green': {
			return 'var(--tl-color-fairy-green)'
		}
		case 'blue': {
			return 'var(--tl-color-fairy-teal)'
		}
		case 'light-violet': {
			return 'var(--tl-color-fairy-pink)'
		}
		case 'violet': {
			return 'var(--tl-color-fairy-purple)'
		}
		case '': {
			return 'var(--tl-color-fairy-light)'
		}
	}
}
