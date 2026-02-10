import { defineField, defineType } from 'sanity'
import { seoFields } from './shared/seo'

export const featurePage = defineType({
	name: 'featurePage',
	title: 'Feature page',
	type: 'document',
	fields: [
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'slug',
			title: 'Slug',
			type: 'slug',
			options: {
				source: 'title',
				maxLength: 96,
			},
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'description',
			title: 'Description',
			type: 'text',
			rows: 3,
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'body',
			title: 'Body',
			type: 'array',
			of: [{ type: 'block' }],
		}),
		defineField({
			name: 'icon',
			title: 'Icon',
			type: 'string',
			description: 'Icon identifier for this feature.',
		}),
		defineField({
			name: 'category',
			title: 'Category',
			type: 'string',
			options: {
				list: [
					{ title: 'Featured', value: 'featured' },
					{ title: 'Group', value: 'group' },
					{ title: 'Capability', value: 'capability' },
				],
			},
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'parentGroup',
			title: 'Parent group',
			type: 'string',
			description:
				'Slug of the parent group page (e.g. "composable-primitives"). Only set for capability pages.',
		}),
		defineField({
			name: 'eyebrow',
			title: 'Eyebrow',
			type: 'string',
			description: 'Short label shown above the title (e.g. "Compose", "Control").',
		}),
		defineField({
			name: 'heroSubtitle',
			title: 'Hero subtitle',
			type: 'text',
			rows: 2,
			description: 'Longer subtitle shown below the main title on the hero.',
		}),
		defineField({
			name: 'children',
			title: 'Child capabilities',
			type: 'array',
			of: [
				{
					type: 'object',
					fields: [
						defineField({ name: 'title', title: 'Title', type: 'string' }),
						defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
						defineField({ name: 'slug', title: 'Slug', type: 'string' }),
					],
					preview: { select: { title: 'title', subtitle: 'slug' } },
				},
			],
			description: 'Capabilities listed on a group page with their descriptions and links.',
		}),
		defineField({
			name: 'order',
			title: 'Order',
			type: 'number',
			description: 'Controls the display order within the category.',
		}),
		defineField({
			name: 'coverImage',
			title: 'Cover image',
			type: 'image',
			options: { hotspot: true },
		}),
		defineField({
			name: 'seo',
			title: 'SEO',
			type: 'object',
			fields: seoFields,
		}),
	],
	preview: {
		select: {
			title: 'title',
			subtitle: 'description',
			media: 'coverImage',
		},
	},
})
