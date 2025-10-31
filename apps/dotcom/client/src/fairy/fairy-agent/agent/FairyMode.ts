import { Wand } from "@tldraw/fairy-shared"

interface BaseFairyMode {
    id: string
    wand: Wand['type']
}

export type FairyMode = (typeof FAIRY_MODE_DEFINITIONS)[number]

export const FAIRY_MODE_DEFINITIONS = [
    {
        id: 'default',
        wand: 'god',
    },
    {
        id: 'orchestrator',
        wand: 'orchestrator',
    },
] as const satisfies BaseFairyMode[]

export const FAIRY_MODE_IDS = FAIRY_MODE_DEFINITIONS.map((mode) => mode.id)
export const FAIRY_MODE_DEFINITIONS_MAP = Object.fromEntries(
	FAIRY_MODE_DEFINITIONS.map((mode) => [mode.id, mode])
)

export function getFairyMode(id: FairyMode['id']): FairyMode {
	const mode = FAIRY_MODE_DEFINITIONS_MAP[id]
	if (!mode) throw new Error(`Unknown fairy mode: ${id}`)
	return mode
}
