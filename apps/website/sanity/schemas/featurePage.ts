import { defineField, defineType } from 'sanity'
import { seoFields } from './shared/seo'

export const featurePage = defineType({
	name: 'featurePage',
	title: 'Feature page',
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
			name: 'description',
			title: 'Description',
			type: 'text',
			rows: 3,
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'body',
			title: 'Body',
			type: 'array',
			of: [{ type: 'block' }],
		}),
		defineField({
			name: 'icon',
			title: 'Icon',
			type: 'string',
			description: 'Icon identifier for this feature.',
		}),
		defineField({
			name: 'coverImage',
			title: 'Cover image',
			type: 'image',
			options: { hotspot: true },
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
			subtitle: 'description',
			media: 'coverImage',
		},
	},
})
