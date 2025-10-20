import z from 'zod'
import { UnknownAction } from '../schema/AgentActionSchema'
import { AGENT_ACTION_SCHEMAS } from '../schema/FairySchema'

export type AgentAction = z.infer<(typeof AGENT_ACTION_SCHEMAS)[number]> | UnknownAction
