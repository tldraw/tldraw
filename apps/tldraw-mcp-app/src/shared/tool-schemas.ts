import { z } from 'zod'

export const createShapesInputSchema = z.object({
	new_blank_canvas: z
		.boolean()
		.optional()
		.describe('If true, create_shapes starts from a new blank canvas. Defaults to false.'),
	shapesJson: z
		.string()
		.describe('JSON array string of shapes. Must be a valid JSON array string.'),
})

export type CreateShapesInput = z.infer<typeof createShapesInputSchema>

export const updateShapesInputSchema = z.object({
	updatesJson: z
		.string()
		.describe('JSON array string of shape updates. Must be a valid JSON array string.'),
})

export type UpdateShapesInput = z.infer<typeof updateShapesInputSchema>

export const deleteShapesInputSchema = z.object({
	shapeIdsJson: z
		.string()
		.describe(
			'JSON array string of shape ids to delete. Must be a valid JSON array string of shape ids.'
		),
})

export type DeleteShapesInput = z.infer<typeof deleteShapesInputSchema>

export const createImageInputSchema = z.object({
	url: z.string().describe('Public URL of the image to place on the canvas.'),
	x: z.number().describe('X position of the image on the canvas.'),
	y: z.number().describe('Y position of the image on the canvas.'),
	w: z.number().describe('Width of the image on the canvas.'),
	h: z.number().describe('Height of the image on the canvas.'),
})

export type CreateImageInput = z.infer<typeof createImageInputSchema>
