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
	userPrompt: string
): Promise<string> {
	const response = await fetch('/api/gemini', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			system_instruction: { parts: [{ text: systemPrompt }] },
			contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
		}),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`Gemini API error ${response.status}: ${errorText}`)
	}

	const data: GeminiResponse = await response.json()
	return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

/** ElevenLabs TTS with timestamps */

export interface ElevenLabsAlignment {
	characters: string[]
	character_start_times_seconds: number[]
	character_end_times_seconds: number[]
}

export interface TTSWithTimestampsResponse {
	audio_base64: string
	alignment: ElevenLabsAlignment
}

export interface WordTiming {
	word: string
	startTime: number
	endTime: number
}

export async function fetchTTSWithTimestamps(
	text: string,
	voiceId: string
): Promise<TTSWithTimestampsResponse> {
	const response = await fetch('/api/elevenlabs/tts-with-timestamps', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ text, voiceId }),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`ElevenLabs TTS error ${response.status}: ${errorText}`)
	}

	return response.json()
}

/** Convert character-level alignment data to word-level timings. */
export function getWordTimings(alignment: ElevenLabsAlignment): WordTiming[] {
	const { characters, character_start_times_seconds, character_end_times_seconds } = alignment
	const words: WordTiming[] = []
	let currentWord = ''
	let wordStart = 0

	for (let i = 0; i < characters.length; i++) {
		const char = characters[i]
		if (char === ' ' || char === '\n') {
			if (currentWord) {
				words.push({
					word: currentWord,
					startTime: wordStart,
					endTime: character_end_times_seconds[i - 1],
				})
				currentWord = ''
			}
		} else {
			if (!currentWord) {
				wordStart = character_start_times_seconds[i]
			}
			currentWord += char
		}
	}

	// Push the last word
	if (currentWord) {
		words.push({
			word: currentWord,
			startTime: wordStart,
			endTime: character_end_times_seconds[characters.length - 1],
		})
	}

	return words
}
