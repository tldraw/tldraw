import { defineField, defineType } from 'sanity'

export const companyPage = defineType({
	name: 'companyPage',
	title: 'Company page',
	type: 'document',
	fields: [
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string',
		}),
		defineField({
			name: 'intro',
			title: 'Intro',
			type: 'text',
			rows: 4,
		}),
		defineField({
			name: 'mission',
			title: 'Mission',
			type: 'text',
			rows: 4,
		}),
		defineField({
			name: 'team',
			title: 'Team',
			type: 'array',
			of: [
				{
					type: 'reference',
					to: [{ type: 'teamMember' }],
				},
			],
		}),
		defineField({
			name: 'values',
			title: 'Values',
			type: 'array',
			of: [
				{
					type: 'object',
					fields: [
						defineField({
							name: 'title',
							title: 'Title',
							type: 'string',
						}),
						defineField({
							name: 'description',
							title: 'Description',
							type: 'string',
						}),
					],
					preview: {
						select: {
							title: 'title',
							subtitle: 'description',
						},
					},
				},
			],
		}),
	],
	preview: {
		prepare() {
			return {
				title: 'Company page',
			}
		},
	},
})
