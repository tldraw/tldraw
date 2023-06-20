/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	experimental: {
		scrollRestoration: true,
	},
	transpilePackages: ['@tldraw/utils'],
	async redirects() {
		return [
			{
				source: '/:sectionId/ucg/:articleId',
				destination: '/:sectionId/:articleId',
				permanent: true,
			},
			{
				source: '/docs/introduction',
				destination: '/introduction',
				permanent: true,
			},
			{
				source: '/docs/installation',
				destination: '/installation',
				permanent: true,
			},
			{
				source: '/docs/usage',
				destination: '/usage',
				permanent: true,
			},
			{
				source: '/ucg/:childId',
				destination: '/:childId',
				permanent: true,
			},
		]
	},
}

module.exports = nextConfig
