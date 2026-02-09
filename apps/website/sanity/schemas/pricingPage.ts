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
		}),
		defineField({
			name: 'subtitle',
			title: 'Subtitle',
			type: 'string',
		}),
		defineField({
			name: 'tiers',
			title: 'Tiers',
			type: 'array',
			of: [
				{
					type: 'reference',
					to: [{ type: 'pricingTier' }],
				},
			],
		}),
		defineField({
			name: 'faqItems',
			title: 'FAQ items',
			type: 'array',
			of: [
				{
					type: 'reference',
					to: [{ type: 'faqItem' }],
				},
			],
		}),
		defineField({
			name: 'contactCta',
			title: 'Contact CTA',
			type: 'object',
			fields: [
				defineField({ name: 'label', title: 'Label', type: 'string' }),
				defineField({ name: 'url', title: 'URL', type: 'string' }),
				defineField({ name: 'variant', title: 'Variant', type: 'string' }),
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
