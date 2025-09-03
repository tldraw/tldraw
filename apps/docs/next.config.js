/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	experimental: {
		scrollRestoration: true,
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'substackcdn.com',
			},
			{
				protocol: 'https',
				hostname: 'i.pravatar.cc',
			},
			{
				protocol: 'https',
				hostname: 'i.imgur.com',
			},
		],
	},
	async redirects() {
		return [
			{
				// For backwards compatibility with old links
				source: '/:sectionId/ucg/:articleId',
				destination: '/:sectionId/:articleId',
				permanent: true,
			},
			{
				// For backwards compatibility with old links
				source: '/docs/introduction',
				destination: '/quick-start',
				permanent: true,
			},
			{
				// For backwards compatibility with old links
				source: '/introduction',
				destination: '/quick-start',
				permanent: true,
			},
			{
				// For backwards compatibility with old links
				source: '/docs/installation',
				destination: '/installation',
				permanent: true,
			},
			{
				// For backwards compatibility with old links
				source: '/docs/usage',
				destination: '/installation',
				permanent: true,
			},
			{
				// For backwards compatibility with old links
				source: '/usage',
				destination: '/installation',
				permanent: true,
			},
			{
				// To reflect that these are at the top level of the sidebar
				source: '/getting-started/:childId',
				destination: '/:childId',
				permanent: true,
			},
			{
				// For backwards compatibility with old links
				// (This is a page that we referred people to quite often)
				source: '/gen/editor/Editor-class',
				destination: '/reference/editor/Editor',
				permanent: true,
			},
			{
				// For backwards compatibility with old links
				// (This is a page that we referred people to quite often)
				source: '/gen/editor/ShapeUtil-class',
				destination: '/reference/editor/ShapeUtil',
				permanent: true,
			},
			{
				// For backwards compatibility with old links
				source: '/gen/:slug*',
				destination: '/reference/:slug*',
				permanent: true,
			},
			{
				// For backwards compatibility with renamed examples
				source: '/examples/basic/state-store',
				destination: '/examples/signals',
				permanent: true,
			},
			{
				// For backwards compatibility with old examples links
				source: '/examples/:categoryId/:articleId',
				destination: '/examples/:articleId',
				permanent: true,
			},
			{
				// For backwards compatibility with old examples links
				source: '/examples/:categoryId/:categoryId2/:articleId',
				destination: '/examples/:articleId',
				permanent: true,
			},
			{
				// For backwards compatibility with renamed examples
				source: '/examples/state-store',
				destination: '/examples/signals',
				permanent: true,
			},
			{
				// For backwards compatibility with renamed examples
				source: '/examples/basic/peristence-key',
				destination: '/examples/persistence-key',
				permanent: true,
			},
			{
				source: '/examples',
				destination: '/examples/basic',
				permanent: true,
			},
			{
				source: '/reference',
				destination: '/reference/editor/Editor',
				permanent: true,
			},
			{
				source: '/docs',
				destination: '/quick-start',
				permanent: true,
			},
		]
	},
}

module.exports = nextConfig
