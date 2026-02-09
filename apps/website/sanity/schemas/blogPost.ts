import { defineField, defineType } from 'sanity'
import { seoFields } from './shared/seo'

export const blogPost = defineType({
	name: 'blogPost',
	title: 'Blog post',
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
			of: [
				{ type: 'block' },
				{
					type: 'code',
					options: {
						withFilename: true,
					},
				},
				{
					type: 'object',
					name: 'callout',
					title: 'Callout',
					fields: [
						defineField({
							name: 'tone',
							title: 'Tone',
							type: 'string',
							options: {
								list: [
									{ title: 'Info', value: 'info' },
									{ title: 'Warning', value: 'warning' },
									{ title: 'Tip', value: 'tip' },
								],
							},
							initialValue: 'info',
						}),
						defineField({
							name: 'body',
							title: 'Body',
							type: 'array',
							of: [{ type: 'block' }],
						}),
					],
				},
				{
					type: 'image',
					options: { hotspot: true },
					fields: [
						defineField({
							name: 'alt',
							title: 'Alt text',
							type: 'string',
						}),
						defineField({
							name: 'caption',
							title: 'Caption',
							type: 'string',
						}),
					],
				},
				{
					type: 'object',
					name: 'video',
					title: 'Video',
					fields: [
						defineField({
							name: 'url',
							title: 'URL',
							type: 'url',
							validation: (rule) => rule.required(),
						}),
						defineField({
							name: 'caption',
							title: 'Caption',
							type: 'string',
						}),
					],
				},
			],
		}),
		defineField({
			name: 'coverImage',
			title: 'Cover image',
			type: 'image',
			options: { hotspot: true },
			fields: [
				defineField({
					name: 'alt',
					title: 'Alt text',
					type: 'string',
				}),
			],
		}),
		defineField({
			name: 'author',
			title: 'Author',
			type: 'reference',
			to: [{ type: 'author' }],
		}),
		defineField({
			name: 'category',
			title: 'Category',
			type: 'reference',
			to: [{ type: 'blogCategory' }],
		}),
		defineField({
			name: 'publishedAt',
			title: 'Published at',
			type: 'datetime',
			validation: (rule) => rule.required(),
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
			author: 'author.name',
			media: 'coverImage',
		},
		prepare({ title, author, media }) {
			return {
				title,
				subtitle: author ? `by ${author}` : '',
				media,
			}
		},
	},
})
