import { placeholder } from './placeholder'
import type { GenerateParams, GenerateResult, ImageProvider } from './types'
import { resolveImage } from './types'

export const google: ImageProvider = {
	name: 'google',

	async generate(params: GenerateParams, env: Env): Promise<GenerateResult> {
		const apiKey = env.GEMINI_API_KEY
		if (!apiKey) {
			return placeholder.generate(params, env)
		}

		const modelId =
			params.modelId === 'nano-banana' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview'

		const parts: Array<Record<string, unknown>> = [{ text: params.prompt }]

		// If a reference image is provided (for ControlNet-style editing), include it
		if (params.referenceImageUrl) {
			const { dataUrl } = await resolveImage(params.referenceImageUrl, env)
			const [header, data] = dataUrl.split(',')
			const mimeMatch = header.match(/data:([^;]+)/)
			const mime = mimeMatch?.[1] ?? 'image/png'
			parts.push({
				inline_data: {
					mime_type: mime,
					data,
				},
			})
		}

		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-goog-api-key': apiKey,
				},
				body: JSON.stringify({
					contents: [{ parts }],
					generationConfig: {
						responseModalities: ['IMAGE'],
						imageConfig: {
							aspectRatio: '1:1',
							imageSize: '1K',
						},
					},
				}),
			}
		)

		if (!response.ok) {
			const text = await response.text()
			throw new Error(`Gemini error ${response.status}: ${text}`)
		}

		const data = (await response.json()) as {
			candidates: Array<{
				content: {
					parts: Array<{
						text?: string
						inline_data?: { mime_type: string; data: string }
					}>
				}
			}>
		}

		const imagePart = data.candidates?.[0]?.content?.parts?.find((p) => p.inline_data)
		if (!imagePart?.inline_data) {
			throw new Error('Gemini response did not contain an image')
		}

		const { mime_type, data: b64 } = imagePart.inline_data
		return {
			imageUrl: `data:${mime_type};base64,${b64}`,
			seed: params.seed ?? 0,
		}
	},
}
