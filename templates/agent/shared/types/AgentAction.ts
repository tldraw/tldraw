import { AGENT_ACTION_UTILS } from '../AgentUtils'
import { AgentActionUtilConstructor } from '../actions/AgentActionUtil'

type ExtractActionType<T> = T extends AgentActionUtilConstructor<infer U> ? U : never

export type AgentAction = ExtractActionType<(typeof AGENT_ACTION_UTILS)[number]>
