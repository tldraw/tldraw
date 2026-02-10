import { defineField, defineType } from 'sanity'

export const pricingPage = defineType({
	name: 'pricingPage',
	title: 'Pricing page',
	type: 'document',
	fields: [
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string',
			description: 'Hero title.',
		}),
		defineField({
			name: 'subtitle',
			title: 'Subtitle',
			type: 'string',
			description: 'Hero subtitle.',
		}),
		defineField({
			name: 'sdkLicense',
			title: 'SDK license',
			type: 'object',
			fields: [
				defineField({ name: 'title', title: 'Title', type: 'string' }),
				defineField({ name: 'description', title: 'Description', type: 'string' }),
				defineField({
					name: 'features',
					title: 'Features',
					type: 'array',
					of: [{ type: 'string' }],
				}),
				defineField({
					name: 'ctaPrimary',
					title: 'Primary CTA',
					type: 'object',
					fields: [
						defineField({ name: 'label', title: 'Label', type: 'string' }),
						defineField({ name: 'url', title: 'URL', type: 'string' }),
						defineField({ name: 'note', title: 'Note', type: 'string' }),
					],
				}),
				defineField({
					name: 'ctaSecondary',
					title: 'Secondary CTA',
					type: 'object',
					fields: [
						defineField({ name: 'label', title: 'Label', type: 'string' }),
						defineField({ name: 'url', title: 'URL', type: 'string' }),
					],
				}),
			],
		}),
		defineField({
			name: 'premiumNote',
			title: 'Premium note',
			type: 'object',
			description:
				'Note shown below the SDK license card (e.g. "Premium modules are in development").',
			fields: [
				defineField({ name: 'text', title: 'Text', type: 'string' }),
				defineField({ name: 'linkLabel', title: 'Link label', type: 'string' }),
				defineField({ name: 'linkUrl', title: 'Link URL', type: 'string' }),
			],
		}),
		defineField({
			name: 'startupCard',
			title: 'Startup card',
			type: 'object',
			fields: [
				defineField({ name: 'title', title: 'Title', type: 'string' }),
				defineField({ name: 'description', title: 'Description', type: 'string' }),
				defineField({ name: 'ctaLabel', title: 'CTA label', type: 'string' }),
				defineField({ name: 'ctaUrl', title: 'CTA URL', type: 'string' }),
			],
		}),
		defineField({
			name: 'hobbyCard',
			title: 'Hobby card',
			type: 'object',
			fields: [
				defineField({ name: 'description', title: 'Description', type: 'string' }),
				defineField({ name: 'ctaLabel', title: 'CTA label', type: 'string' }),
				defineField({ name: 'ctaUrl', title: 'CTA URL', type: 'string' }),
			],
		}),
	],
	preview: {
		prepare() {
			return {
				title: 'Pricing page',
			}
		},
	},
})
