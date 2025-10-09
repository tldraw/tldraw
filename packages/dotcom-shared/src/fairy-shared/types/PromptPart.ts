// import { BasePromptPart } from './BasePromptPart'
import { PROMPT_PART_UTILS } from '../AgentPromptUtils'
import { PromptPartUtilConstructor } from '../parts/PromptPartUtil'

type ExtractPromptPartType<T> = T extends PromptPartUtilConstructor<infer U> ? U : never

// export type PromptPart = PromptPartUtil<BasePromptPart>
export type PromptPart = ExtractPromptPartType<(typeof PROMPT_PART_UTILS)[number]>
