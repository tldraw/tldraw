import z from 'zod'
import { PromptPartRegistry } from '../PromptPartRegistry'

export type ScreenshotPart = z.infer<typeof ScreenshotPartSchema>
export const ScreenshotPartSchema = z.object({
	type: z.literal('screenshot'),
	screenshot: z.string().nullable(),
})

ScreenshotPartSchema.register(PromptPartRegistry, {
	priority: -40,
	buildContent({ screenshot }: ScreenshotPart) {
		if (!screenshot) return []
		return [
			'Here is the part of the canvas that you can currently see at this moment. It is not a reference image.',
			screenshot,
		]
	},
})
