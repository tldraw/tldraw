import z from 'zod'
import { AGENT_ACTION_SCHEMAS } from '../schema/FairySchema'
import { UnknownAction } from '../schema/actions/ActionSchemas'

export type AgentAction = z.infer<(typeof AGENT_ACTION_SCHEMAS)[number]> | UnknownAction
