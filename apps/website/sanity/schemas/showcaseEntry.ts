import { defineField, defineType } from 'sanity'

export const showcaseEntry = defineType({
	name: 'showcaseEntry',
	title: 'Showcase entry',
	type: 'document',
	fields: [
		defineField({
			name: 'name',
			title: 'Name',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'slug',
			title: 'Slug',
			type: 'slug',
			options: {
				source: 'name',
				maxLength: 96,
			},
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'category',
			title: 'Category',
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
			name: 'url',
			title: 'URL',
			type: 'url',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'caseStudyUrl',
			title: 'Case study URL',
			type: 'string',
			description: 'Relative URL to the case study blog post.',
		}),
		defineField({
			name: 'logo',
			title: 'Logo',
			type: 'image',
			options: { hotspot: true },
		}),
		defineField({
			name: 'coverImage',
			title: 'Cover image',
			type: 'image',
			options: { hotspot: true },
			description: 'Product screenshot shown in the showcase card.',
		}),
		defineField({
			name: 'order',
			title: 'Order',
			type: 'number',
			description: 'Controls the display order.',
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
			subtitle: 'category',
			media: 'logo',
		},
	},
})
