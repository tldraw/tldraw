import { defineField, defineType } from 'sanity'

export const pricingTier = defineType({
	name: 'pricingTier',
	title: 'Pricing tier',
	type: 'document',
	fields: [
		defineField({
			name: 'name',
			title: 'Name',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'price',
			title: 'Price',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'period',
			title: 'Period',
			type: 'string',
			description: 'e.g. "/month", "/year", or leave empty for one-time.',
		}),
		defineField({
			name: 'description',
			title: 'Description',
			type: 'text',
			rows: 3,
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'features',
			title: 'Features',
			type: 'array',
			of: [{ type: 'string' }],
		}),
		defineField({
			name: 'ctaLabel',
			title: 'CTA label',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'ctaUrl',
			title: 'CTA URL',
			type: 'url',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'isHighlighted',
			title: 'Is highlighted',
			type: 'boolean',
			description: 'Highlight this tier as the recommended option.',
		}),
		defineField({
			name: 'order',
			title: 'Order',
			type: 'number',
			description: 'Controls the display order of pricing tiers.',
		}),
	],
	orderings: [
		{
			title: 'Display order',
			name: 'orderAsc',
			by: [{ field: 'order', direction: 'asc' }],
		},
	],
	preview: {
		select: {
			title: 'name',
			price: 'price',
			period: 'period',
		},
		prepare({ title, price, period }) {
			return {
				title,
				subtitle: `${price}${period ?? ''}`,
			}
		},
	},
})
