import { defineField, defineType } from 'sanity'

export const showcasePage = defineType({
	name: 'showcasePage',
	title: 'Showcase page',
	type: 'document',
	fields: [
		// Hero
		defineField({
			name: 'heroTitle',
			title: 'Hero title',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'heroSubtitle',
			title: 'Hero subtitle',
			type: 'string',
		}),

		// Logo bar — references to showcase entries whose logos appear in the hero
		defineField({
			name: 'logoBarEntries',
			title: 'Logo bar entries',
			type: 'array',
			of: [{ type: 'reference', to: [{ type: 'showcaseEntry' }] }],
			description: 'Showcase entries whose logos appear in the hero bar.',
		}),

		// Showcase section
		defineField({
			name: 'showcaseTitle',
			title: 'Showcase section title',
			type: 'string',
		}),
		defineField({
			name: 'showcaseSubtitle',
			title: 'Showcase section subtitle',
			type: 'string',
		}),

		// Show and tell
		defineField({
			name: 'showAndTellTitle',
			title: 'Show and tell title',
			type: 'string',
		}),
		defineField({
			name: 'showAndTellDescription',
			title: 'Show and tell description',
			type: 'text',
			rows: 2,
		}),

		// Projects
		defineField({
			name: 'projectsTitle',
			title: 'Projects section title',
			type: 'string',
		}),
		defineField({
			name: 'projectsSubtitle',
			title: 'Projects section subtitle',
			type: 'text',
			rows: 2,
		}),
		defineField({
			name: 'projects',
			title: 'Projects',
			type: 'array',
			of: [
				{
					type: 'object',
					fields: [
						defineField({
							name: 'name',
							title: 'Name',
							type: 'string',
							validation: (r) => r.required(),
						}),
						defineField({
							name: 'description',
							title: 'Description',
							type: 'text',
							rows: 3,
							validation: (r) => r.required(),
						}),
						defineField({
							name: 'url',
							title: 'URL',
							type: 'url',
							validation: (r) => r.required(),
						}),
						defineField({ name: 'linkLabel', title: 'Link label', type: 'string' }),
						defineField({
							name: 'coverImage',
							title: 'Cover image',
							type: 'image',
							options: { hotspot: true },
						}),
					],
					preview: {
						select: { title: 'name', subtitle: 'url', media: 'coverImage' },
					},
				},
			],
		}),

		// Testimonial
		defineField({
			name: 'testimonial',
			title: 'Featured testimonial',
			type: 'reference',
			to: [{ type: 'testimonial' }],
		}),
		defineField({
			name: 'caseStudySummaries',
			title: 'Case study summaries',
			type: 'array',
			of: [
				{
					type: 'object',
					fields: [
						defineField({ name: 'heading', title: 'Heading', type: 'string' }),
						defineField({ name: 'description', title: 'Description', type: 'text', rows: 2 }),
						defineField({ name: 'url', title: 'URL', type: 'string' }),
					],
					preview: {
						select: { title: 'heading', subtitle: 'description' },
					},
				},
			],
		}),

		// Final CTA
		defineField({
			name: 'ctaTitle',
			title: 'CTA title',
			type: 'string',
		}),
		defineField({
			name: 'ctaDescription',
			title: 'CTA description',
			type: 'string',
		}),
	],
	preview: {
		prepare() {
			return { title: 'Showcase page' }
		},
	},
})
