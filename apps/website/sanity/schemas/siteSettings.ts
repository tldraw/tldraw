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

		// Navigation groups (dropdowns in header)
		defineField({
			name: 'navGroups',
			title: 'Navigation groups',
			type: 'array',
			of: [
				{
					type: 'object',
					fields: [
						defineField({
							name: 'label',
							title: 'Label',
							type: 'string',
							validation: (r) => r.required(),
						}),
						defineField({
							name: 'items',
							title: 'Items',
							type: 'array',
							of: [
								{
									type: 'object',
									fields: [
										defineField({
											name: 'label',
											title: 'Label',
											type: 'string',
											validation: (r) => r.required(),
										}),
										defineField({
											name: 'href',
											title: 'URL',
											type: 'string',
											validation: (r) => r.required(),
										}),
									],
									preview: { select: { title: 'label', subtitle: 'href' } },
								},
							],
						}),
					],
					preview: { select: { title: 'label' } },
				},
			],
		}),

		// Standalone nav links (shown directly in header, not in dropdowns)
		defineField({
			name: 'standaloneNavLinks',
			title: 'Standalone nav links',
			type: 'array',
			of: [
				{
					type: 'object',
					fields: [
						defineField({
							name: 'label',
							title: 'Label',
							type: 'string',
							validation: (r) => r.required(),
						}),
						defineField({
							name: 'href',
							title: 'URL',
							type: 'string',
							validation: (r) => r.required(),
						}),
					],
					preview: { select: { title: 'label', subtitle: 'href' } },
				},
			],
		}),

		// Footer
		defineField({
			name: 'footerTagline',
			title: 'Footer tagline',
			type: 'string',
		}),
		defineField({
			name: 'footerColumns',
			title: 'Footer columns',
			type: 'array',
			of: [
				{
					type: 'object',
					fields: [
						defineField({
							name: 'heading',
							title: 'Heading',
							type: 'string',
							validation: (r) => r.required(),
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
											validation: (r) => r.required(),
										}),
										defineField({
											name: 'href',
											title: 'URL',
											type: 'string',
											validation: (r) => r.required(),
										}),
									],
									preview: { select: { title: 'label', subtitle: 'href' } },
								},
							],
						}),
					],
					preview: { select: { title: 'heading' } },
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
							name: 'label',
							title: 'Label',
							type: 'string',
							validation: (r) => r.required(),
						}),
						defineField({
							name: 'href',
							title: 'URL',
							type: 'string',
							validation: (r) => r.required(),
						}),
					],
					preview: { select: { title: 'label', subtitle: 'href' } },
				},
			],
		}),
	],
	preview: {
		prepare() {
			return { title: 'Site settings' }
		},
	},
})
