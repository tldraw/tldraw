// import { AGENT_ACTION_UTILS } from '../AgentActionUtils'
import { AgentActionUtil, AgentActionUtilConstructor } from '../actions/AgentActionUtil'
import { BaseAgentAction } from './BaseAgentAction'

// type ExtractAgentActionType<T> = T extends AgentActionUtilConstructor<infer U> ? U : never

export type AgentAction = AgentActionUtil<BaseAgentAction>
// export type AgentAction = ExtractAgentActionType<(typeof AGENT_ACTION_UTILS)[number]>
