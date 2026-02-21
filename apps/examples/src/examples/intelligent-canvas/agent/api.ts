/** Gemini API types — adapted for function calling with generateContent */

export interface GeminiPart {
	text?: string
	functionCall?: { name: string; args: Record<string, unknown> }
	functionResponse?: { name: string; response: Record<string, unknown> }
	inlineData?: { mimeType: string; data: string }
}

export interface GeminiContent {
	role: 'user' | 'model'
	parts: GeminiPart[]
}

export interface FunctionDeclaration {
	name: string
	description: string
	parameters: Record<string, unknown>
}

export interface GeminiResponse {
	candidates: {
		content: { role: string; parts: GeminiPart[] }
		finishReason: string
	}[]
}

export async function callGemini(
	systemPrompt: string,
	contents: GeminiContent[],
	tools: FunctionDeclaration[]
): Promise<GeminiResponse> {
	const response = await fetch('/api/gemini', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			system_instruction: { parts: [{ text: systemPrompt }] },
			contents,
			tools: [{ functionDeclarations: tools }],
		}),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`Gemini API error ${response.status}: ${errorText}`)
	}

	return response.json()
}

/**
 * Generate text from Gemini without tools (simple text completion).
 */
export async function generateGeminiText(
	systemPrompt: string,
	userPrompt: string,
	temperature?: number
): Promise<string> {
	const body: Record<string, unknown> = {
		system_instruction: { parts: [{ text: systemPrompt }] },
		contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
	}
	if (temperature !== undefined) {
		body.generationConfig = { temperature }
	}
	const response = await fetch('/api/gemini', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`Gemini API error ${response.status}: ${errorText}`)
	}

	const data: GeminiResponse = await response.json()
	return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

/**
 * Generate text from Gemini Pro (3.1 Pro — used for composition).
 */
export async function generateGeminiProText(
	systemPrompt: string,
	userPrompt: string,
	temperature?: number
): Promise<string> {
	const body: Record<string, unknown> = {
		system_instruction: { parts: [{ text: systemPrompt }] },
		contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
	}
	if (temperature !== undefined) {
		body.generationConfig = { temperature }
	}
	const response = await fetch('/api/gemini/pro', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`Gemini Pro API error ${response.status}: ${errorText}`)
	}

	const data: GeminiResponse = await response.json()
	return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

/**
 * Generate text from Gemini Flash (fast, cheap model for simple tasks).
 */
export async function generateGeminiFlashText(
	systemPrompt: string,
	userPrompt: string
): Promise<string> {
	const response = await fetch('/api/gemini/flash', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			system_instruction: { parts: [{ text: systemPrompt }] },
			contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
		}),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`Gemini Flash API error ${response.status}: ${errorText}`)
	}

	const data: GeminiResponse = await response.json()
	return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

/**
 * Generate text from Gemini with an inline image (vision request).
 */
export async function generateGeminiVision(
	systemPrompt: string,
	userPrompt: string,
	imageData: { mimeType: string; data: string }
): Promise<string> {
	const response = await fetch('/api/gemini', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			system_instruction: { parts: [{ text: systemPrompt }] },
			contents: [
				{
					role: 'user',
					parts: [
						{ inlineData: { mimeType: imageData.mimeType, data: imageData.data } },
						{ text: userPrompt },
					],
				},
			],
		}),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`Gemini API error ${response.status}: ${errorText}`)
	}

	const data: GeminiResponse = await response.json()
	return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}
