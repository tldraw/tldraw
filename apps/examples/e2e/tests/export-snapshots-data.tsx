/* eslint-disable react/no-string-refs, local/no-internal-imports */
import { degreesToRadians, TLShapeCrop, toRichText } from 'tldraw'
import { TL } from 'tldraw/src/test/test-jsx'

export const frameContent = (
	<>
		<TL.geo
			richText={toRichText('content')}
			w={100}
			h={100}
			x={50}
			y={50}
			rotation={degreesToRadians(35)}
			fill="solid"
			color="orange"
		/>
		<TL.arrow start={{ x: 50, y: 50 }} end={{ x: 50, y: 20 }} />
	</>
)

export const manAsset = (
	<TL.asset.image
		w={100}
		h={200}
		src="/man.png"
		name="man"
		isAnimated={false}
		mimeType="image/png"
	/>
)
export const manCrop: TLShapeCrop = {
	topLeft: { x: 0.25, y: 0.05 },
	bottomRight: { x: 0.75, y: 0.3 },
}
export const manCropAsCircle: TLShapeCrop = {
	topLeft: { x: 0.25, y: 0.05 },
	bottomRight: { x: 0.75, y: 0.3 },
	isCircle: true,
}
export const richText = {
	type: 'doc',
	content: [
		{
			type: 'heading',
			attrs: { dir: 'auto', level: 3 },
			content: [{ type: 'text', text: 'Headers for things' }],
		},
		{
			type: 'bulletList',
			content: [
				{
					type: 'listItem',
					content: [
						{
							type: 'paragraph',
							attrs: { dir: 'auto' },
							content: [{ type: 'text', text: 'testing 123' }],
						},
					],
				},
				{
					type: 'listItem',
					content: [
						{
							type: 'paragraph',
							attrs: { dir: 'auto' },
							content: [
								{ type: 'text', text: 'lists and ' },
								{
									type: 'text',
									marks: [
										{
											type: 'link',
											attrs: {
												href: 'https://tldraw.dev',
												target: '_blank',
												rel: 'noopener noreferrer nofollow',
												class: null,
											},
										},
									],
									text: 'links',
								},
							],
						},
					],
				},
			],
		},
		{
			type: 'paragraph',
			attrs: { dir: 'auto' },
			content: [
				{ type: 'text', marks: [{ type: 'bold' }], text: 'and' },
				{ type: 'text', text: ' ' },
				{ type: 'text', marks: [{ type: 'strike' }], text: 'obvs' },
				{ type: 'text', text: ' ' },
				{ type: 'text', marks: [{ type: 'highlight' }], text: 'rich' },
				{ type: 'text', text: ' ' },
				{ type: 'text', marks: [{ type: 'code' }], text: 'text' },
			],
		},
		{
			type: 'paragraph',
			attrs: { dir: 'auto' },
			content: [
				{ type: 'text', marks: [{ type: 'highlight' }], text: 'highlight ' },
				{ type: 'text', marks: [{ type: 'highlight' }, { type: 'bold' }], text: 'across' },
				{ type: 'text', marks: [{ type: 'highlight' }], text: ' styles' },
			],
		},
	],
}

export const richTextForArrow = {
	type: 'doc',
	content: [
		{
			type: 'heading',
			attrs: { dir: 'auto', level: 3 },
			content: [{ type: 'text', text: 'Headers' }],
		},
		{
			type: 'paragraph',
			attrs: { dir: 'auto' },
			content: [
				{ type: 'text', marks: [{ type: 'highlight' }], text: 'rich' },
				{ type: 'text', text: ' ' },
				{ type: 'text', marks: [{ type: 'code' }], text: 'text' },
			],
		},
	],
}

export const convexDrawShape = (
	<TL.draw
		x={0.62}
		y={0}
		ref="convex"
		color="black"
		fill="none"
		isClosed={false}
		isComplete={true}
		isPen={false}
		size="m"
		zoom={1}
		segments={[
			{
				type: 'free',
				firstPoint: { x: 0, y: 0 },
				points: [
					0, 0, 1, 0, 4, 0, 11, 0, 23, 0, 32, 0, 36, 0, 35, 0, 32, 0, 30, 0, 31, 0, 28, 3, 26, 9,
					27, 12, 27, 15, 23, 18, 18, 19, 19, 24, 19, 29, 19, 32, 19, 37, 16, 43, 13, 43, 10, 43, 6,
					41, 4, 41, 1, 41, 0, 34, 0, 34, -1, 32, -3, 22, -6, 21, -7, 19, -9, 17, -9, 16, -11, 16,
					-12, 17, -12, 17, -13, 16, -16, 17, -16, 15, -18, 14, -19, 13, -19, 9, -20, 9, -18, 7,
					-19, 5, -21, 5, -23, 4, -22, 4, -22, 3, -21, 1, -19, 0, -17, 0, -15, 0, -13, 0, -12, 0,
					-10, 0, -9, 0, -8, 0, -8, 0, -7, 0, -6, 0, -5, 0, -5, 0, -5, 0, -4, 0, -4, 0, -3, 0, -4,
					0, -4, 0, -4, 0, -5, 0, -5, 0, -3, 0, -2, 0,
				],
			},
		]}
	/>
)

export const heyDrawShape = (
	<TL.draw
		x={0}
		y={39.65841178508872}
		ref="hey"
		color="black"
		fill="none"
		isClosed={false}
		isComplete={true}
		isPen={false}
		size="m"
		zoom={1}
		segments={[
			{
				type: 'free',
				firstPoint: { x: 0, y: 0 },
				points: [
					0, 0, 1, 0, 8, -2, 16, -8, 21, -15, 25, -23, 27, -32, 32, -46, 28, -51, 22, -51, 15, -44,
					7, -28, 4, -25, 1, -26, -1, -17, -6, -11, -10, -11, -11, -6, -12, -2, -13, 0, -14, 4, -14,
					10, -13, 14, -11, 18, -9, 21, -6, 24, -3, 26, -1, 28, 0, 28, 2, 25, 5, 24, 7, 26, 7, 27,
					6, 30, 5, 31, 5, 30, 4, 32, 3, 32, 2, 30, 2, 30, 1, 28, 0, 24, -2, 19, -6, 16, -8, 14,
					-10, 11, -13, 8, -13, 6, -15, 4, -14, 1, -13, -1, -11, -5, -9, -11, -6, -14, -3, -15, -1,
					-14, 1, -13, 5, -13, 10, -13, 14, -14, 18, -16, 21, -17, 24, -17, 25, -18, 26, -17, 26,
					-18, 25, -19, 27, -21, 24, -21, 19, -20, 18, -22, 18, -26, 18, -31, 13, -30, 9, -30, 7,
					-31, 4, -26, 0, -18, -2, -14, -5, -11, -6, -6, -5, -3, -6, -1, -7, 0, -9, 4, -11, 10, -11,
					13, -11, 15, -9, 18, -8, 20, -6, 22, -5, 26, -5, 32, -3, 32, -2, 35, -1, 36, 0, 30, 0, 30,
					1, 27, 4, 24, 7, 20, 7, 17, 7, 13, 6, 9, 6, 7, 7, 5, 7, 4, 9, 3, 11, 2, 11, 0, 13, -1, 15,
					-4, 15, -8, 14, -10, 12, -11, 12, -13, 11, -16, 9, -17, 7, -18, 5, -19, 3, -20, 1, -19, 0,
					-15, -2, -13, -4, -10, -6, -5, -6, -4, -6, -2, -5, -1, -6, 1, -7, 4, -6, 7, -6, 8, -7, 10,
					-7, 11, -6, 10, -5, 9, -5, 9, -4, 9, -3, 10, -2, 11, -1, 11, -1, 13, 0, 13, 0, 14, 0, 12,
					2, 9, 3, 8, 4, 7, 5, 6, 5, 5, 6, 5, 6, 5, 7, 4, 9, 4, 9, 3, 8, 2, 9, 1, 10, 1, 11, 0, 11,
					-3, 11, -6, 11, -8, 11, -10, 10, -11, 8, -13, 7, -15, 7, -16, 5, -17, 4, -17, 3, -17, 2,
					-19, 2, -20, 2, -17, 2, -13, 1, -10, 1, -5, 0, -2, 0, 0, 0, 1, 0, 2, 0, 5, 0, 7, 0, 9, 0,
					11, 0, 13, 0, 14, 0, 15, 1, 15, 2, 15, 3, 14, 4, 14, 4, 13, 5, 13, 5, 13, 6, 13, 6, 10, 8,
					10, 9, 9, 9, 5, 11, 3, 10, 1, 10, 0, 10, -2, 8, -6, 7, -8, 5, -9, 5, -11, 5, -16, 5, -20,
					7, -23, 8, -25, 7, -22, 5, -16, 3, -11, 2, -8, 1, -4, 1, -2, 0, 0, 0, 0, 0, 2, 0, 6, 0,
					12, 0, 18, 0, 23, -2, 26, -3, 30, -5, 34, -4, 33, -3, 30, -1, 29, 0, 27, 0, 24, 0, 23, 0,
					24, 0, 24, -2, 23, -4, 21, -5, 19, -6, 16, -10, 15, -14, 14, -17, 13, -19, 11, -19, 7,
					-18, 3, -18, -1, -18, -7, -17, -11, -15, -11, -10, -9, -7, -8, -6, -9, -3, -9, -1, -8, 0,
					-8, 1, -8, 4, -7, 9, -6, 14, -7, 18, -6, 23, -6, 25, -6, 24, -5, 24, -6, 24, -6, 22, -6,
					20, -7, 20, -10, 23, -15, 23, -19, 24, -25, 26, -31, 23, -31, 22, -38, 20, -44, 13, -46,
					10, -49, 8, -51, 6, -51, 3, -50, 1, -51, -4, -49, -8, -38, -12, -31, -16, -27, -17, -19,
					-18, -14, -17, -10, -17, -5, -17, -1, -16, 0, -16, 2, -16, 7, -16, 10, -17, 14, -16, 15,
					-13, 14, -10, 13, -8, 12, -5, 11, -2, 10, -1, 10, 0, 11, 0, 11, 2, 9, 6, 8, 8, 7, 7, 5, 7,
					3, 8, 2, 8, 0, 8, -2, 7, -6, 7, -7, 7, -8, 5, -7, 4, -6, 2, -5, 1, -3, 1, -2, 0, -1, 0,
					-1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1,
				],
			},
		]}
	/>
)
