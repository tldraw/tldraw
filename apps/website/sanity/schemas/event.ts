import { defineField, defineType } from 'sanity'

export const event = defineType({
	name: 'event',
	title: 'Event',
	type: 'document',
	fields: [
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'date',
			title: 'Date',
			type: 'datetime',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'location',
			title: 'Location',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'description',
			title: 'Description',
			type: 'text',
			rows: 4,
		}),
		defineField({
			name: 'url',
			title: 'URL',
			type: 'url',
		}),
		defineField({
			name: 'coverImage',
			title: 'Cover image',
			type: 'image',
			options: { hotspot: true },
		}),
		defineField({
			name: 'isUpcoming',
			title: 'Is upcoming',
			type: 'boolean',
		}),
	],
	orderings: [
		{
			title: 'Event date',
			name: 'dateDesc',
			by: [{ field: 'date', direction: 'desc' }],
		},
	],
	preview: {
		select: {
			title: 'title',
			date: 'date',
			location: 'location',
			media: 'coverImage',
		},
		prepare({ title, date, location, media }) {
			const formattedDate = date ? new Date(date).toLocaleDateString() : ''
			return {
				title,
				subtitle: `${formattedDate} - ${location}`,
				media,
			}
		},
	},
})
