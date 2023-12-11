import {
	AssetRecordType,
	DefaultErrorFallback,
	ErrorBoundary,
	SneakyExampleContentProvider,
	TLBookmarkAsset,
	TLGeoShape,
	TLShape,
	TLShapePartial,
	TLTextShape,
	createShapeId,
	getHashForString,
	useEditor,
} from '@tldraw/tldraw'
import { useEffect } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import githubHeroImage from '../../../assets/github-hero-light.png'
import BasicExample from './BasicExample'
import ExamplesTldrawLogo from './components/ExamplesTldrawLogo'
import { ListLink } from './components/ListLink'
import APIExample from './examples/APIExample'
import AssetPropsExample from './examples/AssetOptionsExample'
import CanvasEventsExample from './examples/CanvasEventsExample'
import CustomComponentsExample from './examples/CustomComponentsExample'
import CustomConfigExample from './examples/CustomConfigExample/CustomConfigExample'
import CustomStylesExample from './examples/CustomStylesExample/CustomStylesExample'
import CustomUiExample from './examples/CustomUiExample/CustomUiExample'
import ErrorBoundaryExample from './examples/ErrorBoundaryExample/ErrorBoundaryExample'
import ExplodedExample from './examples/ExplodedExample'
import ExternalContentSourcesExample from './examples/ExternalContentSourcesExample'
import FloatyExample from './examples/FloatyExample'
import ForceMobileExample from './examples/ForceBreakpointExample'
import HideUiExample from './examples/HideUiExample'
import MetaExample from './examples/MetaExample'
import MultipleExample from './examples/MultipleExample'
import OnTheCanvasExample from './examples/OnTheCanvas'
import PersistenceExample from './examples/PersistenceExample'
import ReadOnlyExample from './examples/ReadOnlyExample'
import ScreenshotToolExample from './examples/ScreenshotToolExample/ScreenshotToolExample'
import ScrollExample from './examples/ScrollExample'
import ShapeMetaExample from './examples/ShapeMetaExample'
import SnapshotExample from './examples/SnapshotExample/SnapshotExample'
import StoreEventsExample from './examples/StoreEventsExample'
import UiEventsExample from './examples/UiEventsExample'
import UserPresenceExample from './examples/UserPresenceExample'
import ZonesExample from './examples/ZonesExample'
import EndToEnd from './examples/end-to-end/end-to-end'
import OnlyEditorExample from './examples/only-editor/OnlyEditor'

type Example = {
	title: string
	code: string
	element: JSX.Element
	disableInjectedShapes?: boolean
	description: string[]
}

const examples: Record<string, Example> = {
	develop: {
		title: 'Basic (development)',
		code: 'BasicExample.tsx',
		element: <BasicExample />,
		description: [
			'The easiest way to get started with tldraw.',
			'The simplest use of the <Tldraw /> component.',
		],
	},
	// yjs: {
	// 	title: 'Collaboration (with Yjs)',
	// 	element: <YjsExample />,
	// },
	api: {
		title: 'Editor API',
		code: 'examples/APIExample.tsx',
		element: <APIExample />,
		description: [
			'Manipulate the contents of the canvas using the editor API.',
			'This example creates and updates shapes, selects and rotates them, and zooms the camera.',
		],
	},
	multiple: {
		title: 'Multiple editors',
		code: 'examples/MultipleExample.tsx',
		element: <MultipleExample />,
		disableInjectedShapes: true,
		description: ['Use multiple <Tldraw /> components on the same page.'],
	},
	meta: {
		title: 'Meta Example',
		code: 'examples/MetaExample.tsx',
		element: <MetaExample />,
		description: [
			'Add custom metadata to shapes and assets.',
			'In this example, we add createdBy and createdAt metadata to shapes.',
		],
	},
	readonly: {
		title: 'Readonly Example',
		code: 'examples/ReadOnlyExample.tsx',
		element: <ReadOnlyExample />,
		description: [
			'Use the editor in readonly mode.',
			"Users can still pan and zoom the canvas, but they can't change the contents.",
		],
	},
	'things-on-the-canvas': {
		title: 'Things on the canvas',
		code: 'examples/OnTheCanvas.tsx',
		element: <OnTheCanvasExample />,
		description: [
			'Add custom components to the editor.',
			'Components can either float on top of the canvas unaffected by the camera, or be a part of the canvas itself.',
		],
	},
	scroll: {
		title: 'Scroll example',
		code: 'examples/ScrollExample.tsx',
		element: <ScrollExample />,
		description: [
			'Use the editor inside a scrollable container.',
			"Tldraw doesn't have to be full screen.",
		],
	},
	'custom-config': {
		title: 'Custom shapes / tools',
		code: 'examples/CustomConfigExample/CustomConfigExample.tsx',
		element: <CustomConfigExample />,
		description: [
			'Create custom shapes and tools.',
			'The card shape (select ⚫️ in the toolbar) is a custom shape - but also just a normal react component.',
		],
	},
	exploded: {
		title: 'Sublibraries',
		code: 'examples/ExplodedExample.tsx',
		element: <ExplodedExample />,
		description: [
			'Tldraw is built from several sublibraries - like the editor, default shapes & tools, and UI.',
			'For full customization, you can use these sublibraries directly, or replace them with your own.',
		],
	},
	'error-boundary': {
		title: 'Error boundary',
		code: 'examples/ErrorBoundaryExample/ErrorBoundaryExample.tsx',
		element: <ErrorBoundaryExample />,
		description: [
			'Catch errors in shapes.',
			"When something goes wrong in a shape, it won't crash the whole editor - just the shape that went wrong.",
		],
	},
	'custom-ui': {
		title: 'Custom UI',
		code: 'examples/CustomUiExample/CustomUiExample.tsx',
		element: <CustomUiExample />,
		description: [
			"Replace tldraw's UI with your own.",
			'This UI has keyboard shortcuts and buttons for selecting tools.',
		],
	},
	'screenshot-tool': {
		title: 'Custom Tool (Screenshot)',
		code: 'examples/ScreenshotToolExample/ScreenshotToolExample.tsx',
		element: <ScreenshotToolExample />,
		description: [
			"Tools are the parts of tldraw's state chart. Most interactions in tldraw are tools.",
			'This tool lets the user draw a box on the canvas and then exports a screenshot of that area.',
		],
	},
	'hide-ui': {
		title: 'Hide UI',
		code: 'examples/HideUiExample.tsx',
		element: <HideUiExample />,
		description: [
			'Hide tldraw\'s UI with the "hideUi" prop.',
			'Useful for a bare-bones editor, or if you want to build your own UI.',
		],
	},
	'custom-components': {
		title: 'UI components',
		code: 'examples/CustomComponentsExample.tsx',
		element: <CustomComponentsExample />,
		description: [
			'Tldraw uses React components to render its canvas.',
			'You can replace these components with your own.',
			'Try dragging to select or using the eraser tool to see the custom components in this example.',
		],
	},
	'ui-events': {
		title: 'UI events',
		code: 'examples/UiEventsExample.tsx',
		element: <UiEventsExample />,
		description: [
			"Listen to events from tldraw's UI.",
			'Try selecting tools, using keyboard shortcuts, undo/redo, etc. Events will be logged next to the canvas.',
		],
	},
	'canvas-events': {
		title: 'Canvas events',
		code: 'examples/CanvasEventsExample.tsx',
		element: <CanvasEventsExample />,
		description: [
			"Listen to events from tldraw's canvas.",
			'These are the input events that the editor interprets. Try moving your cursor, dragging, using modifier keys, etc.',
		],
	},
	'store-events': {
		title: 'Store events',
		code: 'examples/StoreEventsExample.tsx',
		element: <StoreEventsExample />,
		description: [
			"Listen to changes from tldraw's store.",
			'Try creating & deleting shapes, or switching pages. The changes will be logged next to the canvas.',
		],
	},
	'user-presence': {
		title: 'User presence',
		code: 'examples/UserPresenceExample.tsx',
		element: <UserPresenceExample />,
		description: [
			'Show other users editing the same document.',
			'Here, we add fake InstancePresence records to the store to simulate other users.',
			'If you have your own presence system, you could add real records to the store in the same way.',
		],
	},
	zones: {
		title: 'UI zones',
		code: 'examples/ZonesExample.tsx',
		element: <ZonesExample />,
		description: [
			"Inject custom components into tldraw's UI.",
			'Our default UI has two empty "zones" - the topZone (in the top-center of the screen) and shareZone (in the top right).',
			'You can set these zones to any React component you want.',
		],
	},
	persistence: {
		title: 'Persistence',
		code: 'examples/PersistenceExample.tsx',
		element: <PersistenceExample />,
		description: [
			'Save the contents of the editor.',
			"In this example, we load the contents of the editor from your browser's localStorage, and save it there ",
		],
	},
	snapshots: {
		title: 'Snapshots',
		code: 'examples/SnapshotExample/SnapshotExample.tsx',
		element: <SnapshotExample />,
		description: [
			"Load a snapshot of the editor's contents.",
			"Use editor.store.getSnapshot() and editor.store.loadSnapshot() to save and restore the editor's contents.",
		],
	},
	'force-mobile': {
		title: 'Force mobile breakpoint',
		code: 'examples/ForceBreakpointExample.tsx',
		element: <ForceMobileExample />,
		description: [
			'Force the editor UI to render as if it were on a mobile device using the `forceMobile` prop.',
		],
	},
	'custom-styles': {
		title: 'Custom styles',
		code: 'examples/CustomStylesExample/CustomStylesExample.tsx',
		element: <CustomStylesExample />,
		description: [
			'Styles are special properties that can be set on many shapes at once.',
			'Create several shapes with the ⚫️ tool, then select them and try changing their filter style.',
		],
	},
	'shape-meta': {
		title: 'Shape meta property',
		code: 'examples/ShapeMetaExample.tsx',
		element: <ShapeMetaExample />,
		description: [
			'Add a label to shapes with the meta property.',
			"Select a shape and try changing its label. The label is stored in the shape's meta property, which can be used to add custom data to any shape.",
		],
	},
	'only-editor': {
		title: 'Only editor',
		code: 'examples/only-editor/OnlyEditor.tsx',
		element: <OnlyEditorExample />,
		description: [
			'You can use the <TldrawEditor /> component to render a bare-bones editor with minimal built-in shapes and tools.',
		],
	},
	'asset-props': {
		title: 'Asset props',
		code: 'examples/AssetOptionsExample.tsx',
		element: <AssetPropsExample />,
		description: [
			'Control the assets (images, videos, etc.) that can be added to the canvas.',
			"In this example, only .jpg images are allowed - videos and .pngs won't work. Assets must be less than 1mb.",
		],
	},
	'floaty-window': {
		title: 'Floaty window',
		code: 'examples/FloatyExample.tsx',
		element: <FloatyExample />,
		description: [],
	},
	'external-content-sources': {
		title: 'External content sources',
		code: 'examples/ExternalContentSourcesExample.tsx',
		element: <ExternalContentSourcesExample />,
		description: [
			'Control what happens when the user pastes content into the editor.',
			"In this example, we register a special handler for when the user pastes in 'text/html' content.",
			'We add it to a special shape type that renders the html content directly.',
		],
	},
}

const routes = [
	{
		path: '/',
		element: <HomePage />,
	},
	{
		path: 'end-to-end',
		element: <EndToEnd />,
	},
	...Object.keys(examples).map((key) => ({
		path: key,
		element: <ExamplePage id={key} />,
	})),
]

function HomePage() {
	return (
		<div className="examples">
			<div className="examples__header">
				<ExamplesTldrawLogo />
				<p>
					See docs at <a href="https://tldraw.dev">tldraw.dev</a>
				</p>
			</div>
			<ul className="examples__list">
				{Object.entries(examples).map(([path, example]) => (
					<ListLink key={path} title={example.title} route={path} />
				))}
			</ul>
		</div>
	)
}

function ExamplePage({ id }: { id: string }) {
	const example = examples[id]

	return (
		<SneakyExampleContentProvider value={<InjectExampleMetadata example={example} />}>
			{example.element}
		</SneakyExampleContentProvider>
	)
}

function InjectExampleMetadata({ example }: { example: Example }) {
	const editor = useEditor()

	useEffect(() => {
		if (example.disableInjectedShapes) return

		const injectShape = <T extends TLShape>(id: string, shape: Omit<TLShapePartial<T>, 'id'>) => {
			const shapeToInject = {
				id: createShapeId(),
				parentId: editor.getCurrentPageId(),
				opacity: 1,
				...shape,
				meta: { exampleMetaId: id },
			}

			editor.createShape(shapeToInject)

			return editor.getShape<T>(shapeToInject.id)!
		}

		const hasTextShape = !!editor.shapeUtils.text
		const hsaBookmarkShape = !!editor.shapeUtils.bookmark
		if (!hasTextShape || !hsaBookmarkShape) return

		editor.batch(() => {
			const isReadonly = editor.getInstanceState().isReadonly
			if (isReadonly) {
				editor.updateInstanceState({ isReadonly: false })
			}
			const initialSelection = editor.getSelectedShapeIds()

			try {
				const allShapes = editor.store.query.records('shape').get()
				const existingMetaShapes = allShapes.filter((s) => s.meta.exampleMetaId)
				editor.deleteShapes(existingMetaShapes.map((s) => s.id))

				const shadow = injectShape<TLGeoShape>('background', {
					type: 'geo',
					x: -355,
					y: -15,
					props: {
						...editor.getShapeUtil<TLGeoShape>('geo').getDefaultProps(),
						w: 740,
						h: 385,
						fill: 'solid',
						color: 'grey',
					},
				})

				const background = injectShape<TLGeoShape>('background', {
					type: 'geo',
					x: -370,
					y: -30,
					props: {
						...editor.getShapeUtil<TLGeoShape>('geo').getDefaultProps(),
						w: 740,
						h: 385,
						fill: 'semi',
					},
				})

				const title = injectShape('title', {
					type: 'text',
					x: 0,
					y: 0,
					props: {
						...editor.getShapeUtil<TLTextShape>('text').getDefaultProps(),
						size: 'm',
						text: example.title,
						align: 'start',
					},
				})

				const description = injectShape('description', {
					type: 'text',
					x: 0,
					y: 50,
					props: {
						...editor.getShapeUtil<TLTextShape>('text').getDefaultProps(),
						size: 's',
						text: example.description?.join('\n\n') ?? '',
						align: 'start',
						autoSize: false,
						w: 340,
					},
				})

				const codeUrl = `https://github.com/tldraw/tldraw/blob/main/apps/examples/src/${example.code}`
				const assetId = AssetRecordType.createId(getHashForString(codeUrl))
				const imageUrl = githubHeroImage
				const existingAsset = editor.getAsset(assetId) as TLBookmarkAsset | undefined

				const bookmarkProps: TLBookmarkAsset['props'] = {
					src: codeUrl,
					image: imageUrl,
					title: example.code,
					description: 'Check out the code for this example on GitHub!',
				}

				if (existingAsset) {
					editor.updateAssets([
						{
							...existingAsset,
							props: bookmarkProps,
						},
					])
				} else {
					editor.createAssets([
						{
							typeName: 'asset',
							type: 'bookmark',
							id: assetId,
							props: bookmarkProps,
							meta: {},
						},
					])
				}

				const bookmark = injectShape('bookmark', {
					type: 'bookmark',
					x: -340,
					y: 0,
					props: {
						...editor.getShapeUtil('bookmark').getDefaultProps(),
						assetId,
						url: codeUrl,
					},
				})

				editor.select(shadow, background, title, description, bookmark)

				const center = editor.getViewportPageBounds().center
				const selectionBounds = editor.getSelectionPageBounds()!
				editor.updateShapes(
					editor.getSelectedShapes().map((s) => ({
						id: s.id,
						type: s.type,
						x: s.x + center.x - selectionBounds.center.x,
						y: s.y + center.y - selectionBounds.center.y,
					}))
				)
				editor.groupShapes(editor.getSelectedShapeIds())
				editor.sendToBack(editor.getSelectedShapeIds())
			} finally {
				if (isReadonly) {
					editor.updateInstanceState({ isReadonly: true })
				}
				editor.select(...initialSelection)
			}
		})
	}, [editor, example])

	return null
}

const router = createBrowserRouter(routes)

export function ExamplesApp() {
	return (
		<ErrorBoundary
			fallback={(error) => <DefaultErrorFallback error={error} />}
			onError={(error) => console.error(error)}
		>
			<RouterProvider router={router} />
		</ErrorBoundary>
	)
}
