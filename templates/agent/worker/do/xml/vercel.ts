import { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { generateText, LanguageModel, streamText } from 'ai'
import { IPromptInfo } from '../../../xml/xml-types'

export async function generateXmlVercel(model: LanguageModel, info: IPromptInfo): Promise<string> {
	const geminiThinkingBudget = model.modelId === 'gemini-2.5-pro' ? 128 : 0

	// get the prompt from `xml-system-prompt.md` gist
	const systemPrompt = await fetch(
		'https://gist.githubusercontent.com/steveruizok/bd8726cafae16ed73d1a72265de8d9c9/raw/53522bd6842bf230d1a8ed832d55d2f9e307749f/xml-system-prompt.md'
	).then((res) => res.text())

	const xmlPrompt = [
		`<canvas-context>`,
		`  <canvas-contents>`,
		`    ${info.contents
			.map((s) => {
				return `<shape id="${s.id}" index="${s.index}" type="${s.type}" minX="${s.minX}" minY="${s.minY}" maxX="${s.maxX}" maxY="${s.maxY}" />`
			})
			.join('\n')}`,
		`  </canvas-contents>`,
		`  <user-viewport minX="${info.viewport.minX}" minY="${info.viewport.minY}" maxX="${info.viewport.maxX}" maxY="${info.viewport.maxY}" />`,
		`</canvas-context>`,
		`<user-prompt>`,
		`  ${info.prompt}`,
		`</user-prompt>`,
	].join('\n')

	try {
		const response = await generateText({
			model,
			system: systemPrompt,
			messages: [
				{
					role: 'user',
					content: info.image
						? [
								{
									type: 'image',
									image: info.image,
								},
								{
									type: 'text',
									text: xmlPrompt,
								},
							]
						: [
								{
									type: 'text',
									text: xmlPrompt,
								},
							],
				},
			],
			providerOptions: {
				google: {
					thinkingConfig: { thinkingBudget: geminiThinkingBudget },
				} satisfies GoogleGenerativeAIProviderOptions,
				//anthropic doesnt allow thinking for tool use, which structured outputs forces to be enabled
				//the openai models we use dont support thinking anyway
			},
		})

		return response.text
	} catch (error: any) {
		console.error('generateXmlVercel error:', error)
		throw error
	}
}

export async function* streamXmlVercel(
	model: LanguageModel,
	info: IPromptInfo
): AsyncGenerator<string, void, unknown> {
	const geminiThinkingBudget = model.modelId === 'gemini-2.5-pro' ? 128 : 0

	// get the prompt from `xml-system-prompt.md` gist
	const systemPrompt = await fetch(
		'https://gist.githubusercontent.com/steveruizok/bd8726cafae16ed73d1a72265de8d9c9/raw/53522bd6842bf230d1a8ed832d55d2f9e307749f/xml-system-prompt.md'
	).then((res) => res.text())

	const xmlPrompt = [
		`<canvas-context>`,
		`  <canvas-contents>`,
		`    ${info.contents
			.map((s) => {
				return `<shape id="${s.id}" index="${s.index}" type="${s.type}" minX="${s.minX}" minY="${s.minY}" maxX="${s.maxX}" maxY="${s.maxY}" />`
			})
			.join('\n')}`,
		`  </canvas-contents>`,
		`  <user-viewport minX="${info.viewport.minX}" minY="${info.viewport.minY}" maxX="${info.viewport.maxX}" maxY="${info.viewport.maxY}" />`,
		`</canvas-context>`,
		`<user-prompt>`,
		`  ${info.prompt}`,
		`</user-prompt>`,
	].join('\n')

	try {
		const result = streamText({
			model,
			system: systemPrompt,
			messages: [
				{
					role: 'user',
					content: info.image
						? [
								{
									type: 'image',
									image: info.image,
								},
								{
									type: 'text',
									text: xmlPrompt,
								},
							]
						: [
								{
									type: 'text',
									text: xmlPrompt,
								},
							],
				},
			],
			providerOptions: {
				google: {
					thinkingConfig: { thinkingBudget: geminiThinkingBudget },
				} satisfies GoogleGenerativeAIProviderOptions,
				//anthropic doesnt allow thinking for tool use, which structured outputs forces to be enabled
				//the openai models we use dont support thinking anyway
			},
		})

		for await (const delta of result.textStream) {
			yield delta
		}
	} catch (error: any) {
		console.error('streamXmlVercel error:', error)
		throw error
	}
}
