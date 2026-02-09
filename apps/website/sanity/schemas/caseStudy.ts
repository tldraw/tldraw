import { defineField, defineType } from 'sanity'

export const caseStudy = defineType({
	name: 'caseStudy',
	title: 'Case study',
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
			name: 'company',
			title: 'Company',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'logo',
			title: 'Logo',
			type: 'image',
		}),
		defineField({
			name: 'excerpt',
			title: 'Excerpt',
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
			name: 'coverImage',
			title: 'Cover image',
			type: 'image',
			options: { hotspot: true },
		}),
		defineField({
			name: 'testimonial',
			title: 'Testimonial',
			type: 'reference',
			to: [{ type: 'testimonial' }],
		}),
	],
	preview: {
		select: {
			title: 'title',
			subtitle: 'company',
			media: 'coverImage',
		},
	},
})
