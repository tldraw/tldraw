import { defineField, defineType } from 'sanity'

export const faqSection = defineType({
	name: 'faqSection',
	title: 'FAQ section',
	type: 'document',
	fields: [
		defineField({
			name: 'heading',
			title: 'Heading',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'description',
			title: 'Description',
			type: 'text',
			rows: 3,
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'slug',
			title: 'Slug',
			type: 'slug',
			options: {
				source: 'heading',
				maxLength: 96,
			},
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'items',
			title: 'FAQ items',
			type: 'array',
			of: [
				{
					type: 'reference',
					to: [{ type: 'faqItem' }],
				},
			],
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'order',
			title: 'Order',
			type: 'number',
			description: 'Controls the display order of sections.',
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
			title: 'heading',
			subtitle: 'description',
		},
	},
})
