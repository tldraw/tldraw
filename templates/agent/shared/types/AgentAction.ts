import z from 'zod'
import { AGENT_ACTION_SCHEMAS } from '../schema/AgentActionSchemas'

type ExtractAgentActionType<T> = T extends z.ZodType<infer U> ? U : never

export type AgentAction = ExtractAgentActionType<(typeof AGENT_ACTION_SCHEMAS)[number]>
