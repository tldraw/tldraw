/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	swcMinify: true,
	transpilePackages: [],
	productionBrowserSourceMaps: true,
	webpack: (config, context) => {
		config.module.rules.push({
			test: /\.(svg|json|woff2)$/,
			type: 'asset/resource',
		})
		return config
	},
	redirects: async () => {
		return [{ source: '/', destination: 'https://www.tldraw.com/', permanent: false }]
	},
	eslint: {
		ignoreDuringBuilds: true,
	},
	typescript: {
		ignoreBuildErrors: true,
	},
}

module.exports = nextConfig
