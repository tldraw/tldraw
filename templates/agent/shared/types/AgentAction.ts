import { AGENT_ACTION_UTILS } from '../AgentUtils'
import { AgentActionUtilConstructor } from '../actions/AgentActionUtil'

type ExtractAgentActionType<T> = T extends AgentActionUtilConstructor<infer U> ? U : never

export type AgentAction = ExtractAgentActionType<(typeof AGENT_ACTION_UTILS)[number]>
