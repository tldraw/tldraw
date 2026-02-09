import { defineField, defineType } from 'sanity'

export const homepage = defineType({
	name: 'homepage',
	title: 'Homepage',
	type: 'document',
	fields: [
		defineField({
			name: 'hero',
			title: 'Hero',
			type: 'object',
			fields: [
				defineField({
					name: 'title',
					title: 'Title',
					type: 'string',
				}),
				defineField({
					name: 'subtitle',
					title: 'Subtitle',
					type: 'string',
				}),
				defineField({
					name: 'ctaPrimary',
					title: 'Primary CTA',
					type: 'object',
					fields: [
						defineField({ name: 'label', title: 'Label', type: 'string' }),
						defineField({ name: 'url', title: 'URL', type: 'string' }),
						defineField({ name: 'variant', title: 'Variant', type: 'string' }),
					],
				}),
				defineField({
					name: 'ctaSecondary',
					title: 'Secondary CTA',
					type: 'object',
					fields: [
						defineField({ name: 'label', title: 'Label', type: 'string' }),
						defineField({ name: 'url', title: 'URL', type: 'string' }),
						defineField({ name: 'variant', title: 'Variant', type: 'string' }),
					],
				}),
				defineField({
					name: 'heroImage',
					title: 'Hero image',
					type: 'image',
					options: { hotspot: true },
				}),
			],
		}),
		defineField({
			name: 'features',
			title: 'Features',
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
						defineField({
							name: 'icon',
							title: 'Icon',
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
		defineField({
			name: 'testimonials',
			title: 'Testimonials',
			type: 'array',
			of: [
				{
					type: 'reference',
					to: [{ type: 'testimonial' }],
				},
			],
		}),
		defineField({
			name: 'showcaseSection',
			title: 'Showcase section',
			type: 'object',
			fields: [
				defineField({
					name: 'title',
					title: 'Title',
					type: 'string',
				}),
				defineField({
					name: 'items',
					title: 'Items',
					type: 'array',
					of: [
						{
							type: 'reference',
							to: [{ type: 'caseStudy' }],
						},
					],
				}),
			],
		}),
		defineField({
			name: 'ctaSection',
			title: 'CTA section',
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
				defineField({
					name: 'cta',
					title: 'CTA',
					type: 'object',
					fields: [
						defineField({ name: 'label', title: 'Label', type: 'string' }),
						defineField({ name: 'url', title: 'URL', type: 'string' }),
						defineField({ name: 'variant', title: 'Variant', type: 'string' }),
					],
				}),
			],
		}),
	],
	preview: {
		prepare() {
			return {
				title: 'Homepage',
			}
		},
	},
})
