import { defineField, defineType } from 'sanity'

export const author = defineType({
	name: 'author',
	title: 'Author',
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
			name: 'role',
			title: 'Role',
			type: 'string',
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
	],
	preview: {
		select: {
			title: 'name',
			subtitle: 'role',
			media: 'avatar',
		},
	},
})
