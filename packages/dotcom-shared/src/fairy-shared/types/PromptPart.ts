import { PromptPartUtilConstructor } from '../parts/PromptPartUtil'
import { PROMPT_PART_UTILS } from '../parts/PromptPartUtils'

type ExtractPromptPartType<T> = T extends PromptPartUtilConstructor<infer U> ? U : never

export type PromptPart = ExtractPromptPartType<(typeof PROMPT_PART_UTILS)[number]>
