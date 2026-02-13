/**
 * Migration script: Replace flat text body on the "Out-of-the-box whiteboard"
 * feature page with structured custom block types (iconGrid, imageCardRow,
 * benefitCards).
 *
 * Usage:
 *   1. Set SANITY_API_TOKEN, NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET
 *   2. Run: npx tsx scripts/migrate-whiteboard-blocks.ts
 */

import { createClient } from '@sanity/client'

const client = createClient({
	projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
	dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
	apiVersion: '2025-01-01',
	token: process.env.SANITY_API_TOKEN!,
	useCdn: false,
})

const DOC_ID = 'featurePage-out-of-the-box-whiteboard'

// --- Portable Text helpers ---

function span(text: string) {
	return { _type: 'span' as const, _key: 'span0', text, marks: [] as never[] }
}

function block(text: string, style: 'normal' | 'h2' | 'h3', key: string) {
	return {
		_type: 'block' as const,
		_key: key,
		style,
		markDefs: [] as never[],
		children: [span(text)],
	}
}

// --- Structured body blocks ---

const body = [
	// Section 1: "All the essentials built in" — iconGrid (4 columns, 8 tool cards)
	{
		_type: 'iconGrid',
		_key: 'wb-essentials',
		heading: 'All the essentials built in',
		columns: 4,
		items: [
			{
				_key: 'tool-select',
				icon: 'mouse-pointer',
				title: 'Select tool',
				description: 'Multi-select, resizing and rotation.',
			},
			{
				_key: 'tool-hand',
				icon: 'hand',
				title: 'Hand tool',
				description: 'Smooth pan and zoom navigation.',
			},
			{
				_key: 'tool-draw',
				icon: 'pencil',
				title: 'Draw tool',
				description: 'Pressure-sensitive freehand drawing.',
			},
			{
				_key: 'tool-eraser',
				icon: 'eraser',
				title: 'Eraser tool',
				description: 'Precise shape deletion.',
			},
			{
				_key: 'tool-arrow',
				icon: 'arrow-right',
				title: 'Arrow tool',
				description: 'Smart connectors; sticking to shapes.',
			},
			{
				_key: 'tool-text',
				icon: 'type',
				title: 'Text tool',
				description: 'Rich formatting and inline editing.',
			},
			{
				_key: 'tool-note',
				icon: 'sticky-note',
				title: 'Note tool',
				description: 'Commenting with sticky notes.',
			},
			{
				_key: 'tool-geo',
				icon: 'shapes',
				title: 'Geometry tool',
				description: 'Quick creation of geometric shapes.',
			},
		],
	},

	// Section 2: Feature highlight cards — imageCardRow (3 cards)
	{
		_type: 'imageCardRow',
		_key: 'wb-highlights',
		cards: [
			{
				_key: 'card-rich-text',
				icon: 'file-text',
				title: 'Rich text editing',
				description:
					'Full text editing with formatting, perfect for labelling diagrams or capturing meeting notes.',
			},
			{
				_key: 'card-freehand',
				icon: 'pen-line',
				title: 'Freehand drawing',
				description:
					'Fluid, natural drawing that responds to pressure and feels like pen on paper across all devices.',
			},
			{
				_key: 'card-collab',
				icon: 'users',
				title: 'Collaboration-ready',
				description: 'Live cursors, user presence and conflict-free syncing bring teams together.',
			},
		],
	},

	// Section 3: "Navigation and camera controls" — iconGrid (3 columns, 6 items)
	{
		_type: 'iconGrid',
		_key: 'wb-navigation',
		heading: 'Navigation and camera controls',
		columns: 3,
		items: [
			{
				_key: 'nav-zoom',
				icon: 'zoom-in',
				title: 'Zoom controls',
				description: 'Precise zoom in/out with fit-to-screen options.',
			},
			{
				_key: 'nav-camera',
				icon: 'compass',
				title: 'Smart camera',
				description: 'Auto-focus on selections and smooth following.',
			},
			{
				_key: 'nav-alignment',
				icon: 'ruler',
				title: 'Alignment guides',
				description: 'Smart snapping and alignment helpers.',
			},
			{
				_key: 'nav-minimap',
				icon: 'map',
				title: 'Mini map',
				description: 'Overview navigation for large canvases.',
			},
			{
				_key: 'nav-focus',
				icon: 'focus',
				title: 'Focus mode',
				description: 'Hide the UI to bring focus to canvas contents.',
			},
			{
				_key: 'nav-grid',
				icon: 'grid-3x3',
				title: 'Grid and rulers',
				description: 'Optional overlays for precise positioning.',
			},
		],
	},

	// Section 4: "Complete shape library" — iconGrid (3 columns, 6 items)
	{
		_type: 'iconGrid',
		_key: 'wb-shapes',
		heading: 'Complete shape library',
		columns: 3,
		items: [
			{
				_key: 'shape-geo',
				icon: 'diamond-plus',
				title: 'Geometric shapes',
				description: 'Rectangles, circles, triangles, and a full suite of shapes for diagramming.',
			},
			{
				_key: 'shape-sticky',
				icon: 'sticky-note',
				title: 'Sticky notes',
				description: 'Sticky notes with clone handles and smart placement.',
			},
			{
				_key: 'shape-draw',
				icon: 'pen-line',
				title: 'Drawing tools',
				description: 'Freehand drawing and highlighter tools.',
			},
			{
				_key: 'shape-arrow',
				icon: 'move',
				title: 'Smart arrows',
				description: 'Smart arrows that connect to shapes and update automatically.',
			},
			{
				_key: 'shape-media',
				icon: 'image',
				title: 'Media support',
				description:
					'Videos, images and GIFs that can be arranged and annotated like any other shape.',
			},
			{
				_key: 'shape-embed',
				icon: 'fullscreen',
				title: 'Built-in embeds',
				description: '18 built-in embed types including YouTube, Figma and Google Maps.',
			},
		],
	},

	// Section 5: "Top benefits from the first line of code" — benefitCards (3 cards with bullets)
	{
		_type: 'benefitCards',
		_key: 'wb-benefits',
		heading: 'Top benefits from the first line of code',
		cards: [
			{
				_key: 'benefit-perf',
				icon: 'zap',
				title: 'Performance at scale',
				bullets: [
					'Viewport culling',
					'Efficient shape batching',
					'Smooth interactions with thousands of shapes',
					'Memory management',
				],
			},
			{
				_key: 'benefit-persist',
				icon: 'hard-drive',
				title: 'Reliable persistence',
				bullets: [
					'Automatic undo/redo',
					'Conflict-free collaborative editing',
					'Incremental saves and data migration',
					'Robust error handling',
				],
			},
			{
				_key: 'benefit-dx',
				icon: 'wrench',
				title: 'Great developer experience',
				bullets: [
					'Full TypeScript definitions',
					'Comprehensive React integration',
					'Extensive documentation and examples',
					'Debug views',
				],
			},
		],
	},
]

// --- Main ---

async function main() {
	console.log('=== Whiteboard structured blocks migration ===')
	console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`)
	console.log(`Dataset: ${process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'}`)

	const existing = await client.getDocument(DOC_ID)
	if (!existing) {
		console.error(`Document ${DOC_ID} not found. Run seed-features.ts first.`)
		process.exit(1)
	}

	console.log(`Found document: "${existing.title}"`)
	console.log(`Replacing body with ${body.length} structured blocks...`)

	await client.patch(DOC_ID).set({ body }).commit()

	console.log('Done! Body replaced with structured blocks:')
	for (const b of body) {
		const type = b._type
		const label =
			'heading' in b
				? (b as { heading?: string }).heading
				: `${(b as { cards?: unknown[] }).cards?.length ?? 0} cards`
		console.log(`  • ${type}: ${label}`)
	}
}

main().catch((err) => {
	console.error('Migration failed:', err)
	process.exit(1)
})
