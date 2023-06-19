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
		]
	},
}

module.exports = nextConfig
