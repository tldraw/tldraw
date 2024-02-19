/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	experimental: {
		scrollRestoration: true,
	},
	transpilePackages: [],
	async redirects() {
		return [
			{
				// For reverse compatibility with old links
				source: '/:sectionId/ucg/:articleId',
				destination: '/:sectionId/:articleId',
				permanent: true,
			},
			{
				// For reverse compatibility with old links
				source: '/docs/introduction',
				destination: '/quick-start',
				permanent: true,
			},
			{
				// For reverse compatibility with old links
				source: '/introduction',
				destination: '/quick-start',
				permanent: true,
			},
			{
				// For reverse compatibility with old links
				source: '/docs/installation',
				destination: '/installation',
				permanent: true,
			},
			{
				// For reverse compatibility with old links
				source: '/docs/usage',
				destination: '/installation',
				permanent: true,
			},
			{
				// For reverse compatibility with old links
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
				// For reverse compatibility with old links
				// (This is a page that we referred people to quite often)
				source: '/gen/editor/Editor-class',
				destination: '/reference/editor/Editor',
				permanent: true,
			},
			{
				// For reverse compatibility with old links
				// (This is a page that we referred people to quite often)
				source: '/gen/editor/ShapeUtil-class',
				destination: '/reference/editor/ShapeUtil',
				permanent: true,
			},
			{
				// For reverse compatibility with old links
				source: '/gen/:slug*',
				destination: '/reference/:slug*',
				permanent: true,
			},
		]
	},
}

module.exports = nextConfig
