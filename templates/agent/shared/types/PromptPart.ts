import { PromptPartDefinition } from '../schema/PromptPartDefinitions'
import { PROMPT_PART_DEFINITIONS } from '../schema/PromptPartRegistry'

type ExtractPromptPartType<T> = T extends PromptPartDefinition<infer U> ? U : never

export type PromptPart = ExtractPromptPartType<(typeof PROMPT_PART_DEFINITIONS)[number]>
