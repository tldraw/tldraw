import z from 'zod'
import { Wand } from '../Wand'

export interface WandPart {
	type: 'wand'
	wand: Wand['type']
}
export const WandPartSchema = z.object({
	type: z.literal('wand'),
	wand: z.string(),
})
