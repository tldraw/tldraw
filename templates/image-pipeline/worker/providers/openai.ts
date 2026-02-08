import { placeholder } from './placeholder'
import type { GenerateParams, GenerateResult, ImageProvider } from './types'

export const openai: ImageProvider = {
	name: 'openai',

	async generate(params: GenerateParams, env: Env): Promise<GenerateResult> {
		const apiKey = env.OPENAI_API_KEY
		if (!apiKey) {
			return placeholder.generate(params, env)
		}

		const response = await fetch('https://api.openai.com/v1/images/generations', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: params.modelId === 'dall-e-2' ? 'dall-e-2' : 'dall-e-3',
				prompt: params.prompt,
				n: 1,
				size: '1024x1024',
				response_format: 'b64_json',
			}),
		})

		if (!response.ok) {
			const text = await response.text()
			throw new Error(`OpenAI error ${response.status}: ${text}`)
		}

		const data = (await response.json()) as {
			data: Array<{ b64_json: string }>
		}
		return {
			imageUrl: `data:image/png;base64,${data.data[0].b64_json}`,
			seed: params.seed ?? 0,
		}
	},
}
