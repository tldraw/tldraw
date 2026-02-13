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
			of: [
				{ type: 'block' },
				{ type: 'image', options: { hotspot: true } },
				{
					type: 'object',
					name: 'iconGrid',
					title: 'Icon grid',
					fields: [
						defineField({ name: 'heading', title: 'Heading', type: 'string' }),
						defineField({ name: 'subtitle', title: 'Subtitle', type: 'text', rows: 2 }),
						defineField({
							name: 'columns',
							title: 'Columns',
							type: 'number',
							options: { list: [2, 3, 4] },
							initialValue: 4,
						}),
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
										defineField({
											name: 'description',
											title: 'Description',
											type: 'text',
											rows: 2,
										}),
									],
									preview: { select: { title: 'title', subtitle: 'description' } },
								},
							],
						}),
						defineField({
							name: 'sideImage',
							title: 'Side image',
							type: 'image',
							options: { hotspot: true },
							description: 'Optional image displayed beside the grid.',
						}),
					],
					preview: {
						select: { title: 'heading' },
						prepare: ({ title }) => ({ title: title || 'Icon grid' }),
					},
				},
				{
					type: 'object',
					name: 'imageCardRow',
					title: 'Image card row',
					fields: [
						defineField({
							name: 'cards',
							title: 'Cards',
							type: 'array',
							of: [
								{
									type: 'object',
									fields: [
										defineField({
											name: 'image',
											title: 'Image',
											type: 'image',
											options: { hotspot: true },
										}),
										defineField({ name: 'icon', title: 'Icon', type: 'string' }),
										defineField({ name: 'title', title: 'Title', type: 'string' }),
										defineField({
											name: 'description',
											title: 'Description',
											type: 'text',
											rows: 2,
										}),
									],
									preview: { select: { title: 'title', media: 'image' } },
								},
							],
						}),
					],
					preview: {
						select: { cards: 'cards' },
						prepare: ({ cards }) => ({
							title: `Image card row (${cards?.length ?? 0} cards)`,
						}),
					},
				},
				{
					type: 'object',
					name: 'benefitCards',
					title: 'Benefit cards',
					fields: [
						defineField({ name: 'heading', title: 'Heading', type: 'string' }),
						defineField({
							name: 'cards',
							title: 'Cards',
							type: 'array',
							of: [
								{
									type: 'object',
									fields: [
										defineField({ name: 'icon', title: 'Icon', type: 'string' }),
										defineField({ name: 'title', title: 'Title', type: 'string' }),
										defineField({
											name: 'description',
											title: 'Description',
											type: 'text',
											rows: 3,
										}),
										defineField({
											name: 'bullets',
											title: 'Bullet points',
											type: 'array',
											of: [{ type: 'string' }],
										}),
										defineField({
											name: 'linkLabel',
											title: 'Link label',
											type: 'string',
										}),
										defineField({ name: 'linkUrl', title: 'Link URL', type: 'url' }),
									],
									preview: { select: { title: 'title', subtitle: 'description' } },
								},
							],
						}),
					],
					preview: {
						select: { title: 'heading' },
						prepare: ({ title }) => ({ title: title || 'Benefit cards' }),
					},
				},
			],
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
