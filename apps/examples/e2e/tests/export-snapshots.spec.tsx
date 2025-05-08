/* eslint-disable local/no-at-internal, local/no-internal-imports, react/no-string-refs */
import { Page, expect } from '@playwright/test'
import assert from 'assert'
import { rename, writeFile } from 'fs/promises'
import { ReactElement } from 'react'
import {
	DefaultColorStyle,
	DefaultDashStyle,
	DefaultFillStyle,
	DefaultFontStyle,
	Editor,
	GeoShapeGeoStyle,
	TLAsset,
	TLBindingCreate,
	TLShapePartial,
	TLTextShape,
	degreesToRadians,
	mapObjectMapValues,
	mockUniqueId,
	toRichText,
} from 'tldraw'
import { TL, shapesFromJsx } from 'tldraw/src/test/test-jsx'
import { EndToEndApi } from '../../src/misc/EndToEndApi'
import { setup } from '../shared-e2e'
import {
	convexDrawShape,
	frameContent,
	heyDrawShape,
	manAsset,
	manCrop,
	richText,
} from './export-snapshots-data'
import test, { ApiFixture } from './fixtures/fixtures'

declare const editor: Editor
declare const tldrawApi: EndToEndApi

let nextNanoId = 0
mockUniqueId(() => `mock-${nextNanoId++}`)

interface Snapshots {
	[name: string]: { [row: string]: { [testCase: string]: ReactElement } }
}

const snapshots: Snapshots = {
	'Text rendering': {
		'geo text': {
			'leading line breaks': <TL.geo richText={toRichText('\n\n\n\n\n\ntext')} w={100} h={30} />,
			'trailing line breaks': <TL.geo richText={toRichText('text\n\n\n\n\n\n')} w={100} h={30} />,
			'mixed RTL': (
				<TL.geo richText={toRichText('unicode is cool!\nكتابة باللغة  العرب!')} w={300} h={300} />
			),
			'rich text': <TL.geo richText={richText} align="start" w={300} h={300} />,
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
				geo: <TL.geo font={font} richText={toRichText('test')} w={100} h={100} />,
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
				note: <TL.note font={font} color="violet" richText={toRichText('test')} />,
				text: <TL.text font={font} color="red" richText={toRichText('test')} />,
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
		},
		Cropped: {
			'no asset': <TL.image w={100} h={100} crop={manCrop} />,
			asset: <TL.image w={100} h={100} assetId={manAsset} crop={manCrop} />,
			flipX: <TL.image w={100} h={100} assetId={manAsset} flipX crop={manCrop} />,
			flipY: <TL.image w={100} h={100} assetId={manAsset} flipY crop={manCrop} />,
			flipXY: <TL.image w={100} h={100} assetId={manAsset} flipX flipY crop={manCrop} />,
			rotated: (
				<TL.image
					w={100}
					h={100}
					assetId={manAsset}
					rotation={degreesToRadians(45)}
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
	Regressions: {
		'#5020': {
			'scaled text within a frame': (
				<TL.frame w={300} h={200}>
					<TL.text richText={toRichText('the text')} x={-30} y={0} />
					<TL.text richText={toRichText('the text')} x={-60} y={50} scale={2} />
					<TL.text richText={toRichText('the text')} x={-90} y={100} scale={3} />
				</TL.frame>
			),
		},
	},
	'Weird elbow arrows': {
		'Small segments, contained': {
			A: (
				<>
					<TL.geo w={150} h={150} ref="a" />
					<TL.geo w={30} h={30} x={15} y={15} ref="b" />
					<TL.arrow kind="elbow">
						<TL.binding.arrow to="a" terminal="start" />
						<TL.binding.arrow
							to="b"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 1, y: 0.5 }}
							snap="edge-point"
						/>
					</TL.arrow>
				</>
			),
			B: (
				<>
					<TL.geo w={150} h={150} ref="a" />
					<TL.geo w={30} h={30} x={25} y={15} ref="b" />
					<TL.arrow kind="elbow">
						<TL.binding.arrow to="a" terminal="start" />
						<TL.binding.arrow
							to="b"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 1, y: 0.5 }}
							snap="edge-point"
						/>
					</TL.arrow>
				</>
			),
			'Exact match': (
				<>
					<TL.geo w={150} h={150} ref="a" />
					<TL.geo w={30} h={30} x={45} y={15} ref="b" />
					<TL.arrow kind="elbow">
						<TL.binding.arrow to="a" terminal="start" />
						<TL.binding.arrow
							to="b"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 1, y: 0.5 }}
							snap="edge-point"
						/>
					</TL.arrow>
				</>
			),
			C: (
				<>
					<TL.geo w={150} h={150} ref="a" />
					<TL.geo w={30} h={30} x={50} y={15} ref="b" />
					<TL.arrow kind="elbow">
						<TL.binding.arrow to="a" terminal="start" />
						<TL.binding.arrow
							to="b"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 1, y: 0.5 }}
							snap="edge-point"
						/>
					</TL.arrow>
				</>
			),
			D: (
				<>
					<TL.geo w={150} h={150} ref="a" />
					<TL.geo w={30} h={30} x={70} y={15} ref="b" />
					<TL.arrow kind="elbow">
						<TL.binding.arrow to="a" terminal="start" />
						<TL.binding.arrow
							to="b"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 1, y: 0.5 }}
							snap="edge-point"
						/>
					</TL.arrow>
				</>
			),
		},
		'Draw shapes': {
			'Hey, near': (
				<>
					{heyDrawShape}
					<TL.arrow kind="elbow" x={-50} y={20}>
						<TL.binding.arrow
							to="hey"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 0.09381928931000422, y: 0.21685530426808908 }}
							snap="edge"
						/>
					</TL.arrow>
				</>
			),
			'Hey, far': (
				<>
					{heyDrawShape}
					<TL.arrow kind="elbow" x={-50} y={20}>
						<TL.binding.arrow
							to="hey"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 0.9994593548811798, y: 0.3061474422212521 }}
							snap="edge"
						/>
					</TL.arrow>
				</>
			),
			'Hey, within': (
				<>
					{heyDrawShape}
					<TL.arrow kind="elbow" x={-50} y={20}>
						<TL.binding.arrow
							to="hey"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 0.38733552172499264, y: 0.5318288846695827 }}
							snap="edge"
						/>
					</TL.arrow>
				</>
			),
			'Convex, far': (
				<>
					{convexDrawShape}
					<TL.arrow kind="elbow" x={-50} y={20}>
						<TL.binding.arrow
							to="convex"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 0.9919587061623889, y: 0.4908357026818453 }}
							snap="edge"
						/>
					</TL.arrow>
				</>
			),
			'Convex, edge': (
				<>
					{convexDrawShape}
					<TL.arrow kind="elbow" x={-50} y={20}>
						<TL.binding.arrow
							to="convex"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 0.319774673658207, y: 0.9983952589963239 }}
							snap="edge"
						/>
					</TL.arrow>
				</>
			),
		},
		'Self-bound': {
			'Draw shape,\nsame-edge': (
				<>
					{convexDrawShape}
					<TL.arrow kind="elbow">
						<TL.binding.arrow
							to="convex"
							terminal="start"
							isPrecise={true}
							normalizedAnchor={{ x: 0.7187653636319187, y: 0.07579613336130757 }}
							snap="edge"
						/>
						<TL.binding.arrow
							to="convex"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 0.04948958738107296, y: 0 }}
							snap="edge"
						/>
					</TL.arrow>
				</>
			),
			'Box,\nsame edge': (
				<>
					<TL.geo w={100} h={100} ref="a" />
					<TL.arrow kind="elbow">
						<TL.binding.arrow
							to="a"
							terminal="start"
							isPrecise={true}
							normalizedAnchor={{ x: 0.2, y: 1 }}
							snap="edge"
						/>
						<TL.binding.arrow
							to="a"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 0.8, y: 1 }}
							snap="edge"
						/>
					</TL.arrow>
				</>
			),
			'Triangle,\nopposites': (
				<>
					<TL.geo w={100} h={100} geo="triangle" ref="a" />
					<TL.arrow kind="elbow">
						<TL.binding.arrow
							to="a"
							terminal="start"
							isPrecise={true}
							normalizedAnchor={{ x: 0.75, y: 0.5 }}
							snap="edge"
						/>
						<TL.binding.arrow
							to="a"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 0.25, y: 0.5 }}
							snap="edge"
						/>
					</TL.arrow>
				</>
			),
			Outside: (
				<>
					<TL.geo w={100} h={100} geo="triangle" ref="a" />
					<TL.arrow kind="elbow">
						<TL.binding.arrow
							to="a"
							terminal="start"
							isPrecise={true}
							normalizedAnchor={{ x: 1, y: 0.5 }}
							snap="edge"
						/>
						<TL.binding.arrow
							to="a"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 0, y: 0.5 }}
							snap="edge"
						/>
					</TL.arrow>
				</>
			),
		},
		'Regressions 1': {
			'ENG-3332 ✅': (
				<>
					<TL.geo w={100} h={100} ref="a" />
					<TL.geo w={30} h={30} x={60} y={10} ref="b" />
					<TL.arrow kind="elbow">
						<TL.binding.arrow
							to="a"
							terminal="start"
							isPrecise={true}
							normalizedAnchor={{ x: 0.5, y: 0 }}
							snap="edge"
						/>
						<TL.binding.arrow
							to="b"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 0, y: 0.5 }}
							snap="edge"
						/>
					</TL.arrow>
				</>
			),
			'ENG-3333 🚫': (
				<>
					<TL.geo w={50} h={50} ref="box" />
					<TL.text richText={toRichText('text')} x={70} y={30} ref="text" />
					<TL.arrow kind="elbow">
						<TL.binding.arrow
							to="box"
							terminal="start"
							isPrecise={true}
							normalizedAnchor={{ x: 1, y: 0.5 }}
							snap="edge"
						/>
						<TL.binding.arrow
							to="text"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 1, y: 0.5 }}
							snap="edge"
						/>
					</TL.arrow>
				</>
			),
			'ENG-3335 🚫': (
				<>
					<TL.geo w={100} h={100} ref="a" />
					<TL.geo w={30} h={30} x={-30} y={70} ref="b" />
					<TL.arrow kind="elbow" arrowheadStart="arrow" arrowheadEnd="arrow">
						<TL.binding.arrow
							to="a"
							terminal="start"
							isPrecise={true}
							normalizedAnchor={{ x: 0, y: 0.5 }}
							snap="edge"
						/>
						<TL.binding.arrow
							to="b"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 0, y: 0.5 }}
							snap="edge"
						/>
					</TL.arrow>
				</>
			),
			'ENG-3336 ✅': (
				// this one isn't actually an elbow arrow issue but was introduced by elbow arrows
				// work so is still included here.
				<>
					<TL.text richText={toRichText('one')} ref="a" />
					<TL.text richText={toRichText('two')} y={50} ref="b" />
					<TL.arrow kind="arc" arrowheadStart="arrow" arrowheadEnd="arrow" bend={10}>
						<TL.binding.arrow to="a" terminal="start" />
						<TL.binding.arrow to="b" terminal="end" />
					</TL.arrow>
				</>
			),
			'ENG-3342 ✅': (
				<>
					<TL.geo w={50} h={50} ref="a" />
					<TL.geo w={50} h={50} x={40} y={-10} ref="b" />
					<TL.arrow kind="elbow">
						<TL.binding.arrow
							to="a"
							terminal="start"
							isPrecise={true}
							normalizedAnchor={{ x: 1, y: 0.5 }}
							snap="edge"
						/>
						<TL.binding.arrow
							to="b"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 0.5, y: 0 }}
							snap="edge"
						/>
					</TL.arrow>
				</>
			),
		},
		'Regressions 2': {
			'ENG-3366 ✅': (
				<>
					<TL.geo w={30} h={30} ref="a" />
					<TL.geo w={30} h={30} x={80} y={10} ref="b" />
					<TL.arrow kind="elbow">
						<TL.binding.arrow to="a" terminal="start" />
						<TL.binding.arrow
							to="b"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 0, y: 0.5 }}
							snap="edge"
						/>
					</TL.arrow>
				</>
			),
			'ENG-3371 ✅': (
				<>
					<TL.text ref="text" richText={toRichText('hi')} />
					<TL.arrow kind="elbow" end={{ x: 70, y: 30 }}>
						<TL.binding.arrow to="text" terminal="start" />
					</TL.arrow>
				</>
			),
			'ENG-3375 ✅': (
				<>
					{heyDrawShape}
					<TL.arrow kind="elbow">
						<TL.binding.arrow
							to="hey"
							terminal="start"
							isPrecise={true}
							normalizedAnchor={{ x: 0.09381928931000422, y: 0.21685530426808908 }}
							snap="edge"
						/>
						<TL.binding.arrow
							to="hey"
							terminal="end"
							isPrecise={true}
							normalizedAnchor={{ x: 0.38733552172499264, y: 0.5318288846695827 }}
							snap="edge"
						/>
					</TL.arrow>
				</>
			),
		},
	},
}

interface SnapshotWithoutJsx {
	[row: string]: {
		[testCase: string]: { shapes: TLShapePartial[]; assets: TLAsset[]; bindings: TLBindingCreate[] }
	}
}

test.describe('Export snapshots', () => {
	const snapshotsToTest = Object.entries(snapshots)

	test.beforeEach(setup)

	for (const [name, snapshotWithJsx] of snapshotsToTest) {
		for (const colorScheme of ['light', 'dark'] as const) {
			test(`${name} (${colorScheme})`, async ({ page, api }) => {
				nextNanoId = 0
				const snapshot: SnapshotWithoutJsx = mapObjectMapValues(snapshotWithJsx, (i, row) =>
					mapObjectMapValues(row, (j, testCase) => {
						const { shapes, assets, bindings } = shapesFromJsx(testCase, `${i}-${j}`)
						return { shapes, assets, bindings }
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
							props: { richText: tldrawApi.toRichText(name), font: 'mono', size: 'xl' },
						})

						let y = editor.getShapePageBounds(titleId)!.maxY + 30

						for (const [rowName, testCases] of Object.entries(snapshot)) {
							const rowTitleId = tldrawApi.createShapeId()
							editor.createShape<TLTextShape>({
								id: rowTitleId,
								type: 'text',
								x: 0,
								y,
								props: { richText: tldrawApi.toRichText(rowName), font: 'mono', size: 'm' },
							})
							y = editor.getShapePageBounds(rowTitleId)!.maxY + 20

							let x = 0
							let bottom = y
							for (const [testCaseName, { shapes, assets, bindings }] of Object.entries(
								testCases
							)) {
								const testCaseTitleId = tldrawApi.createShapeId()
								editor.createShape<TLTextShape>({
									id: testCaseTitleId,
									type: 'text',
									x,
									y,
									props: {
										richText: tldrawApi.toRichText(testCaseName),
										font: 'mono',
										size: 's',
									},
								})
								const testCastTitleBounds = editor.getShapePageBounds(testCaseTitleId)!

								editor.createAssets(assets)
								editor.createShapes(shapes)
								editor.createBindings(bindings)
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

						tldrawApi.markAllArrowBindings()
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
