import { defineDocumentType, makeSource } from 'contentlayer/source-files'

const Author = defineDocumentType(() => ({
	name: 'Author',
	filePathPattern: `authors/**/*.mdx`,
	fields: {
		name: { type: 'string', required: true },
		description: { type: 'string', required: false },
		avatar: { type: 'string', required: true },
		twitterHandle: { type: 'string', required: false },
	},
	computedFields: {
		slug: {
			type: 'string',
			resolve: (author) => author._raw.sourceFileName.replace('.mdx', ''),
		},
	},
}))

const Category = defineDocumentType(() => ({
	name: 'Category',
	filePathPattern: `categories/**/*.mdx`,
	fields: {
		name: { type: 'string', required: true },
		description: { type: 'string', required: false },
	},
	computedFields: {
		slug: {
			type: 'string',
			resolve: (category) => category._raw.sourceFileName.replace('.mdx', ''),
		},
	},
}))

const Post = defineDocumentType(() => ({
	name: 'Post',
	filePathPattern: `posts/**/*.mdx`,
	fields: {
		title: { type: 'string', required: true },
		excerpt: { type: 'string', required: true },
		thumbnail: { type: 'string', required: true },
		date: { type: 'date', required: true },
		category: { type: 'enum', options: ['release-notes', 'announcements', 'product'] },
		authors: { type: 'list', of: { type: 'string' }, required: true },
	},
	computedFields: {
		slug: {
			type: 'string',
			resolve: (post) => post._raw.sourceFileName.replace('.mdx', ''),
		},
	},
}))

export default makeSource({
	contentDirPath: 'blog',
	documentTypes: [Post, Category, Author],
})
