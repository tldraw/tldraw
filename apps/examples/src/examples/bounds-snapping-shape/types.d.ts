import { IPlayingCard } from './PlayingCardShape/playing-card-util'

declare module '@tldraw/tlschema' {
	export interface GlobalShapePropsMap {
		PlayingCard: IPlayingCard
	}
}
