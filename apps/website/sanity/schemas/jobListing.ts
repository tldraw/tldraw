import { defineField, defineType } from 'sanity'

export const jobListing = defineType({
	name: 'jobListing',
	title: 'Job listing',
	type: 'document',
	fields: [
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'department',
			title: 'Department',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'location',
			title: 'Location',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'type',
			title: 'Type',
			type: 'string',
			options: {
				list: [
					{ title: 'Full-time', value: 'full-time' },
					{ title: 'Contract', value: 'contract' },
					{ title: 'Part-time', value: 'part-time' },
				],
			},
		}),
		defineField({
			name: 'description',
			title: 'Description',
			type: 'array',
			of: [{ type: 'block' }],
		}),
		defineField({
			name: 'applyUrl',
			title: 'Apply URL',
			type: 'url',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'isActive',
			title: 'Is active',
			type: 'boolean',
			initialValue: true,
		}),
	],
	preview: {
		select: {
			title: 'title',
			department: 'department',
			location: 'location',
			isActive: 'isActive',
		},
		prepare({ title, department, location, isActive }) {
			return {
				title,
				subtitle: `${department} - ${location}${isActive === false ? ' (inactive)' : ''}`,
			}
		},
	},
})
