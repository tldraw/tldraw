import { defineField, defineType } from 'sanity'

export const testimonial = defineType({
	name: 'testimonial',
	title: 'Testimonial',
	type: 'document',
	fields: [
		defineField({
			name: 'quote',
			title: 'Quote',
			type: 'text',
			rows: 4,
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'author',
			title: 'Author',
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
			name: 'company',
			title: 'Company',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'avatar',
			title: 'Avatar',
			type: 'image',
			options: { hotspot: true },
		}),
		defineField({
			name: 'useInPullQuote',
			title: 'Use in pull quote',
			type: 'boolean',
			description:
				'When enabled, this testimonial may appear randomly in the pull quote component.',
			initialValue: true,
		}),
	],
	preview: {
		select: {
			title: 'author',
			role: 'role',
			company: 'company',
			media: 'avatar',
		},
		prepare({ title, role, company, media }) {
			return {
				title,
				subtitle: `${role} at ${company}`,
				media,
			}
		},
	},
})
