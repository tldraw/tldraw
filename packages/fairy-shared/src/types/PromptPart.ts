import { PROMPT_PART_DEFINITIONS } from '../schema/FairySchema'
import { PromptPartDefinition } from '../schema/PromptPartDefinitions'

type ExtractPromptPartType<T> = T extends PromptPartDefinition<infer U> ? U : never

export type PromptPart = ExtractPromptPartType<(typeof PROMPT_PART_DEFINITIONS)[number]>
