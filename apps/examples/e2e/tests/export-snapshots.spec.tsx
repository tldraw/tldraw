/* eslint-disable local/no-at-internal, local/no-internal-imports */
import { Page, expect } from '@playwright/test'
import assert from 'assert'
import { rename, writeFile } from 'fs/promises'
import { Fragment, ReactElement } from 'react'
import {
	DefaultColorStyle,
	DefaultDashStyle,
	DefaultFillStyle,
	DefaultFontStyle,
	Editor,
	GeoShapeGeoStyle,
	TLAsset,
	TLImageShapeCrop,
	TLShapePartial,
	TLTextShape,
	degreesToRadians,
	mapObjectMapValues,
	mockUniqueId,
} from 'tldraw'
import { TL, shapesFromJsx } from 'tldraw/src/test/test-jsx'
import { EndToEndApi } from '../../src/misc/EndToEndApi'
import { setup } from '../shared-e2e'
import test, { ApiFixture } from './fixtures/fixtures'

declare const editor: Editor
declare const tldrawApi: EndToEndApi

let nextNanoId = 0
mockUniqueId(() => `mock-${nextNanoId++}`)

interface Snapshots {
	[name: string]: { [row: string]: { [testCase: string]: ReactElement } }
}

const frameContent = (
	<Fragment>
		<TL.geo
			text="content"
			w={100}
			h={100}
			x={50}
			y={50}
			rotation={degreesToRadians(35)}
			fill="solid"
			color="orange"
		/>
		<TL.arrow start={{ x: 50, y: 50 }} end={{ x: 50, y: 20 }} />
	</Fragment>
)
const manAsset = (
	<TL.asset.image
		w={100}
		h={200}
		src="/man.png"
		name="man"
		isAnimated={false}
		mimeType="image/png"
	/>
)
const manCrop: TLImageShapeCrop = {
	topLeft: { x: 0.25, y: 0.05 },
	bottomRight: { x: 0.75, y: 0.3 },
}
const manCropAsCircle: TLImageShapeCrop = {
	topLeft: { x: 0.25, y: 0.05 },
	bottomRight: { x: 0.75, y: 0.3 },
	isCircle: true,
}

const snapshots: Snapshots = {
	'Text rendering': {
		'geo text': {
			'leading line breaks': <TL.geo text={'\n\n\n\n\n\ntext'} w={100} h={30} />,
			'trailing line breaks': <TL.geo text={'text\n\n\n\n\n\n'} w={100} h={30} />,
			'mixed RTL': <TL.geo text={'unicode is cool!\nكتابة باللغة  العرب!'} w={300} h={300} />,
		},
	},
	Fills: Object.fromEntries(
		DefaultFillStyle.values.map((fill) => [
			`fill=${fill}`,
			{
				geo: <TL.geo fill={fill} color="green" w={100} h={100} />,
				arrow: (
					<TL.arrow
						fill={fill}
						color="light-green"
						arrowheadStart="square"
						arrowheadEnd="dot"
						start={{ x: 0, y: 0 }}
						end={{ x: 100, y: 100 }}
						bend={20}
					/>
				),
				draw: (
					<TL.draw
						fill={fill}
						color="light-violet"
						segments={[
							{ type: 'straight', points: [{ x: 0, y: 0 }] },
							{
								type: 'straight',
								points: [
									{ x: 0, y: 0 },
									{ x: 100, y: 0 },
								],
							},
							{
								type: 'straight',
								points: [
									{ x: 100, y: 0 },
									{ x: 0, y: 100 },
								],
							},
							{
								type: 'straight',
								points: [
									{ x: 0, y: 100 },
									{ x: 100, y: 100 },
								],
							},
							{
								type: 'straight',
								points: [
									{ x: 100, y: 100 },
									{ x: 0, y: 0 },
								],
							},
						]}
						isClosed
						isComplete
					/>
				),
			},
		])
	),
	Fonts: Object.fromEntries(
		DefaultFontStyle.values.map((font) => [
			`font=${font}`,
			{
				geo: <TL.geo font={font} text="test" w={100} h={100} />,
				arrow: (
					<TL.arrow
						font={font}
						color="blue"
						fill="solid"
						arrowheadStart="square"
						arrowheadEnd="arrow"
						start={{ x: 0, y: 0 }}
						end={{ x: 100, y: 100 }}
						bend={20}
						text="test"
					/>
				),
				note: <TL.note font={font} color="violet" text="test" />,
				text: <TL.text font={font} color="red" text="test" />,
			},
		])
	),
	'Geo shapes': Object.fromEntries(
		GeoShapeGeoStyle.values.map((geoStyle, y) => [
			geoStyle,
			Object.fromEntries(
				DefaultDashStyle.values.map((dashStyle, x) => [
					dashStyle,
					<TL.geo
						key={x}
						w={100}
						h={100}
						fill="solid"
						color={DefaultColorStyle.values[(x + y) % DefaultColorStyle.values.length]}
						geo={geoStyle}
						dash={dashStyle}
					/>,
				])
			),
		])
	),
	Frames: {
		'': {
			empty: <TL.frame w={100} h={100} />,
			labelled: <TL.frame w={100} h={100} name="test" />,
			content: (
				<TL.frame w={100} h={100} name="test">
					{frameContent}
				</TL.frame>
			),
			nested: (
				<TL.frame w={200} h={100} name="tilted" rotation={degreesToRadians(10)}>
					<TL.geo x={-10} y={-10} w={220} h={120} fill="solid" color="light-blue" />
					{frameContent}
					<TL.frame
						x={140}
						y={15}
						w={200}
						h={100}
						name="ttiilltteedd"
						rotation={degreesToRadians(10)}
					>
						<TL.geo x={-10} y={-10} w={220} h={120} fill="solid" color="light-green" />
						{frameContent}
					</TL.frame>
				</TL.frame>
			),
		},
		'label rotation': Object.fromEntries(
			[10, 70, 130, 190, 150, 310].map((rotation, i) => [
				`${rotation}°`,
				<TL.frame key={i} w={100} h={100} name="test" rotation={degreesToRadians(rotation)}>
					{frameContent}
				</TL.frame>,
			])
		),
	},
	Images: {
		Uncropped: {
			'no asset': <TL.image w={100} h={200} />,
			asset: <TL.image w={100} h={200} assetId={manAsset} />,
			flipX: <TL.image w={100} h={200} assetId={manAsset} flipX />,
			flipY: <TL.image w={100} h={200} assetId={manAsset} flipY />,
			flipXY: <TL.image w={100} h={200} assetId={manAsset} flipX flipY />,
			rotated: <TL.image w={100} h={200} assetId={manAsset} rotation={degreesToRadians(45)} />,
			zoom: (
				<TL.image w={100} h={200} assetId={manAsset} zoom={1.5} rotation={degreesToRadians(45)} />
			),
		},
		Cropped: {
			'no asset': <TL.image w={100} h={100} crop={manCrop} />,
			asset: <TL.image w={100} h={100} assetId={manAsset} crop={manCrop} />,
			flipX: <TL.image w={100} h={100} assetId={manAsset} flipX crop={manCrop} />,
			flipY: <TL.image w={100} h={100} assetId={manAsset} flipY crop={manCrop} />,
			flipXY: <TL.image w={100} h={100} assetId={manAsset} flipX flipY crop={manCrop} />,
			withCircle: (
				<TL.image w={100} h={100} assetId={manAsset} flipX flipY crop={manCropAsCircle} />
			),
			rotated: (
				<TL.image
					w={100}
					h={100}
					assetId={manAsset}
					rotation={degreesToRadians(45)}
					crop={manCrop}
				/>
			),
			zoom: (
				<TL.image
					w={100}
					h={100}
					assetId={manAsset}
					rotation={degreesToRadians(45)}
					zoom={1.5}
					crop={manCrop}
				/>
			),
		},
	},
	Bookmarks: {
		'not rotated': {
			full: (
				<TL.bookmark
					url="https://www.tldraw.com"
					assetId={
						<TL.asset.bookmark
							title="title"
							description="description"
							image="/man.png"
							favicon="/heart-icon.svg"
							src="https://www.tldraw.com"
						/>
					}
				/>
			),
			long: (
				<TL.bookmark
					url="https://www.tldraw.com"
					assetId={
						<TL.asset.bookmark
							title="Add a tldraw canvas to your React app in just 5 minutes. You can use the tldraw SDK to craft infinite canvas experiences for the web. It's perfect for collaborative whiteboards but you can use it for lots of other things, too."
							description="At this point, you have a complete working single-user whiteboard. To add support for multiple users collaborating in realtime, you can use the tldraw sync extension library."
							image="/man.png"
							favicon="/heart-icon.svg"
							src="https://www.tldraw.com"
						/>
					}
				/>
			),
			'no image': (
				<TL.bookmark
					url="https://www.tldraw.com"
					assetId={
						<TL.asset.bookmark
							title="title"
							description="description"
							image=""
							favicon="/man.png"
							src="https://www.tldraw.com"
						/>
					}
				/>
			),
			'no favicon': (
				<TL.bookmark
					url="https://www.tldraw.com"
					assetId={
						<TL.asset.bookmark
							title="title"
							description="description"
							image="/man.png"
							favicon=""
							src="https://www.tldraw.com"
						/>
					}
				/>
			),
			'no meta': (
				<TL.bookmark
					url="https://www.tldraw.com"
					assetId={
						<TL.asset.bookmark
							title=""
							description=""
							image="/man.png"
							favicon="/man.png"
							src="https://www.tldraw.com"
						/>
					}
				/>
			),
			empty: (
				<TL.bookmark
					url="https://www.tldraw.com"
					assetId={
						<TL.asset.bookmark
							title=""
							description=""
							image=""
							favicon=""
							src="https://www.tldraw.com"
						/>
					}
				/>
			),
		},
		'rotated (note shadow)': {
			'30°': (
				<TL.bookmark
					rotation={degreesToRadians(30)}
					url="https://www.tldraw.com"
					assetId={
						<TL.asset.bookmark
							title="title"
							description="description"
							image="/tldraw.png"
							favicon="/heart-icon.svg"
							src="https://www.tldraw.com"
						/>
					}
				/>
			),
			'135°': (
				<TL.bookmark
					rotation={degreesToRadians(135)}
					url="https://www.tldraw.com"
					assetId={
						<TL.asset.bookmark
							title="title"
							description="description"
							image="/tldraw.png"
							favicon="/heart-icon.svg"
							src="https://www.tldraw.com"
						/>
					}
				/>
			),
			'255°': (
				<TL.bookmark
					rotation={degreesToRadians(255)}
					url="https://www.tldraw.com"
					assetId={
						<TL.asset.bookmark
							title="title"
							description="description"
							image="/tldraw.png"
							favicon="/heart-icon.svg"
							src="https://www.tldraw.com"
						/>
					}
				/>
			),
		},
	},
	'Foreign objects': {
		'HTML & CSS': {
			simple: (
				<TL.html
					html="Hello, <span>world</span>!"
					css="#self {color: green;} #self span { color: red; }"
				/>
			),
			pseudos: (
				<TL.html
					html="Hello, <span>world</span>!"
					css={`
						#self {
							color: green;
						}
						#self span {
							color: red;
						}
						#self::before {
							content: 'before ';
							color: blue;
						}
						#self::after {
							content: ' after';
							color: purple;
						}
					`}
				/>
			),
			transforms: (
				<TL.html
					html="Hello, <span>world</span>!"
					css={`
						#self {
							color: green;
							transform: rotate(30deg) scale(1.5);
						}
						#self span {
							color: red;
							display: inline-block;
							transform: rotate(-30deg) scale(0.5);
						}
					`}
				/>
			),
			'@font-face': (
				<TL.html
					html="Hello, <span>world</span>!"
					css={`
						@font-face {
							font-family: 'font_#self';
							src: url('/ComicMono.woff');
						}
						#self span {
							color: red;
							font-family: 'font_#self';
							font-size: 20px;
						}
					`}
				/>
			),
			'custom elements': (
				<TL.html
					w={200}
					h={200}
					html={`
						Hello!
						<custom-element>
							<ul slot="list">
								<li class="selected">Apples</li>
								<li>Pears</li>
								<li>Bananas</li>
							</ul>

							<p slot="choice" data-name="Apples">
								A common, sweet, crunchy fruit, usually green or yellow in color.
							</p>
							<p data-name="Pears">
								A fairly common, sweet, usually green fruit, usually softer than Apples.
							</p>
							<p data-name="Bananas">A long, curved, yellow fruit, with a fairly gentle flavor.</p>
						</custom-element>
					`}
					css={`
						#self {
							background-color: lightcoral;
						}
						#self custom-element {
							background-color: plum;
						}
						#self .selected {
							font-size: 20px;
						}
					`}
				/>
			),
		},
		Embeds: {
			Video: <TL.html w={300} h={169} html='<video src="/bonk.webm" width="300" height="169" />' />,
			Image: <TL.html w={100} h={200} html='<img src="/man.png" width="100" />' />,
			Background: (
				<TL.html
					w={200}
					h={200}
					html="Hello, world!"
					css={`
						#self {
							width: 100%;
							height: 100%;
							background: url('/man.png') repeat center center / 15px 30px;
							display: flex;
							justify-content: center;
							align-items: center;
						}
					`}
				/>
			),
		},
	},
	Arrows: {
		'': {
			Arrow1: (
				<TL.arrow
					start={{ x: 200, y: 0 }}
					end={{ x: 200, y: 300 }}
					size="xl"
					arrowheadStart="arrow"
					arrowheadEnd="triangle"
				/>
			),
			Arrow2: (
				<TL.arrow
					start={{ x: 250, y: 0 }}
					end={{ x: 250, y: 300 }}
					size="xl"
					arrowheadStart="square"
					arrowheadEnd="dot"
				/>
			),
			Arrow3: (
				<TL.arrow
					start={{ x: 300, y: 0 }}
					end={{ x: 300, y: 300 }}
					size="xl"
					arrowheadStart="pipe"
					arrowheadEnd="diamond"
					text="with text"
				/>
			),
			Arrow4: (
				<TL.arrow
					start={{ x: 350, y: 0 }}
					end={{ x: 350, y: 300 }}
					size="xl"
					arrowheadStart="inverted"
					arrowheadEnd="bar"
				/>
			),
			Arrow5: (
				<TL.arrow
					start={{ x: 400, y: 0 }}
					end={{ x: 400, y: 300 }}
					size="xl"
					arrowheadStart="none"
					arrowheadEnd="none"
				/>
			),
		},
	},
}

interface SnapshotWithoutJsx {
	[row: string]: { [testCase: string]: { shapes: TLShapePartial[]; assets: TLAsset[] } }
}

test.describe('Export snapshots', () => {
	const snapshotsToTest = Object.entries(snapshots)

	test.beforeEach(setup)

	for (const [name, snapshotWithJsx] of snapshotsToTest) {
		for (const colorScheme of ['light', 'dark'] as const) {
			test(`${name} (${colorScheme})`, async ({ page, api }) => {
				nextNanoId = 0
				const snapshot: SnapshotWithoutJsx = mapObjectMapValues(snapshotWithJsx, (key, row) =>
					mapObjectMapValues(row, (key, testCase) => {
						const { shapes, assets } = shapesFromJsx(testCase)
						return { shapes, assets }
					})
				)

				await page.evaluate(
					({
						colorScheme,
						name,
						snapshot,
					}: {
						colorScheme: 'light' | 'dark'
						name: string
						snapshot: SnapshotWithoutJsx
					}) => {
						editor.user.updateUserPreferences({ colorScheme })
						editor
							.updateInstanceState({ exportBackground: true })
							.selectAll()
							.deleteShapes(editor.getSelectedShapeIds())

						const titleId = tldrawApi.createShapeId()
						editor.createShape<TLTextShape>({
							id: titleId,
							type: 'text',
							x: 0,
							y: 0,
							props: { text: name, font: 'mono', size: 'xl' },
						})

						let y = editor.getShapePageBounds(titleId)!.maxY + 30

						for (const [rowName, testCases] of Object.entries(snapshot)) {
							const rowTitleId = tldrawApi.createShapeId()
							editor.createShape<TLTextShape>({
								id: rowTitleId,
								type: 'text',
								x: 0,
								y,
								props: { text: rowName, font: 'mono', size: 'm' },
							})
							y = editor.getShapePageBounds(rowTitleId)!.maxY + 20

							let x = 0
							let bottom = y
							for (const [testCaseName, { shapes, assets }] of Object.entries(testCases)) {
								const testCaseTitleId = tldrawApi.createShapeId()
								editor.createShape<TLTextShape>({
									id: testCaseTitleId,
									type: 'text',
									x,
									y,
									props: { text: testCaseName, font: 'mono', size: 's' },
								})
								const testCastTitleBounds = editor.getShapePageBounds(testCaseTitleId)!

								editor.createAssets(assets)
								editor.createShapes(shapes)
								const topLevelShapeIds = shapes
									.filter((shape) => !shape.parentId)
									.map((shape) => shape.id)
								editor.setSelectedShapes(topLevelShapeIds)
								let bounds = editor.getSelectionPageBounds()!
								editor.nudgeShapes(topLevelShapeIds, {
									x: x - bounds.minX,
									y: testCastTitleBounds.maxY + 25 - bounds.minY,
								})

								bounds = editor.getSelectionPageBounds()!
								x = Math.max(testCastTitleBounds.maxX, bounds.maxX) + 60
								bottom = Math.max(bottom, bounds.maxY)
							}

							y = bottom + 40
						}

						editor.selectAll()
					},
					{ colorScheme, name, snapshot } as any
				)

				await snapshotTest(page, api)
			})
		}
	}

	async function snapshotTest(page: Page, api: ApiFixture) {
		const downloadAndSnapshot = page.waitForEvent('download').then(async (download) => {
			const path = (await download.path()) as string
			assert(path)
			await rename(path, path + '.svg')
			await writeFile(
				path + '.html',
				`
								<!DOCTYPE html>
								<meta charset="utf-8" />
								<meta name="viewport" content="width=device-width, initial-scale=1" />
								<img src="${path}.svg" />
				`,
				'utf-8'
			)

			await page.goto(`file://${path}.html`)
			const clip = await page.$eval('img', (img) => img.getBoundingClientRect())
			await expect(page).toHaveScreenshot({
				omitBackground: true,
				clip,
				fullPage: true,
			})
		})
		await api.exportAsSvg()
		await downloadAndSnapshot
	}
})
