import { defineField, defineType } from 'sanity'

export const teamMember = defineType({
	name: 'teamMember',
	title: 'Team member',
	type: 'document',
	fields: [
		defineField({
			name: 'name',
			title: 'Name',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'role',
			title: 'Role',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'bio',
			title: 'Bio',
			type: 'text',
			rows: 4,
		}),
		defineField({
			name: 'avatar',
			title: 'Avatar',
			type: 'image',
			options: { hotspot: true },
		}),
		defineField({
			name: 'socialLinks',
			title: 'Social links',
			type: 'array',
			of: [
				{
					type: 'object',
					fields: [
						defineField({
							name: 'platform',
							title: 'Platform',
							type: 'string',
							validation: (rule) => rule.required(),
						}),
						defineField({
							name: 'url',
							title: 'URL',
							type: 'url',
							validation: (rule) => rule.required(),
						}),
					],
					preview: {
						select: {
							title: 'platform',
							subtitle: 'url',
						},
					},
				},
			],
		}),
		defineField({
			name: 'order',
			title: 'Order',
			type: 'number',
			description: 'Controls the display order of team members.',
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
			subtitle: 'role',
			media: 'avatar',
		},
	},
})
