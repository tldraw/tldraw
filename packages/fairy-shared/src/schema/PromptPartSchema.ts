import { JsonValue } from 'tldraw'
import z from 'zod'
import { BlurryShapeSchema } from '../format/BlurryShape'
import { BoxModelSchema, PeripheralClusterSchema } from '../format/PeripheralCluster'
import { TodoItemSchema } from '../types/TodoItem'
import { FocusShapePartialSchema, FocusShapeSchema, FocusShapeTypeSchema } from './FocusShapeSchema'

export const BlurryShapesPartSchema = z
	.object({
		type: z.literal('blurryShapes'),
		shapes: z.array(BlurryShapeSchema).nullable(),
	})
	.meta({
		priority: 70,
	})

export type BlurryShapesPart = z.infer<typeof BlurryShapesPartSchema>

export const ChatHistoryPartSchema = z
	.object({
		type: z.literal('chatHistory'),
		// Todo
		items: z.array(z.any()).nullable(),
	})
	.meta({
		priority: Infinity,
	})

export type ChatHistoryPart = z.infer<typeof ChatHistoryPartSchema>

export const ContextItemsPartSchema = z
	.object({
		type: z.literal('contextItems'),
		// Todo
		items: z.array(z.any()),
		requestType: z.enum(['user', 'schedule', 'todo']),
	})
	.meta({
		priority: 60,
	})

export type ContextItemsPart = z.infer<typeof ContextItemsPartSchema>

const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
	z.union([
		z.union([z.boolean(), z.null(), z.string(), z.number()]),
		z.array(JsonValueSchema),
		z.record(z.string(), JsonValueSchema.optional()),
	])
)

export const DataPartSchema = z
	.object({
		type: z.literal('data'),
		data: z.array(JsonValueSchema),
	})
	.meta({
		priority: -200,
	})

export type DataPart = z.infer<typeof DataPartSchema>

export const MessagesPartSchema = z
	.object({
		type: z.literal('messages'),
		messages: z.array(z.string()),
		requestType: z.enum(['user', 'schedule', 'todo']),
	})
	.meta({
		priority: -Infinity,
	})

export type MessagesPart = z.infer<typeof MessagesPartSchema>

export const PeripheralShapesPartSchema = z
	.object({
		type: z.literal('peripheralShapes'),
		clusters: z.array(PeripheralClusterSchema).nullable(),
	})
	.meta({
		priority: 65,
	})

export type PeripheralShapesPart = z.infer<typeof PeripheralShapesPartSchema>

export const ScreenshotPartSchema = z
	.object({
		type: z.literal('screenshot'),
		screenshot: z.string().nullable(),
	})
	.meta({
		priority: 40,
	})

export type ScreenshotPart = z.infer<typeof ScreenshotPartSchema>

export const SelectedShapesPartSchema = z
	.object({
		type: z.literal('selectedShapes'),
		shapes: z.array(FocusShapeSchema).nullable(),
	})
	.meta({
		priority: 55,
	})

export type SelectedShapesPart = z.infer<typeof SelectedShapesPartSchema>

export const TimePartSchema = z.object({
	type: z.literal('time'),
	time: z.string(),
})

export type TimePart = z.infer<typeof TimePartSchema>

export const TodoListPartSchema = z
	.object({
		type: z.literal('todoList'),
		items: z.array(TodoItemSchema),
	})
	.meta({
		priority: 10,
	})

export type TodoListPart = z.infer<typeof TodoListPartSchema>

export const UserActionHistoryPartSchema = z
	.object({
		type: z.literal('userActionHistory'),
		added: z.array(
			z.object({
				shapeId: z.string(),
				type: FocusShapeTypeSchema,
			})
		),
		removed: z.array(
			z.object({
				shapeId: z.string(),
				type: FocusShapeTypeSchema,
			})
		),
		updated: z.array(
			z.object({
				shapeId: z.string(),
				type: FocusShapeTypeSchema,
				before: FocusShapePartialSchema,
				after: FocusShapePartialSchema,
			})
		),
	})
	.meta({
		priority: 40,
	})

export type UserActionHistoryPart = z.infer<typeof UserActionHistoryPartSchema>

export const ViewportBoundsPartSchema = z
	.object({
		type: z.literal('viewportBounds'),
		userBounds: BoxModelSchema.nullable(),
		agentBounds: BoxModelSchema.nullable(),
	})
	.meta({
		priority: 75,
	})

export type ViewportBoundsPart = z.infer<typeof ViewportBoundsPartSchema>
