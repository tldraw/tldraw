import { toRichText } from 'tldraw'

// [1]
export interface TrayItem {
	id: string
	emoji: string
	label: string
	shapeType: 'geo'
	shapeProps: any
}

export const TRAY_ITEMS: TrayItem[] = [
	{
		id: 'snowman',
		emoji: '⛄',
		label: 'Snowman',
		shapeType: 'geo',
		shapeProps: {
			richText: toRichText('⛄'),
			size: 'm',
		},
	},
	{
		id: 'ice-cream',
		emoji: '🍦',
		label: 'Ice Cream',
		shapeType: 'geo',
		shapeProps: {
			richText: toRichText('🍦'),
			size: 'm',
		},
	},
	{
		id: 'smiley',
		emoji: '😊',
		label: 'Smiley',
		shapeType: 'geo',
		shapeProps: {
			richText: toRichText('😊'),
			size: 'm',
		},
	},
	{
		id: 'star',
		emoji: '⭐',
		label: 'Star',
		shapeType: 'geo',
		shapeProps: {
			richText: toRichText('⭐'),
			size: 'm',
		},
	},
	{
		id: 'heart',
		emoji: '❤️',
		label: 'Heart',
		shapeType: 'geo',
		shapeProps: {
			richText: toRichText('❤️'),
			size: 'm',
		},
	},
]
