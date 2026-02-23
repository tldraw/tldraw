import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	reactStrictMode: true,
	experimental: {
		scrollRestoration: true,
	},
}

export default nextConfig
