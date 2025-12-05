import { FairyHatType } from '@tldraw/fairy-shared'

export interface FairySpriteProps {
	bodyColor: string
	hatColor: string
	hatType: FairyHatType
	tint: string | null
	legLength: number
}

export interface WingSpriteProps extends FairySpriteProps {
	topWingColor: string
	bottomWingColor: string
}
