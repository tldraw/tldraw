import { TLShape, toRichText } from 'tldraw'

// [1]
export type TrayItem<T extends TLShape = TLShape> = T extends T
	? {
			id: string
			emoji: string
			label: string
			shapeBase: {
				type: T['type']
				props: Partial<T['props']>
			}
		}
	: never

export const TRAY_ITEMS: TrayItem<TLShape>[] = [
	{
		id: 'snowman',
		emoji: '⛄',
		label: 'Snowman',
		shapeBase: {
			type: 'geo',
			props: {
				richText: toRichText('⛄'),
				size: 'm',
			},
		},
	},
	{
		id: 'ice-cream',
		emoji: '🍦',
		label: 'Ice Cream',
		shapeBase: {
			type: 'geo',
			props: {
				richText: toRichText('🍦'),
				size: 'm',
			},
		},
	},
	{
		id: 'smiley',
		emoji: '😊',
		label: 'Smiley',
		shapeBase: {
			type: 'geo',
			props: {
				richText: toRichText('😊'),
				size: 'm',
			},
		},
	},
	{
		id: 'star',
		emoji: '⭐',
		label: 'Star',
		shapeBase: {
			type: 'geo',
			props: {
				richText: toRichText('⭐'),
				size: 'm',
			},
		},
	},
	{
		id: 'heart',
		emoji: '❤️',
		label: 'Heart',
		shapeBase: {
			type: 'geo',
			props: {
				richText: toRichText('❤️'),
				size: 'm',
			},
		},
	},
]
