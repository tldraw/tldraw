/** @type {import('next').NextConfig} */

// Configurable domain for rewrites
const REWRITE_DOMAIN = 'tldrawdotdev.framer.website'

// Function to fetch Framer sitemap and generate dynamic rewrites
async function getFramerRewrites() {
	try {
		const response = await fetch(`https://${REWRITE_DOMAIN}/sitemap.xml`)
		if (!response.ok) {
			throw new Error(`Failed to fetch Framer sitemap for rewrites: ${response.statusText}`)
		}

		const xmlText = await response.text()
		const urlRegex = /<url>\s*<loc>(.*?)<\/loc>/g
		const rewrites = []

		let match
		while ((match = urlRegex.exec(xmlText)) !== null) {
			const url = match[1]
			const path = new URL(url).pathname

			// Skip root path since it's already handled
			if (path !== '/') {
				rewrites.push({
					source: path,
					destination: `https://${REWRITE_DOMAIN}${path}`,
				})
			}
		}

		console.log(`Generated ${rewrites.length} dynamic rewrites from Framer sitemap`)
		return rewrites
	} catch (error) {
		console.error('Error fetching Framer sitemap for rewrites:', error)
		throw error
	}
}

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
			{
				source: '/releases-versioning',
				destination: '/releases',
				permanent: true,
			},
		]
	},
	async rewrites() {
		const dynamicFramerRewrites = await getFramerRewrites()

		const rewrites = {
			beforeFiles: [
				{
					source: '/',
					destination: `https://${REWRITE_DOMAIN}/`,
				},
				{
					source: '/404',
					destination: `https://${REWRITE_DOMAIN}/404`,
				},
				// Dynamic rewrites from Framer sitemap
				...dynamicFramerRewrites,
				// Internal docs rewrites
				{
					source: '/releases',
					destination: '/getting-started/releases',
				},
				{
					source: '/quick-start',
					destination: '/getting-started/quick-start',
				},
				{
					source: '/installation',
					destination: '/getting-started/installation',
				},
			],
		}

		return rewrites
	},
}

module.exports = nextConfig
