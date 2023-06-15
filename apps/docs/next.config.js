/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	experimental: {
		scrollRestoration: false,
	},
	transpilePackages: ['@tldraw/utils'],
}

module.exports = nextConfig
