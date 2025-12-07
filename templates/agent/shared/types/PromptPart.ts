import { PROMPT_PART_UTILS } from '../AgentUtils'
import { PromptPartUtilConstructor } from '../parts/PromptPartUtil'

type ExtractPromptPartType<T> = T extends PromptPartUtilConstructor<infer U> ? U : never

export type PromptPart = ExtractPromptPartType<(typeof PROMPT_PART_UTILS)[number]>
