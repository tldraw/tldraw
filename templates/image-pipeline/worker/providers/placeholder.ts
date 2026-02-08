import type {
	GenerateParams,
	GenerateResult,
	ImageProvider,
	UpscaleParams,
	UpscaleResult,
} from './types'

export const placeholder: ImageProvider = {
	name: 'placeholder',

	async generate(params: GenerateParams): Promise<GenerateResult> {
		const seed = params.seed ?? Math.floor(Math.random() * 100000)
		const hue = (seed * 137.508) % 360
		const steps = params.steps ?? 20
		const prompt = params.prompt.slice(0, 40)

		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
		<defs>
			<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="hsl(${hue}, 50%, 35%)"/>
				<stop offset="100%" stop-color="hsl(${(hue + 60) % 360}, 40%, 50%)"/>
			</linearGradient>
		</defs>
		<rect width="1024" height="1024" fill="url(#bg)"/>
		<text x="512" y="480" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="sans-serif" font-size="24" font-weight="bold">${prompt}</text>
		<text x="512" y="520" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="sans-serif" font-size="16">seed: ${seed} · steps: ${steps}</text>
		<text x="512" y="560" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-family="sans-serif" font-size="14">placeholder — configure API keys for real generation</text>
	</svg>`

		return {
			imageUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
			seed,
		}
	},

	async upscale(params: UpscaleParams): Promise<UpscaleResult> {
		const size = 512 * params.scale
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
		<defs><linearGradient id="ug" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0%" stop-color="hsl(200,60%,50%)"/>
			<stop offset="100%" stop-color="hsl(200,60%,70%)"/>
		</linearGradient></defs>
		<rect width="${size}" height="${size}" fill="url(#ug)"/>
		<text x="${size / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="middle" fill="rgba(255,255,255,0.7)" font-family="sans-serif" font-size="24">${params.scale}x ${params.method}</text>
		<text x="${size / 2}" y="${size / 2 + 30}" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="sans-serif" font-size="14">${size}×${size} · placeholder</text>
	</svg>`
		return {
			imageUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
		}
	},
}
