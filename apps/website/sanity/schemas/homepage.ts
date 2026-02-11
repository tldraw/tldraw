import { defineField, defineType } from 'sanity'

export const homepage = defineType({
	name: 'homepage',
	title: 'Homepage',
	type: 'document',
	fields: [
		// Hero
		defineField({
			name: 'hero',
			title: 'Hero',
			type: 'object',
			fields: [
				defineField({ name: 'title', title: 'Title', type: 'string' }),
				defineField({ name: 'subtitle', title: 'Subtitle', type: 'string' }),
				defineField({
					name: 'subtitleHighlight',
					title: 'Subtitle highlight phrase',
					type: 'string',
					description:
						'Optional phrase to highlight in the subtitle (e.g. "high-performance web canvas")',
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
						defineField({ name: 'labelBold', title: 'Bold part of label', type: 'string' }),
						defineField({ name: 'url', title: 'URL', type: 'string' }),
					],
				}),
			],
		}),

		// Logo bar
		defineField({
			name: 'logoBar',
			title: 'Logo bar',
			type: 'object',
			fields: [
				defineField({ name: 'title', title: 'Title', type: 'string' }),
				defineField({
					name: 'logos',
					title: 'Logos',
					type: 'array',
					of: [
						{
							type: 'object',
							fields: [
								defineField({ name: 'company', title: 'Company name', type: 'string' }),
								defineField({ name: 'logo', title: 'Logo image', type: 'image' }),
								defineField({ name: 'url', title: 'Company URL', type: 'url' }),
							],
							preview: { select: { title: 'company' } },
						},
					],
				}),
			],
		}),

		// Why tldraw
		defineField({
			name: 'whyTldraw',
			title: 'Why tldraw',
			type: 'object',
			fields: [
				defineField({ name: 'title', title: 'Title', type: 'string' }),
				defineField({
					name: 'items',
					title: 'Items',
					type: 'array',
					of: [
						{
							type: 'object',
							fields: [
								defineField({ name: 'title', title: 'Title', type: 'string' }),
								defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
							],
							preview: { select: { title: 'title', subtitle: 'description' } },
						},
					],
				}),
			],
		}),

		// Showcase section (homepage preview of showcase page)
		defineField({
			name: 'showcaseSection',
			title: 'Showcase section',
			type: 'object',
			fields: [
				defineField({ name: 'title', title: 'Title', type: 'string' }),
				defineField({ name: 'subtitle', title: 'Subtitle', type: 'string' }),
				defineField({ name: 'ctaLabel', title: 'CTA label', type: 'string' }),
				defineField({ name: 'ctaUrl', title: 'CTA URL', type: 'string' }),
				defineField({
					name: 'items',
					title: 'Items',
					type: 'array',
					of: [
						{
							type: 'object',
							fields: [
								defineField({ name: 'company', title: 'Company', type: 'string' }),
								defineField({ name: 'category', title: 'Category', type: 'string' }),
								defineField({ name: 'description', title: 'Description', type: 'text', rows: 2 }),
								defineField({ name: 'url', title: 'URL', type: 'string' }),
							],
							preview: { select: { title: 'company', subtitle: 'category' } },
						},
					],
				}),
			],
		}),

		// What's inside
		defineField({
			name: 'whatsInside',
			title: "What's inside",
			type: 'object',
			fields: [
				defineField({ name: 'title', title: 'Title', type: 'string' }),
				defineField({ name: 'subtitle', title: 'Subtitle', type: 'string' }),
				defineField({
					name: 'items',
					title: 'Items',
					type: 'array',
					of: [
						{
							type: 'object',
							fields: [
								defineField({ name: 'icon', title: 'Icon', type: 'string' }),
								defineField({ name: 'title', title: 'Title', type: 'string' }),
								defineField({ name: 'description', title: 'Description', type: 'text', rows: 2 }),
								defineField({ name: 'url', title: 'URL', type: 'string' }),
							],
							preview: { select: { title: 'title', subtitle: 'description' } },
						},
					],
				}),
			],
		}),

		// Whiteboard kit
		defineField({
			name: 'whiteboardKit',
			title: 'Whiteboard kit',
			type: 'object',
			fields: [
				defineField({ name: 'eyebrow', title: 'Eyebrow', type: 'string' }),
				defineField({ name: 'title', title: 'Title', type: 'string' }),
				defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
				defineField({ name: 'ctaLabel', title: 'CTA label', type: 'string' }),
				defineField({ name: 'ctaUrl', title: 'CTA URL', type: 'string' }),
				defineField({
					name: 'features',
					title: 'Features',
					type: 'array',
					of: [
						{
							type: 'object',
							fields: [
								defineField({ name: 'title', title: 'Title', type: 'string' }),
								defineField({ name: 'description', title: 'Description', type: 'text', rows: 2 }),
							],
							preview: { select: { title: 'title' } },
						},
					],
				}),
			],
		}),

		// Starter kits
		defineField({
			name: 'starterKits',
			title: 'Starter kits',
			type: 'object',
			fields: [
				defineField({ name: 'title', title: 'Title', type: 'string' }),
				defineField({ name: 'subtitle', title: 'Subtitle', type: 'string' }),
				defineField({ name: 'ctaLabel', title: 'CTA label', type: 'string' }),
				defineField({ name: 'ctaUrl', title: 'CTA URL', type: 'string' }),
				defineField({
					name: 'kits',
					title: 'Kits',
					type: 'array',
					of: [
						{
							type: 'object',
							fields: [
								defineField({ name: 'title', title: 'Title', type: 'string' }),
								defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
								defineField({ name: 'url', title: 'URL', type: 'string' }),
							],
							preview: { select: { title: 'title' } },
						},
					],
				}),
			],
		}),

		// Testimonial section
		defineField({
			name: 'testimonialSection',
			title: 'Testimonial section',
			type: 'object',
			fields: [
				defineField({
					name: 'caseStudies',
					title: 'Case studies',
					type: 'array',
					of: [
						{
							type: 'object',
							fields: [
								defineField({ name: 'company', title: 'Company', type: 'string' }),
								defineField({ name: 'description', title: 'Description', type: 'text', rows: 2 }),
								defineField({ name: 'url', title: 'URL', type: 'string' }),
							],
							preview: { select: { title: 'company' } },
						},
					],
				}),
			],
		}),

		// Final CTA (shared across pages)
		defineField({
			name: 'finalCta',
			title: 'Final CTA',
			type: 'object',
			fields: [
				defineField({ name: 'title', title: 'Title', type: 'string' }),
				defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
				defineField({ name: 'descriptionBold', title: 'Bold part of description', type: 'string' }),
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
						defineField({ name: 'labelBold', title: 'Bold part of label', type: 'string' }),
						defineField({ name: 'url', title: 'URL', type: 'string' }),
					],
				}),
			],
		}),
	],
	preview: {
		prepare() {
			return { title: 'Homepage' }
		},
	},
})
