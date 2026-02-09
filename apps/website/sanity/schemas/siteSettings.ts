import { defineField, defineType } from 'sanity'

export const siteSettings = defineType({
	name: 'siteSettings',
	title: 'Site settings',
	type: 'document',
	fields: [
		defineField({
			name: 'logo',
			title: 'Logo',
			type: 'image',
		}),
		defineField({
			name: 'navLinks',
			title: 'Navigation links',
			type: 'array',
			of: [
				{
					type: 'object',
					fields: [
						defineField({
							name: 'label',
							title: 'Label',
							type: 'string',
							validation: (rule) => rule.required(),
						}),
						defineField({
							name: 'url',
							title: 'URL',
							type: 'string',
							validation: (rule) => rule.required(),
						}),
					],
					preview: {
						select: {
							title: 'label',
							subtitle: 'url',
						},
					},
				},
			],
		}),
		defineField({
			name: 'footerLinks',
			title: 'Footer links',
			type: 'array',
			of: [
				{
					type: 'object',
					fields: [
						defineField({
							name: 'heading',
							title: 'Heading',
							type: 'string',
							validation: (rule) => rule.required(),
						}),
						defineField({
							name: 'links',
							title: 'Links',
							type: 'array',
							of: [
								{
									type: 'object',
									fields: [
										defineField({
											name: 'label',
											title: 'Label',
											type: 'string',
											validation: (rule) => rule.required(),
										}),
										defineField({
											name: 'url',
											title: 'URL',
											type: 'string',
											validation: (rule) => rule.required(),
										}),
									],
									preview: {
										select: {
											title: 'label',
											subtitle: 'url',
										},
									},
								},
							],
						}),
					],
					preview: {
						select: {
							title: 'heading',
						},
					},
				},
			],
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
		prepare() {
			return {
				title: 'Site settings',
			}
		},
	},
})
