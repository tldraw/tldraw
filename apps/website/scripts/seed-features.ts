/**
 * Seed feature pages into Sanity with the full nested URL structure
 * matching tldraw.dev/features/{group}/{capability}
 *
 * Usage: source .env.local && npx tsx scripts/seed-features.ts
 */

import { createClient } from '@sanity/client'

const client = createClient({
	projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
	dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
	apiVersion: '2025-01-01',
	token: process.env.SANITY_API_TOKEN!,
	useCdn: false,
})

function key(i: number) {
	return `item-${i}`
}

interface FeatureDoc {
	_type: 'featurePage'
	_id: string
	title: string
	slug: { _type: 'slug'; current: string }
	description: string
	category: 'featured' | 'group' | 'capability'
	parentGroup?: string
	eyebrow?: string
	heroSubtitle?: string
	children?: { _type: 'object'; _key: string; title: string; description: string; slug: string }[]
	order: number
}

// --- Featured pages ---

const featured: FeatureDoc[] = [
	{
		_type: 'featurePage',
		_id: 'featurePage-out-of-the-box-whiteboard',
		title: 'Out-of-the-box whiteboard',
		slug: { _type: 'slug', current: 'out-of-the-box-whiteboard' },
		description:
			'A production-ready whiteboard with all the features your users expect, ready to embed in your app.',
		category: 'featured',
		eyebrow: 'Ready to use',
		heroSubtitle:
			'A production-ready whiteboard with all the features your users expect, ready to embed in your app.',
		order: 0,
	},
]

// --- Group pages ---

const groups: FeatureDoc[] = [
	{
		_type: 'featurePage',
		_id: 'featurePage-composable-primitives',
		title: 'Composable primitives for your infinite canvas',
		slug: { _type: 'slug', current: 'composable-primitives' },
		description: 'Reliable primitives that work independently or together.',
		category: 'group',
		eyebrow: 'Compose',
		heroSubtitle: 'Reliable primitives that work independently or together.',
		children: [
			{
				_type: 'object',
				_key: 'c0',
				title: 'Multiplayer collaboration',
				description:
					'The tldraw sync system takes care of conflict resolution, presence tracking, and connection management. Users get real-time collaboration with shared cursors, live selections, and smooth conflict handling.',
				slug: 'multiplayer-collaboration',
			},
			{
				_type: 'object',
				_key: 'c1',
				title: 'Drawing and canvas interactions',
				description:
					'Pointer movements, gestures, and key presses are translated into precise, responsive actions on the canvas. The event system runs on a state machine that scales from simple tools to complex multi-step workflows.',
				slug: 'drawing-and-canvas-interactions',
			},
			{
				_type: 'object',
				_key: 'c2',
				title: 'Data management',
				description:
					'The reactive store handles automatic subscriptions, efficient updates, and type-safe operations across your entire canvas. Changes flow instantly through computed values and side effects.',
				slug: 'data-management',
			},
			{
				_type: 'object',
				_key: 'c3',
				title: 'Camera and viewport',
				description:
					'The camera system delivers smooth zooming, infinite panning, and precise coordinates for fluid navigation. It manages viewport culling, coordinate transforms, and animation timing automatically.',
				slug: 'camera-and-viewport',
			},
			{
				_type: 'object',
				_key: 'c4',
				title: 'Layout and composition',
				description:
					'The geometry system computes bounds automatically, snaps objects into place intelligently, and keeps layouts precise. Use it to build alignment guides, automatic layout engines, or measurement tools.',
				slug: 'layout-and-composition',
			},
			{
				_type: 'object',
				_key: 'c5',
				title: 'Selection and transformation',
				description:
					'Users can select multiple shapes, drag handles to resize or rotate, and apply batch operations with familiar keyboard modifiers. The system manages visual feedback and precise transformation controls automatically.',
				slug: 'selection-and-transformation',
			},
			{
				_type: 'object',
				_key: 'c6',
				title: 'Accessibility',
				description:
					'Screen reader support, keyboard navigation, and semantic shape descriptions make canvas apps usable for everyone. The accessibility system provides context-aware announcements and full keyboard control.',
				slug: 'accessibility',
			},
			{
				_type: 'object',
				_key: 'c7',
				title: 'User interface and menus',
				description:
					'Every UI component can be customized or replaced. The system provides responsive layouts, theme support, and full override capabilities while keeping behavior consistent across screen sizes.',
				slug: 'ui-and-menus',
			},
		],
		order: 0,
	},
	{
		_type: 'featurePage',
		_id: 'featurePage-programmatic-control',
		title: 'Drive the canvas',
		slug: { _type: 'slug', current: 'programmatic-control' },
		description:
			"Skip building basic editor APIs and start with tldraw's comprehensive runtime controls.",
		category: 'group',
		eyebrow: 'Control',
		heroSubtitle:
			"Skip building basic editor APIs and start with tldraw's comprehensive runtime controls.",
		children: [
			{
				_type: 'object',
				_key: 'c0',
				title: 'Runtime editor API',
				description:
					'A single Editor instance gives you full programmatic control over the canvas. Create shapes, manage selections, switch tools, and coordinate complex operations through a reactive API.',
				slug: 'runtime-editor-api',
			},
			{
				_type: 'object',
				_key: 'c1',
				title: 'Event handling',
				description:
					'The event system lets you hook into every interaction and canvas change. Listen for shape creation, deletion, selection updates, and user input to make your app respond to both user actions and programmatic changes.',
				slug: 'event-handling',
			},
			{
				_type: 'object',
				_key: 'c2',
				title: 'State management and control',
				description:
					'Reactive state management keeps the canvas and your application in sync. Changes flow automatically through computed values and subscriptions, removing the need for manual synchronization.',
				slug: 'state-management-and-control',
			},
			{
				_type: 'object',
				_key: 'c3',
				title: 'Creating and updating shapes',
				description:
					'Use clean APIs to generate shapes from data, automate layouts, and run complex transformations. Create single shapes or batches, animate updates, and manage hierarchies.',
				slug: 'creating-and-updating-shapes',
			},
			{
				_type: 'object',
				_key: 'c4',
				title: 'Viewport and camera control',
				description:
					'Programmatic camera control lets you guide navigation, focus attention, and build dynamic presentations. Pan, zoom, and animate the viewport with smooth transitions.',
				slug: 'viewport-and-camera-control',
			},
		],
		order: 1,
	},
	{
		_type: 'featurePage',
		_id: 'featurePage-customization',
		title: 'Customization',
		slug: { _type: 'slug', current: 'customization' },
		description: 'Nearly every part of the tldraw SDK is customizable and extensible.',
		category: 'group',
		eyebrow: 'Customize',
		heroSubtitle:
			'Nearly every part of the tldraw SDK is customizable and extensible. You can replace or enrich shapes with your own designs, swap out UI components to match your brand, or build entirely new tools for your specific use case.',
		children: [
			{
				_type: 'object',
				_key: 'c0',
				title: 'Custom shapes and tools',
				description:
					'Build shapes that fit your domain requirements. The shape system provides complete control over rendering, interaction behavior, and integration with canvas operations.',
				slug: 'custom-shapes-and-tools',
			},
			{
				_type: 'object',
				_key: 'c1',
				title: 'Custom user interface components',
				description:
					'Every interface element can be replaced, modified, or removed entirely. The component override system supports everything from subtle brand adjustments to complete interface redesigns.',
				slug: 'custom-user-interface-components',
			},
			{
				_type: 'object',
				_key: 'c2',
				title: 'Custom asset and content management',
				description:
					'Register custom handlers that detect and transform any content type into application-specific shapes. Implement custom storage backends that integrate with your existing infrastructure.',
				slug: 'custom-asset-and-content-management',
			},
		],
		order: 2,
	},
]

// --- Capability pages (children of groups) ---

const capabilities: FeatureDoc[] = [
	// composable-primitives children
	{
		_type: 'featurePage',
		_id: 'featurePage-multiplayer-collaboration',
		title: 'Real-time collaborative canvas',
		slug: { _type: 'slug', current: 'multiplayer-collaboration' },
		description:
			'Real-time collaboration made simple: simultaneous editing, live cursors, instant updates, and conflict-free syncing.',
		category: 'capability',
		parentGroup: 'composable-primitives',
		eyebrow: 'Composable Primitives',
		order: 0,
	},
	{
		_type: 'featurePage',
		_id: 'featurePage-drawing-and-canvas-interactions',
		title: 'Drawing and canvas interactions',
		slug: { _type: 'slug', current: 'drawing-and-canvas-interactions' },
		description:
			'Pointer movements, gestures, and key presses are translated into precise, responsive actions on the canvas.',
		category: 'capability',
		parentGroup: 'composable-primitives',
		eyebrow: 'Composable Primitives',
		order: 1,
	},
	{
		_type: 'featurePage',
		_id: 'featurePage-cp-data-management',
		title: 'Data management',
		slug: { _type: 'slug', current: 'data-management' },
		description:
			'The reactive store handles automatic subscriptions, efficient updates, and type-safe operations across your entire canvas.',
		category: 'capability',
		parentGroup: 'composable-primitives',
		eyebrow: 'Composable Primitives',
		order: 2,
	},
	{
		_type: 'featurePage',
		_id: 'featurePage-camera-and-viewport',
		title: 'Camera and viewport',
		slug: { _type: 'slug', current: 'camera-and-viewport' },
		description:
			'The camera system delivers smooth zooming, infinite panning, and precise coordinates for fluid navigation.',
		category: 'capability',
		parentGroup: 'composable-primitives',
		eyebrow: 'Composable Primitives',
		order: 3,
	},
	{
		_type: 'featurePage',
		_id: 'featurePage-cp-layout-and-composition',
		title: 'Layout and composition',
		slug: { _type: 'slug', current: 'layout-and-composition' },
		description:
			'The geometry system computes bounds automatically, snaps objects into place intelligently, and keeps layouts precise.',
		category: 'capability',
		parentGroup: 'composable-primitives',
		eyebrow: 'Composable Primitives',
		order: 4,
	},
	{
		_type: 'featurePage',
		_id: 'featurePage-cp-selection-and-transformation',
		title: 'Selection and transformation',
		slug: { _type: 'slug', current: 'selection-and-transformation' },
		description:
			'Users can select multiple shapes, drag handles to resize or rotate, and apply batch operations with familiar keyboard modifiers.',
		category: 'capability',
		parentGroup: 'composable-primitives',
		eyebrow: 'Composable Primitives',
		order: 5,
	},
	{
		_type: 'featurePage',
		_id: 'featurePage-cp-accessibility',
		title: 'Accessibility',
		slug: { _type: 'slug', current: 'accessibility' },
		description:
			'Screen reader support, keyboard navigation, and semantic shape descriptions make canvas apps usable for everyone.',
		category: 'capability',
		parentGroup: 'composable-primitives',
		eyebrow: 'Composable Primitives',
		order: 6,
	},
	{
		_type: 'featurePage',
		_id: 'featurePage-cp-ui-and-menus',
		title: 'User interface and menus',
		slug: { _type: 'slug', current: 'ui-and-menus' },
		description:
			'Every UI component can be customized or replaced. The system provides responsive layouts, theme support, and full override capabilities.',
		category: 'capability',
		parentGroup: 'composable-primitives',
		eyebrow: 'Composable Primitives',
		order: 7,
	},

	// programmatic-control children
	{
		_type: 'featurePage',
		_id: 'featurePage-runtime-editor-api',
		title: 'Runtime editor API',
		slug: { _type: 'slug', current: 'runtime-editor-api' },
		description:
			'A single Editor instance gives you full programmatic control over the canvas. Create shapes, manage selections, switch tools, and coordinate complex operations through a reactive API.',
		category: 'capability',
		parentGroup: 'programmatic-control',
		eyebrow: 'Programmatic Control',
		order: 0,
	},
	{
		_type: 'featurePage',
		_id: 'featurePage-event-handling',
		title: 'Event handling',
		slug: { _type: 'slug', current: 'event-handling' },
		description:
			'The event system lets you hook into every interaction and canvas change. Listen for shape creation, deletion, selection updates, and user input.',
		category: 'capability',
		parentGroup: 'programmatic-control',
		eyebrow: 'Programmatic Control',
		order: 1,
	},
	{
		_type: 'featurePage',
		_id: 'featurePage-state-management-and-control',
		title: 'State management and control',
		slug: { _type: 'slug', current: 'state-management-and-control' },
		description:
			'Reactive state management keeps the canvas and your application in sync. Changes flow automatically through computed values and subscriptions.',
		category: 'capability',
		parentGroup: 'programmatic-control',
		eyebrow: 'Programmatic Control',
		order: 2,
	},
	{
		_type: 'featurePage',
		_id: 'featurePage-creating-and-updating-shapes',
		title: 'Creating and updating shapes',
		slug: { _type: 'slug', current: 'creating-and-updating-shapes' },
		description:
			'Use clean APIs to generate shapes from data, automate layouts, and run complex transformations. Create single shapes or batches.',
		category: 'capability',
		parentGroup: 'programmatic-control',
		eyebrow: 'Programmatic Control',
		order: 3,
	},
	{
		_type: 'featurePage',
		_id: 'featurePage-viewport-and-camera-control',
		title: 'Viewport and camera control',
		slug: { _type: 'slug', current: 'viewport-and-camera-control' },
		description:
			'Programmatic camera control lets you guide navigation, focus attention, and build dynamic presentations.',
		category: 'capability',
		parentGroup: 'programmatic-control',
		eyebrow: 'Programmatic Control',
		order: 4,
	},

	// customization children
	{
		_type: 'featurePage',
		_id: 'featurePage-custom-shapes-and-tools',
		title: 'Custom shapes and tools',
		slug: { _type: 'slug', current: 'custom-shapes-and-tools' },
		description:
			'Build shapes that fit your domain requirements. The shape system provides complete control over rendering, interaction behavior, and integration with canvas operations.',
		category: 'capability',
		parentGroup: 'customization',
		eyebrow: 'Customization',
		order: 0,
	},
	{
		_type: 'featurePage',
		_id: 'featurePage-custom-user-interface-components',
		title: 'Custom user interface components',
		slug: { _type: 'slug', current: 'custom-user-interface-components' },
		description:
			'Every interface element can be replaced, modified, or removed entirely. The component override system supports everything from subtle brand adjustments to complete interface redesigns.',
		category: 'capability',
		parentGroup: 'customization',
		eyebrow: 'Customization',
		order: 1,
	},
	{
		_type: 'featurePage',
		_id: 'featurePage-custom-asset-and-content-management',
		title: 'Custom asset and content management',
		slug: { _type: 'slug', current: 'custom-asset-and-content-management' },
		description:
			'Register custom handlers that detect and transform any content type into application-specific shapes. Implement custom storage backends that integrate with your existing infrastructure.',
		category: 'capability',
		parentGroup: 'customization',
		eyebrow: 'Customization',
		order: 2,
	},
]

async function main() {
	console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`)
	console.log(`Dataset: ${process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'}`)

	console.log('\n--- Seeding featured pages ---')
	for (const doc of featured) {
		await client.createOrReplace(doc)
		console.log(`  + ${doc.title}`)
	}

	console.log('\n--- Seeding group pages ---')
	for (const doc of groups) {
		await client.createOrReplace(doc)
		console.log(`  + ${doc.slug.current} (${doc.children?.length || 0} children)`)
	}

	console.log('\n--- Seeding capability pages ---')
	for (const doc of capabilities) {
		await client.createOrReplace(doc)
		console.log(`  + ${doc.parentGroup}/${doc.slug.current}`)
	}

	console.log(
		`\nDone! ${featured.length + groups.length + capabilities.length} feature pages seeded.`
	)
}

main().catch((err) => {
	console.error('Failed:', err)
	process.exit(1)
})
