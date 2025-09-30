/** @type {import('next').NextConfig} */

// Configurable domain for rewrites
const REWRITE_DOMAIN = 'tldrawdotdev.framer.website'

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
			{
				source: '/jobs',
				destination: '/careers',
				permanent: true,
			},
			{
				source: '/legal/cla',
				destination: '/legal/contributor-license-agreement',
				permanent: true,
			},
			{
				source: '/legal/trademarks',
				destination: '/legal/trademark-guidelines',
				permanent: true,
			},
		]
	},
	async rewrites() {
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
				{
					source: '/blog/announcements',
					destination: `https://${REWRITE_DOMAIN}/blog/category/announcements`,
				},
				{
					source: '/blog/case-studies',
					destination: `https://${REWRITE_DOMAIN}/blog/category/case-studies`,
				},
				{
					source: '/blog/product',
					destination: `https://${REWRITE_DOMAIN}/blog/category/product`,
				},
				{
					source: '/blog/release-notes',
					destination: `https://${REWRITE_DOMAIN}/blog/category/release-notes`,
				},
				{
					source: '/blog',
					destination: `https://${REWRITE_DOMAIN}/blog`,
				},
				{
					source: '/blog/:path+',
					destination: `https://${REWRITE_DOMAIN}/blog/:path*`,
				},
				{
					source: '/careers',
					destination: `https://${REWRITE_DOMAIN}/careers`,
				},
				{
					source: '/company',
					destination: `https://${REWRITE_DOMAIN}/company`,
				},
				{
					source: '/events',
					destination: `https://${REWRITE_DOMAIN}/events`,
				},
				{
					source: '/faq',
					destination: `https://${REWRITE_DOMAIN}/faq`,
				},
				{
					source: '/features/:path*',
					destination: `https://${REWRITE_DOMAIN}/features/:path*`,
				},
				{
					source: '/get-a-license/:path*',
					destination: `https://${REWRITE_DOMAIN}/get-a-license/:path*`,
				},
				{
					source: '/legal/:path*',
					destination: `https://${REWRITE_DOMAIN}/legal/:path*`,
				},
				{
					source: '/partner',
					destination: `https://${REWRITE_DOMAIN}/partner`,
				},
				{
					source: '/pricing',
					destination: `https://${REWRITE_DOMAIN}/pricing`,
				},
				{
					source: '/showcase',
					destination: `https://${REWRITE_DOMAIN}/showcase`,
				},
				{
					source: '/starter-kits',
					destination: `https://${REWRITE_DOMAIN}/starter-kits`,
				},
				{
					source: '/thanks',
					destination: `https://${REWRITE_DOMAIN}/thanks`,
				},
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
