import { defineField, defineType } from 'sanity'
import { seoFields } from './shared/seo'

export const page = defineType({
	name: 'page',
	title: 'Page',
	type: 'document',
	fields: [
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'slug',
			title: 'Slug',
			type: 'slug',
			options: {
				source: 'title',
				maxLength: 96,
			},
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'body',
			title: 'Body',
			type: 'array',
			of: [{ type: 'block' }],
		}),
		defineField({
			name: 'seo',
			title: 'SEO',
			type: 'object',
			fields: seoFields,
		}),
	],
	preview: {
		select: {
			title: 'title',
			subtitle: 'slug.current',
		},
	},
})
