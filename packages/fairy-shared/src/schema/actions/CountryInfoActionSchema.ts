import z from 'zod'

export const CountryInfoActionSchema = z
	.object({
		_type: z.literal('country-info'),
		code: z.string(),
	})
	.meta({
		title: 'Country info',
		description:
			'The fairy gets information about a country by providing its country code, eg: "de" for Germany.',
	})

export type CountryInfoAction = z.infer<typeof CountryInfoActionSchema>
