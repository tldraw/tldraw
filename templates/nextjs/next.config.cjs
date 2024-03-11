/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		serverComponentsExternalPackages: ['@tldraw/tldraw'],
	},
}

module.exports = nextConfig
