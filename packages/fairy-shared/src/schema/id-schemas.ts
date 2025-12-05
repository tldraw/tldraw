import z from 'zod'

export const TaskIdSchema = z.string().brand('taskId')
export type TaskId = z.infer<typeof TaskIdSchema>

export const AgentIdSchema = z.string().brand('fairyId')
export type AgentId = z.infer<typeof AgentIdSchema>

export const ProjectIdSchema = z.string().brand('projectId')
export type ProjectId = z.infer<typeof ProjectIdSchema>

export const TodoIdSchema = z.number().brand('todoId')
export type TodoId = z.infer<typeof TodoIdSchema>

export const SimpleShapeIdSchema = z.string().brand('simpleShapeId')
export type SimpleShapeId = z.infer<typeof SimpleShapeIdSchema>

export type SimpleShapeIdKey = `${SimpleShapeId}_${string}`

export const TldrawShapeIdSchema = z.string().brand('tldrawShapeId')
export type TldrawShapeId = z.infer<typeof TldrawShapeIdSchema>
