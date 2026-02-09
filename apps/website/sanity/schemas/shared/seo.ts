import { defineField } from 'sanity'

export const seoFields = [
	defineField({
		name: 'metaTitle',
		title: 'Meta title',
		type: 'string',
		description: 'Override the default page title for search engines.',
	}),
	defineField({
		name: 'metaDescription',
		title: 'Meta description',
		type: 'text',
		rows: 3,
		description: 'A short description for search engine results.',
	}),
	defineField({
		name: 'ogImage',
		title: 'Open Graph image',
		type: 'image',
		description: 'Image shown when the page is shared on social media.',
	}),
]
