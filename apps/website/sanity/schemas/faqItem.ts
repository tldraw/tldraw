import { defineField, defineType } from 'sanity'

export const faqItem = defineType({
	name: 'faqItem',
	title: 'FAQ item',
	type: 'document',
	fields: [
		defineField({
			name: 'question',
			title: 'Question',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'answer',
			title: 'Answer',
			type: 'array',
			of: [{ type: 'block' }],
		}),
		defineField({
			name: 'category',
			title: 'Category',
			type: 'string',
		}),
		defineField({
			name: 'order',
			title: 'Order',
			type: 'number',
			description: 'Controls the display order of FAQ items.',
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
			title: 'question',
			subtitle: 'category',
		},
	},
})
