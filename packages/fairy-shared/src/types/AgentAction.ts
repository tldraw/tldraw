import z from 'zod'
import { AGENT_ACTION_SCHEMAS } from '../FairySchema'
import { UnknownAction } from './AgentActionSchema'

export type AgentAction = z.infer<(typeof AGENT_ACTION_SCHEMAS)[number]> | UnknownAction
