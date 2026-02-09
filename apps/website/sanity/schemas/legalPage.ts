import { defineField, defineType } from 'sanity'

export const legalPage = defineType({
	name: 'legalPage',
	title: 'Legal page',
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
			name: 'lastUpdated',
			title: 'Last updated',
			type: 'datetime',
		}),
	],
	preview: {
		select: {
			title: 'title',
			lastUpdated: 'lastUpdated',
		},
		prepare({ title, lastUpdated }) {
			const formattedDate = lastUpdated ? new Date(lastUpdated).toLocaleDateString() : ''
			return {
				title,
				subtitle: formattedDate ? `Last updated: ${formattedDate}` : '',
			}
		},
	},
})
