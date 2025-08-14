import { EVENT_UTILS } from '../AgentUtils'
import { AgentEventUtilConstructor } from '../events/AgentEventUtil'

type ExtractEventType<T> = T extends AgentEventUtilConstructor<infer U> ? U : never

export type AgentEvent = ExtractEventType<(typeof EVENT_UTILS)[number]>
