import { AgentActionUtilConstructor } from '../actions/AgentActionUtil'
import { AGENT_ACTION_UTILS } from '../actions/AgentActionUtils'

type ExtractAgentActionType<T> = T extends AgentActionUtilConstructor<infer U> ? U : never

export type AgentAction = ExtractAgentActionType<(typeof AGENT_ACTION_UTILS)[number]>
