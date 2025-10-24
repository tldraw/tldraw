import z from 'zod'
import { AgentMessage } from '../types/AgentMessage'

export const PromptPartRegistry = z.registry<{
	priority: number
	buildContent?(part: any): string[]
	buildMessages?(part: any): AgentMessage[]
}>()
