import { Box, BoxModel, Editor, FileHelpers, structuredClone, TLShape } from 'tldraw'
import { TLAgentContent, TLAgentPrompt, TLAgentPromptOptions } from '../types/TLAgentPrompt'

/**
 * Get a full prompt based on the provided prompt options, transformed by
 * the specified transforms.
 *
 * @returns The fully transformed prompt, and a function to transform back
 * the changes that come back from the agent.
 */
export async function preparePrompt(promptOptions: TLAgentPromptOptions) {
	const { editor, ...rest } = promptOptions

	// TODO: Replace these hardcoded things with custom prompt parts
	const canvasContent = getCanvasContent({ editor, bounds: promptOptions.contextBounds })
	const image = await getScreenshot({
		editor,
		shapes: canvasContent.shapes,
		bounds: promptOptions.contextBounds,
	})

	const prompt: TLAgentPrompt = {
		...rest,
		canvasContent,
		image,
	}

	// for (const transform of transforms) {
	// 	if (transform.transformPrompt) {
	// 		prompt = transform.transformPrompt(prompt)
	// 	}
	// }

	// transforms.reverse()

	// const transformEvent = (event: Streaming<IAgentEvent>) => {
	// 	for (const transform of transforms) {
	// 		if (transform.transformEvent) {
	// 			event = transform.transformEvent(event)
	// 		}
	// 	}
	// 	return event
	// }

	return prompt
}

/**
 * Get all the shapes and bindings from a given area in the current page.
 *
 * @returns An object containing the shapes and bindings.
 */
function getCanvasContent({
	editor,
	bounds,
}: {
	editor: Editor
	bounds: BoxModel
}): TLAgentContent {
	const contentFromCurrentPage = editor.getContentFromCurrentPage(
		editor
			.getCurrentPageShapesSorted()
			.filter((s) => Box.From(bounds).includes(editor.getShapeMaskedPageBounds(s)!))
	)

	if (contentFromCurrentPage) {
		return {
			shapes: structuredClone(contentFromCurrentPage.shapes),
			bindings: structuredClone(contentFromCurrentPage.bindings ?? []),
		}
	}

	return {
		shapes: [],
		bindings: [],
	}
}

/**
 * Get an image of the canvas content.
 * *
 * @returns The image data URL.
 */
async function getScreenshot({
	editor,
	shapes,
	bounds,
}: {
	editor: Editor
	shapes: TLShape[]
	bounds: BoxModel
}) {
	if (shapes.length === 0) return undefined
	const result = await editor.toImage(shapes, {
		format: 'jpeg',
		background: true,
		bounds: Box.From(bounds),
		padding: 0,
	})

	return await FileHelpers.blobToDataUrl(result.blob)
}
