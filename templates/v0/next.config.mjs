const nextConfig = {
	experimental: {
		appDir: true,
	},
	output: 'standalone',
	images: {
		unoptimized: process.env.NODE_ENV === 'development',
	},
}

export default nextConfig
