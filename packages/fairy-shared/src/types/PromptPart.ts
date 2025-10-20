import z from 'zod'
import { PROMPT_PART_SCHEMAS } from '../schema/FairySchema'

export type PromptPart = z.infer<(typeof PROMPT_PART_SCHEMAS)[number]>
