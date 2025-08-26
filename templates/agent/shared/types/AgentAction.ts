import { EVENT_UTILS } from '../AgentUtils'
import { AgentActionUtilConstructor } from '../actions/AgentActionUtil'

type ExtractActionType<T> = T extends AgentActionUtilConstructor<infer U> ? U : never

export type AgentAction = ExtractActionType<(typeof EVENT_UTILS)[number]>
