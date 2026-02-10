/**
 * Migration script: Feature page body content → Sanity
 *
 * Updates existing Sanity featurePage documents with body content scraped from
 * the live Framer site. Also creates new sub-page documents for feature sub-pages.
 *
 * For existing top-level pages (no parentSlug): patches only the `body` field.
 * For sub-pages (with parentSlug): creates or replaces the full document.
 *
 * Usage:
 *   1. Set SANITY_API_TOKEN, NEXT_PUBLIC_SANITY_PROJECT_ID, and NEXT_PUBLIC_SANITY_DATASET
 *   2. Run: npx tsx scripts/migrate-feature-body-content.ts
 */

import { createClient } from '@sanity/client'

const client = createClient({
	projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
	dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
	apiVersion: '2025-01-01',
	token: process.env.SANITY_API_TOKEN!,
	useCdn: false,
})

// --- Portable Text helpers ---

let keyCounter = 0

function makeKey(prefix: string): string {
	return `${prefix}-${keyCounter++}`
}

interface PortableTextBlock {
	_type: 'block'
	_key: string
	style: 'normal' | 'h2' | 'h3'
	markDefs: never[]
	children: Array<{
		_type: 'span'
		_key: string
		text: string
		marks: never[]
	}>
}

function makeBlock(text: string, style: 'normal' | 'h2' | 'h3', prefix: string): PortableTextBlock {
	return {
		_type: 'block',
		_key: makeKey(prefix),
		style,
		markDefs: [],
		children: [
			{
				_type: 'span',
				_key: 'span0',
				text,
				marks: [],
			},
		],
	}
}

/**
 * Convert scraped page text into Portable Text blocks.
 *
 * The text follows this pattern (newline-separated):
 *   Line 0: Page title
 *   Line 1: Page description
 *   Lines 2..N: Alternating feature title / feature description pairs
 *   Optional "Solid engineering" divider followed by deep-dive title/description pairs
 */
function textToPortableText(text: string, slug: string): PortableTextBlock[] {
	const lines = text.split('\n').filter((line) => line.trim().length > 0)
	if (lines.length === 0) return []

	const blocks: PortableTextBlock[] = []
	const prefix = slug

	// First line is the page title (h2)
	blocks.push(makeBlock(lines[0], 'h2', prefix))

	// Second line is the page description (normal)
	if (lines.length > 1) {
		blocks.push(makeBlock(lines[1], 'normal', prefix))
	}

	// Remaining lines are title/description pairs
	// Detect the "Solid engineering" section divider
	let i = 2
	while (i < lines.length) {
		const line = lines[i]

		if (line === 'Solid engineering') {
			// Add as h2 heading
			blocks.push(makeBlock(line, 'h2', prefix))
			i++

			// Following line is the description for this section
			if (i < lines.length) {
				blocks.push(makeBlock(lines[i], 'normal', prefix))
				i++
			}

			// Remaining lines after "Solid engineering" are deep-dive title/description pairs
			while (i < lines.length) {
				// Deep-dive title as h3
				blocks.push(makeBlock(lines[i], 'h3', prefix))
				i++

				// Deep-dive description as normal
				if (i < lines.length) {
					blocks.push(makeBlock(lines[i], 'normal', prefix))
					i++
				}
			}
			break
		}

		// Regular feature card: title as h3, description as normal
		if (line === 'And so much more') {
			// "And so much more" is a section title (h2)
			blocks.push(makeBlock(line, 'h2', prefix))
			i++

			// Its description follows
			if (i < lines.length) {
				blocks.push(makeBlock(lines[i], 'normal', prefix))
				i++
			}
			continue
		}

		// Feature card title (h3)
		blocks.push(makeBlock(line, 'h3', prefix))
		i++

		// Feature card description (normal)
		if (i < lines.length && lines[i] !== 'Solid engineering' && lines[i] !== 'And so much more') {
			blocks.push(makeBlock(lines[i], 'normal', prefix))
			i++
		}
	}

	return blocks
}

// --- Scraped content data ---

interface PageContent {
	slug: string
	parentSlug: string | null
	text: string
}

const pages: Record<string, PageContent> = {
	'/features/composable-primitives/multiplayer-collaboration': {
		slug: 'multiplayer-collaboration',
		parentSlug: 'composable-primitives',
		text: 'Real-time collaborative canvas\nReal-time collaboration made simple: simultaneous editing, live cursors, instant updates, and conflict-free syncing.\nCollaboration UI\nReal-time cursors, selections, chat bubbles, and viewport activity, all rendered with smooth animations.\nLive updates\nEnable simultaneous editing for numerous users with a built-in conflict resolution system that keeps canvas state consistent.\nSession management\nUse tldraw sync for automatic reconnection, multi-tab sync, and cross-device consistency with full state preservation.\nViewport following\nAdd follow-mode to your app, letting teammates share their viewports for presentations, tours, or guided editing.\nAccess control\nDefine granular editor and viewer roles with APIs that plug into your existing authentication system.\nDistributed architecture\nPower real-time collaboration at scale with up to 50 users editing together on the same canvas.',
	},
	'/features/composable-primitives/drawing-and-canvas-interactions': {
		slug: 'drawing-and-canvas-interactions',
		parentSlug: 'composable-primitives',
		text: "Drawing and canvas interactions\nPerfect drawing tools your users will love.\nFreehand drawing\nCreate fluid drawings with pressure-sensitive input and intelligent stroke algorithms, perfect for sketching tools, annotation systems, and creative applications.\nGeometric shapes\nEnjoy a complete shape library that includes rectangles, ellipses, polygons, and hearts, each available in four stroke styles: solid, dashed, dotted, and hand-drawn.\nPerfect arrows\nDraw connections with arc and elbow arrows that snap into clean orthogonal paths, using geometric routing to create optimal links between connection points.\nRich text editing\nBuild powerful text editing with TipTap integration, auto-sizing modes, and extensible formatting. Ideal for document editors, note-taking tools, and annotation systems.\nPrecise eraser tool\nAn eraser that distinguishes between click and drag, respects locked content, and previews exactly what will be deleted.\nBuilt-in embed library\nEmbed 19 popular platforms easily, with secure, responsive, pre-configured integrations that work out of the box.\nNavigation controls\nDevelop pan, zoom, and viewport tools with gesture support, smooth animations, and edge-scrolling for uninterrupted canvas exploration.\nSolid engineering\nOur team spent years to get all the details right, so you don't have to.\nFreehand drawing with digital ink\nThe freehand tool delivers precise, natural digital ink with seamless transitions between freehand and straight lines. Our state machine enables perfect lines, angle snapping, and fluid control, while a multi-stage pipeline ensures smooth input, pressure-responsive sizing, and adaptive corner detection. With pressure sensitivity, palm rejection, zoom-adaptive precision, and advanced stroke generation, it provides responsive, high-performance drawing across devices.\nSticky notes, deceptively simple\nWhat feels like simple text editing is powered by clone handles, rotation-aware positioning, and smart sticky pit snapping. Behind the scenes, the system calculates pit positions, adapts keyboard movement, adjusts fonts precisely, and even adds natural shadows with seeded randomization. Text editing feels effortless while complex logic runs invisibly in the background.\nCross-browser asset management\nTo ensure reliability in supporting images, videos, and embeds, the system uses level-of-detail resolution with power-of-2 zoom steps, hash-based asset deduplication, and a local-to-remote upload flow. Exports preserve PNG metadata, maintain SVG foreignObject compatibility, and respect browser canvas size limits. The asset pipeline also handles animated GIFs, video codec fallbacks, and secure iframe sandboxing for more than 30 embed providers.\nCustom shape extensibility\nThe shape system extends beyond built-ins to support 3D content, audio players, and interactive components through the same ShapeUtil interface. Custom shapes automatically gain selection handles, resize logic, binding points, and export support. Geometry, hit testing, and rendering optimizations are all handled by the architecture. This lets developers focus on unique behaviors while tldraw manages transforms, performance, and state integration.",
	},
	'/features/composable-primitives/data-management': {
		slug: 'data-management',
		parentSlug: 'composable-primitives',
		text: "Data management\nManage state, history, multiplayer presence, and schema migrations with tldraw's type-safe data management system.\nReactive store\nKeep UI, computed values, and business logic in sync by leveraging tldraw's reactive data layer, which instantly propagates changes without manual state management.\nType safety\nDefine data with an enumerated set of valid records, each with strict types, including branded types that catch errors before they reach production.\nHistory and undo/redo\nImplement undo/redo functionality with built-in change tracking of configurable length. Every modification is a reversible operation that can be batched.\nCollaboration-ready\nAdd multiplayer features in minutes with built-in simultaneous editing powered by tldraw's collaboration system, which uses intelligent conflict resolution and data scoping.\nAsset management\nHandle large uploads and media files with advanced optimization, deduplication, and pluggable storage backends. Perfect for handling images, videos, and user-generated content.\nSolid engineering\nOur team spent years to get all the details right, so you don't have to.\nScoped data organization\nThe data system structures application state into three scopes (document, session, and presence), each with tailored persistence and synchronization strategies. The document scope stores core content that persists across sessions and syncs across all users. The session scope manages user-specific preferences and UI state that remain local to the browser. The presence scope tracks real-time awareness data, such as cursor positions, which update instantly but aren't stored long term.\nReactive state management\nAll data operations use reactive signals that automatically propagate changes to dependent components and computed values. When records change, the system identifies affected parts of the application and updates them efficiently without manual subscription management. This eliminates common state synchronization bugs and reduces boilerplate code while maintaining predictable update patterns throughout the application lifecycle.\nMigration and schema evolution\nThe migration system ensures backward compatibility when loading data created with older schema versions. Each data snapshot includes version metadata that triggers automatic migration sequences during deserialization. Migrations apply transformations sequentially with comprehensive validation, enabling applications to evolve their data structures while preserving existing user content and maintaining data integrity across version boundaries.\nAsset storage and optimization\ntldraw handles large files through pluggable storage backends with intelligent optimization for different contexts. Upload workflows include automatic validation, deduplication through content hashing, and temporary preview generation for immediate user feedback. The system supports dynamic image resizing based on viewport requirements, format optimization for modern browsers, and network-aware quality adjustments to balance performance with visual fidelity across different connection speeds.",
	},
	'/features/composable-primitives/camera-and-viewport': {
		slug: 'camera-and-viewport',
		parentSlug: 'composable-primitives',
		text: "Precise camera and viewport control\nNavigate the canvas smoothly with zoom and flexible viewport positioning.\nSmart zoom\nAdd intuitive zooming that steps smoothly in and out, always landing at the right level of detail with content-aware calculations.\nCamera constraints\nSet flexible camera boundaries tailored to your app's needs, from free-flow movement to contained views, or more fine-tuned solutions.\nOptimized smooth animations\nCustomize fluid transitions to match your brand and adapt to your users' needs, optimized across all devices with built-in viewport culling and level-of-detail scaling.\nViewport following\nBuild real-time camera synchronization so your users stay in sync. Perfect for presentation modes, guided tours, or restricted editing workflows.\nSolid engineering\nOur team spent years to get all the details right, so you don't have to.\nScreen and page space translation\nOur camera system maintains dual coordinate system with precise translation between the screen space and page space. Regardless of zoom level, it creates accurate hit testing and shape positioning. Screen space handles UI positioning and input events relative to the browser viewport, while page space manages canvas content with precision.\nIntelligent zoom management\nThe zoom system operates on step-based architecture rather than continuous scaling. Our base zoom calculations automatically determine optimal zoom levels based on content bounds. This prevents jarring zoom jumps and maintains visual coherence. Even when zoom levels are customized, they will still feel natural and predictable to users.\nPerformance-optimized rendering pipeline\nThe camera system relies on tldraw's rendering pipeline to maintain smooth performance during movements and zoom operations. It optimizes rendering by culling shapes outside the viewport, scaling level of detail based on zoom, synchronizing updates with the browser's refresh cycles, and using memory-efficient viewport tracking to minimize computational overhead. All of this ensures smooth interactions across all users, tabs, and devices.",
	},
	'/features/composable-primitives/layout-and-composition': {
		slug: 'layout-and-composition',
		parentSlug: 'composable-primitives',
		text: "Professional layout tools\nYour users expect drag-and-drop that snaps perfectly. We handle the math.\nObject alignment\nCreate precise object alignment systems with edge detection, center points, and distribution controls. Perfect for building design tools that need consistent spacing and professional layouts.\nObject ordering\nManage z-index layering with intuitive bring-to-front and send-to-back controls that handle complex multi-object hierarchies and maintain visual depth relationships.\nSmart snapping\nBuild with tldraw's magnetic snapping systems that guide shapes with bounds, handles, and geometric alignment for user interactions that feel natural.\nObject grouping\nImplement hierarchical object relationships that preserve individual shape properties while enabling batch operations and nested transformation behaviors.\nDynamic transformation controls\nImplement multi-directional resize handles with aspect ratio preservation, rotation controls, and proportional scaling options. It also works with multi-object batch operations.\nVisual feedback\nCreate transformation previews, dimension indicators, and alignment guides that automatically prioritize snap targets based on proximity and user intent.\nSolid engineering\nOur team spent years to get all the details right, so you don't have to.\nScreen vs. page coordinates\ntldraw's layout system manages two coordinate spaces. Screen coordinates handle UI interactions and viewport positioning, while page coordinates maintain object relationships independent of zoom and pan state. This dual-coordinate approach enables consistent manipulation behavior regardless of canvas transform state.\nTransform matrix operations\nEvery shape maintains a transformation matrix that combines position, rotation, and scale operations. These matrices compose hierarchically for grouped objects and decompose cleanly for individual manipulation. The system handles matrix composition and inversion for smooth animation and precise positioning.\nMulti-modal precision control\ntldraw provides multi-layers precision control that adapts to different user needs and contexts. These control mechanisms work together to enable both rapid positioning and pixel-perfect fine-tuning within the same interaction framework.",
	},
	'/features/composable-primitives/selection-and-transformation': {
		slug: 'selection-and-transformation',
		parentSlug: 'composable-primitives',
		text: "Selection and transformation\nPrecise object selection with multi-modal interaction, precise hit-testing, and seamless transformation controls.\nTransformation handles\nTransform objects in tldraw with rotating and moving controls that include visual feedback, constraint handling, and proportional scaling, plus snap-to guides for perfect alignment.\nSmart hit testing\nUse tldraw's precise cursor targets with layered shape detection and group awareness to help your users click exactly where intended, even on overlapping shapes or tiny details.\nTouch and mobile support\nHandle touch gestures, mobile-specific interactions, and responsive transformation controls across all device types. Selection areas automatically adjust for touch targets.\nCloning and duplication\nClone shapes with one click, using intelligent positioning, modifier key support, and batch duplication to avoid stacking and duplicate multiple objects at once.\nState machine architecture\nManage complex selection flows with organized hierarchies, easily transitioning between idle clicking, box-dragging, and shape-moving without confusion.\nSolid engineering\nOur team spent years to get all the details right, so you don't have to.\nHierarchical state management\nSelection tools operate through elaborate state machines that handle overlapping interaction modes such as brushing, translating, resizing, and rotating. Each state maintains its own interaction logic while sharing common selection context.\nHit testing\nThe system performs multi-layered hit detection that considers shape geometry, group hierarchies, and locked objects. Hit testing evaluates cursor position against shape bounds, handles, and interactive regions while respecting z-index ordering and group ordering for predictable selection behavior.\nModifier-based interaction\nModifier keys transform selection behavior dynamically. For example, shift enables additive selection, alt switches to scribble brushing mode, and cmd/ctrl provides cloning operations. These modifiers combine naturally with primary interactions to create multi-modal workflows.",
	},
	'/features/composable-primitives/accessibility': {
		slug: 'accessibility',
		parentSlug: 'composable-primitives',
		text: "Accessibility\nCanvas applications built for everyone, WCAG 2.2 AA compliant with comprehensive screen reader support, keyboard navigation, and adaptive interfaces.\nScreen reader support\nBuild canvas apps that are compatible with screen readers. Announcements include selections, tool changes, or canvas operations, all with meaningful context about selected shapes.\nKeyboard navigation\nFull keyboard accessibility throughout toolbars, menus, and canvas interactions with customizable shortcuts. With tldraw, users can use the canvas without touching the mouse.\nFocus management\nFocus follows a logical read order with clear indicators and skip-to-content. In addition, tldraw also supports powerful directional navigation (up, down, left, right) that enhances movement and restores focus after modal interactions.\nWCAG 2.2 AA compliant\nThe tldraw SDK meets modern accessibility standards, ensuring inclusive interactions and usability for people with diverse abilities.\nMotion preferences\nVisual feedback is customizable in tldraw. System-level reduced motion settings enable simplified transitions instead of complex animations.\nARIA integration\nBuild accessible interfaces with comprehensive ARIA labels, roles, and live regions that work seamlessly with assistive technologies.\nSolid engineering\nOur team spent years to get all the details right, so you don't have to.\nShape selection announcement engine\nThe engine translates visual selections on the canvas into clear, descriptive text for assistive technologies. The result is feedback that mirrors the visual experience: whether someone selects a single shape or edits a group, the system provides meaningful descriptions that help everyone stay connected to the canvas.\nUI accessibility configuration\nThe tldraw UI includes built-in accessibility configuration options that can be customized to meet user needs. This includes the ability to turn on accessible labels for toolbar buttons, configure visual focus indicators, and adjust interface elements for better compatibility with assistive technologies.\nKeyboard navigation state machine\ntldraw canvas is fully operable through the keyboard. A state machine directs key input based on what the user is doing (navigating menus, editing shapes, or typing text) and keystrokes behave consistently. It also manages focus order and resolves conflicts between shortcuts automatically.\nFocus restoration and navigation aids\nThis system helps users stay oriented as they move around the interface. It remembers where focus was before a modal, dialog, or navigation change, and restores it intelligently afterward. On top of that, it provides a skip link so users can jump quickly to important areas without tabbing through every control.\nProvider-based architecture\nThe accessibility system uses React context to establish centralized state management at the application root. This provider pattern distributes accessibility features throughout the component tree without prop drilling. It integrates with tldraw's reactive state system for automatic updates.",
	},
	'/features/composable-primitives/ui-and-menus': {
		slug: 'ui-and-menus',
		parentSlug: 'composable-primitives',
		text: "User interface complete\nComplete UI library with responsive components, customizable toolbars, and comprehensive menu architecture for professional applications.\nContext menu system\nCreate rich dropdown and context menus with keyboard navigation, nested submenus, and positioning. Perfect for design apps where users expect right-click workflows.\nComponent overrides\nReplace every UI component with your custom implementation. Swap out toolbars, menus, panels, or canvas overlays to match your app's brand.\nResponsive breakpoints\nImplement adaptive layouts that automatically adjust to different screen sizes and device orientations. Interface elements hide, resize, or reposition based on available space.\nInternationalization support\nMenu labels, tooltips, and interface text automatically adapt to user language preferences with proper text direction handling.\nSolid engineering\nOur team spent years to get all the details right, so you don't have to.\nComponent provider system\nThe UI framework uses hierarchical React contexts to manage component overrides, themes, and state throughout the interface. This provider architecture delivers components their required props while supporting deep customization without prop drilling. The system handles component registration, override resolution, and fallback management automatically.\nIntelligent overflow management\nThe toolbar system uses space calculations and dynamic component hiding based on available screen real estate. Components register their minimum sizes and priority levels, then the system automatically moves lower-priority items to overflow menus when space becomes constrained.\nMenu system and interaction patterns\nThe menu architecture is designed to support a variety of interaction styles, all from a single unified system. Standard dropdown menus provide familiar hover and keyboard navigation, while context menus adapt dynamically to what's selected.",
	},
	'/features/programmatic-control/runtime-editor-api': {
		slug: 'runtime-editor-api',
		parentSlug: 'programmatic-control',
		text: "Runtime editor API\nDirect programmatic control over your canvas application during runtime.\nShape operations\nCreate, modify, and remove shapes programmatically with full validation and consistency. Perfect for content generators, import systems, and automated drawing tools.\nSelection management\nControl user focus by programmatically managing selections and highlights. Guide users' attention through complex documents and coordinate multi-step workflows.\nCamera control\nDirect viewport positioning and zoom levels with smooth animations. Build guided tours, presentation modes, and focus systems that automatically highlight relevant content.\nBatch transactions\nGroup multiple operations into atomic changes with clean undo/redo boundaries.\nReal-time queries\nAccess live canvas state through reactive queries that update automatically.\nEvent integration\nBuild analytics systems, collaboration features, and custom interaction patterns by hooking into editor events and state changes.\nSolid engineering\nOur team spent years to get all the details right, so you don't have to.\nAdvanced selection and focus system\nThe system enables precise control of user attention through programmatic selection and focus management. It supports complex selection patterns, hierarchical focus within groups, and intelligent viewport coordination.\nComprehensive shape lifecycle management\nThe editor provides complete control over shape creation, modification, and deletion with the same validation and consistency guarantees as user interactions.\nProfessional camera and viewport control\nThe system offers advanced camera control with smooth animations, intelligent bounds handling, and seamless viewport transitions.\nAsset handling and storage integration\nLarge assets like images and videos are handled separately from real-time synchronization to maintain performance.",
	},
	'/features/programmatic-control/event-handling': {
		slug: 'event-handling',
		parentSlug: 'programmatic-control',
		text: 'Event handling\nControl every interaction, react to every change.\nLifecycle hooks\nCapture create, update, and delete operations before or after they run. Register handlers for specific record types with full state access for optimized decisions.\nChange prevention\nStop unwanted operations in their tracks (or transform them into different actions).\nAutomatic reactions\nTrigger cascading actions when records change. Automatically clean up empty containers or sync changes to external systems while preserving history.\nSource awareness\nApply different validation rules for local operations or collaborative updates.',
	},
	'/features/programmatic-control/state-management-and-control': {
		slug: 'state-management-and-control',
		parentSlug: 'programmatic-control',
		text: 'State management and control\nTake full programmatic control of your canvas with signals-based reactivity state system.\nLifecycle hooks\nQuery shapes, pages, and assets through a consistent API with automatic relationship management and referential integrity.\nReactive signals system\nTrack dependency automatically with fine-grained reactivity that only updates components when their specific data changes.\nComputed properties\nDerive new data from canvas state that updates automatically when dependencies change. Build dynamic UI panels, analytics dashboards, and custom views that stay in sync effortlessly.\nReal-time synchronization\nEnjoy a built-in support for collaborative editing with conflict resolution and state reconciliation across multiple users and devices.',
	},
	'/features/programmatic-control/creating-and-updating-shapes': {
		slug: 'creating-and-updating-shapes',
		parentSlug: 'programmatic-control',
		text: "Create and update shapes with complete control\nCreate and update shapes with automatic handling of positioning, parenting, and batch operations, even in complex scenarios.\nPartial updates\nShape properties with partial objects that merge with existing data. Perfect for building reactive applications where shapes respond to data changes or user interactions.\nType-safe creation\nCreate shapes programmatically with automatic IDs, parent detection, and property validation. The system applies editor styles and keeps layer ordering consistent.\nCoordinate transforms\nAutomatic coordinate space conversion between page, parent, and local coordinates. Build applications that position shapes precisely without manual transform calculations.\nSmart parenting\nAutomatic parent detection based on shape positioning and containment rules. Shapes find appropriate containers while respecting type compatibility and hierarchy constraints.\nSolid engineering\nOur team spent years to get all the details right, so you don't have to.\nAutomatic parent detection\nThe creation system processes shapes through validation, parent assignment, coordinate transformation, and property merging. Shapes receive auto-generated IDs if none are provided, determine their parents based on position and containment rules, and are placed at the correct z-index in the hierarchy.\nLock enforcement and validation\nShape updates use partial objects that merge with existing shape data while respecting lock states and maintaining referential integrity.\nAutomatic transforms\nThe transform system manages conversions between page space, parent space, and shape-local coordinates using cached transformation matrices.",
	},
	'/features/programmatic-control/viewport-and-camera-control': {
		slug: 'viewport-and-camera-control',
		parentSlug: 'programmatic-control',
		text: 'Navigate your canvas with precision control\nProgrammatically control smooth camera movement, intelligent zoom controls, and flexible viewport constraints that guide users exactly where they need to go.\nProgrammatic navigation\nControl camera position and zoom with smooth animations and precise positioning. Set coordinates, center on content, or create guided navigation experiences programmatically.\nControlled constraints\nDefine viewport bounds, zoom limits, and pan restrictions to keep content within specific areas. Perfect for building focused experiences with guided navigation flows.\nCoordinate transforms\nAutomatic conversion between screen, viewport, and page coordinate systems for accurate positioning and hit detection without manual calculations.\nZoom intelligence\nAutomatic zoom-to-fit functionality with configurable zoom steps and base zoom calculations. Perfect for building applications that frame content intelligently.',
	},
	'/features/customization/custom-shapes-and-tools': {
		slug: 'custom-shapes-and-tools',
		parentSlug: 'customization',
		text: "Custom shapes and tools\nTailor canvas apps to your domain with the tldraw SDK's shapes and custom tools.\nComplete UI control\nBuild fully branded applications. Replace any interface element, from individual toolbar buttons to entire panels, while keeping tldraw's interaction logic.\nShape utilities\nDefine custom behavior through shape utility classes that handle rendering, geometry, and user interactions.\nBinding relationships\nConnect shapes with automatic relationship management that survives editing, copying, and collaborative changes. Perfect for building flowcharts, org charts, and architectural diagrams.\nState machine tools\nBuild custom interactions, multi-step operations, and precise event handling via hierarchical state machines that guide users through complex workflows.",
	},
	'/features/customization/custom-user-interface-components': {
		slug: 'custom-user-interface-components',
		parentSlug: 'customization',
		text: 'Make it your own\nReplace every interface element with React components that match your brand.\nComponent overrides\nReplace any UI element through simple prop-based component replacement without breaking functionality. Perfect for branded applications that feel completely native.\nCSS variable theming\nCustomize colors, fonts, and spacing through semantic CSS variables, light and dark modes included. Match existing design systems without architectural conflicts.\nMenu customization\nExtend context menus, toolbars, and panels with custom actions and organize them into logical groups. Ideal for domain-specific workflows and shortcuts.\nStyle property system\nCreate shared styling properties that work across multiple shape types for consistent theming and visual unity.\nResponsive layouts\nComponents automatically adapt to different screen sizes with built-in breakpoint handling and mobile-optimized behavior patterns.\nAsset replacement\nReplace icons, fonts, and visual assets with your branded versions while keeping editor functionality intact.',
	},
	'/features/customization/custom-asset-and-content-management': {
		slug: 'custom-asset-and-content-management',
		parentSlug: 'customization',
		text: "Custom asset and content management\nCustomize asset processing, storage, and content workflows for your app.\nFormat-specific handling\nNative support for images, videos, SVGs, and text with extensible APIs for custom formats like 3D models or CAD files.\nFlexible content recognition\nRegister custom handlers that detect and transform any content type into application-specific shapes.\nExtensible processing pipeline\nDefine custom validation, transformation, and optimization rules for each content type.\nIntelligent performance management\nCustomize viewport culling and asset optimization to handle large files, with size limits, progressive loading, and quality tweaks keeping the canvas responsive.\nSolid engineering\nOur team spent years to get all the details right, so you don't have to.\nExternal content handler system\nThe content recognition engine routes dropped or pasted content through your registered handlers. Each handler gets typed content with metadata and context, then returns shape creation instructions.\nAsset storage architecture\nThe asset store interface abstracts storage operations behind a clean API that supports upload, resolution, and removal operations.\nPerformance optimization layer\nViewport culling skips off-screen assets while keeping selected items editable. Uploads apply size and quality adjustments automatically.",
	},
	'/features/composable-primitives': {
		slug: 'composable-primitives',
		parentSlug: null,
		text: "Composable primitives for your infinite canvas\nReliable primitives that work independently or together.\nFreehand drawing\nCreate fluid drawings with pressure-sensitive input and intelligent stroke algorithms, perfect for sketching tools, annotation systems, and creative applications.\nCollaboration UI\nImplement real-time cursors, selections, chat bubbles, and viewport activity, all rendered with smooth animations.\nSmart zoom\nAdd intuitive zooming that steps smoothly in and out, always landing at the right level of detail with content-aware calculations.\nObject alignment\nCreate precise object alignment systems with edge detection, center points, and distribution controls.\nReactive store\nKeep UI, computed values, and business logic in sync by leveraging tldraw's reactive data layer.\nWCAG 2.2 AA compliant\nThe tldraw SDK meets modern accessibility standards, ensuring inclusive interactions and usability for people with diverse abilities.\nAnd so much more\nEvery infinite canvas application requires the same core set of primitives, regardless of your specific use case. These undifferentiated but crucial systems have significant implications for user experience, performance, and scalability. They take months to build correctly but often don't directly contribute to your core value proposition. That's why tldraw takes care of that part.\nMultiplayer collaboration\nThe tldraw sync system takes care of conflict resolution, presence tracking, and connection management.\nDrawing and canvas interactions\nPointer movements, gestures, and key presses are translated into precise, responsive actions on the canvas.\nData management\nThe reactive store handles automatic subscriptions, efficient updates, and type-safe operations across your entire canvas.\nCamera and viewport\nThe camera system delivers smooth zooming, infinite panning, and precise coordinates for fluid navigation.\nLayout and composition\nThe geometry system computes bounds automatically, snaps objects into place intelligently, and keeps layouts precise.\nSelection and transformation\nUsers can select multiple shapes, drag handles to resize or rotate, and apply batch operations with familiar keyboard modifiers.\nAccessibility\nScreen reader support, keyboard navigation, and semantic shape descriptions make canvas apps usable for everyone.\nUser interface and menus\nEvery UI component can be customized or replaced.",
	},
	'/features/programmatic-control': {
		slug: 'programmatic-control',
		parentSlug: null,
		text: "Drive the canvas\nSkip building basic editor APIs and start with tldraw's comprehensive runtime controls.\nShape operations\nCreate, modify, and remove shapes programmatically with full validation and consistency.\nLifecycle hooks\nCapture create, update, and delete operations before or after they run.\nProgrammatic navigation\nControl camera position and zoom with smooth animations and precise positioning.\nReal-time synchronization\nEnjoy built-in support for collaborative editing with conflict resolution and state reconciliation.\nAnd so much more\nCreate, update, and orchestrate canvas interactions through clean, reactive methods that scale from simple automation to complex workflows.\nRuntime editor API\nA single Editor instance gives you full programmatic control over the canvas.\nEvent handling\nThe event system lets you hook into every interaction and canvas change.\nState management and control\nReactive state management keeps the canvas and your application in sync.\nCreating and updating shapes\nUse clean APIs to generate shapes from data, automate layouts, and run complex transformations.\nViewport and camera control\nProgrammatic camera control lets you guide navigation, focus attention, and build dynamic presentations.",
	},
	'/features/customization': {
		slug: 'customization',
		parentSlug: null,
		text: 'Strong defaults. Highly customizable\nCustomize or extend nearly every part of the tldraw SDK.\nComponent overrides\nReplace any UI element through simple prop-based component replacement without breaking functionality.\nCSS variable theming\nCustomize colors, fonts, and spacing through semantic CSS variables, light and dark modes included.\nState machine tools\nBuild custom interactions, multi-step operations, and precise event handling via hierarchical state machines.\nShape utilities\nDefine custom behavior through shape utility classes that handle rendering, geometry, and user interactions.\nFormat-specific handling\nConnect shapes with automatic relationship management that survives editing, copying, and collaborative changes.\nFlexible content recognition\nRegister custom handlers that detect and transform any content type into application-specific shapes.\nAnd so much more\nYou can replace or enrich shapes with your own designs, swap out UI components to match your brand, or build entirely new tools for your specific use case.\nCustom shapes and tools\nBuild shapes that fit your domain requirements.\nCustom user interface components\nEvery interface element can be replaced, modified, or removed entirely.\nCustom asset and content management\nRegister custom handlers that detect and transform any content type into application-specific shapes.',
	},
	'/features/out-of-the-box-whiteboard': {
		slug: 'out-of-the-box-whiteboard',
		parentSlug: null,
		text: 'Save months of work with our ready-to-use whiteboard kit\nThe tldraw SDK gives you a production-ready foundation out of the box. Skip the canvas setup and focus on what makes your product unique.\nAll the essentials built in\nSelect tool: Multi-select, resizing and rotation. Hand tool: Smooth pan and zoom navigation. Draw tool: Pressure-sensitive freehand drawing. Eraser tool: Precise shape deletion. Arrow tool: Smart connectors; sticking to shapes. Text tool: Rich formatting and inline editing. Note tool: Commenting with sticky notes. Geometry tool: Quick creation of geometric shapes.\nRich text editing\nFull text editing with formatting, perfect for labelling diagrams or capturing meeting notes.\nFreehand drawing\nFluid, natural drawing that responds to pressure and feels like pen on paper across all devices.\nCollaboration-ready\nLive cursors, user presence and conflict-free syncing bring teams together.\nNavigation and camera controls\nZoom controls: Precise zoom in/out with fit-to-screen options. Smart camera: Auto-focus on selections and smooth following. Alignment guides: Smart snapping and alignment helpers. Mini map: Overview navigation for large canvases. Focus mode: Hide the UI to bring focus to canvas contents. Grid and rulers: Optional overlays for precise positioning.\nComplete shape library\nRectangles, circles, triangles, and a full suite of shapes for diagramming. Sticky notes with clone handles and smart placement. Freehand drawing and highlighter tools. Smart arrows that connect to shapes and update automatically. Videos, images and GIFs that can be arranged and annotated like any other shape. 18 built-in embed types including YouTube, Figma and Google Maps.\nTop benefits from the first line of code\nPerformance at scale: Viewport culling, efficient shape batching, smooth interactions with thousands of shapes, memory management. Reliable persistence: Automatic undo/redo, conflict-free collaborative editing, incremental saves and data migration, robust error handling. Great developer experience: Full TypeScript definitions, comprehensive React integration, extensive documentation and examples, debug views.',
	},
}

// --- Main ---

async function main() {
	console.log('=== Feature page body content → Sanity migration ===')
	console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`)
	console.log(`Dataset: ${process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'}`)
	console.log(`Pages to process: ${Object.keys(pages).length}`)

	let updated = 0
	let created = 0

	for (const [path, page] of Object.entries(pages)) {
		const { slug, parentSlug, text } = page

		// Reset key counter for each page to keep keys deterministic
		keyCounter = 0

		const body = textToPortableText(text, slug)
		const docId = `featurePage-${slug}`

		// Check if the document already exists (from seed-features.ts)
		const existing = await client.getDocument(docId)

		if (existing) {
			// Patch body onto existing document
			try {
				await client.patch(docId).set({ body }).commit()
				console.log(`  [patch]  ${path} → ${docId}`)
				updated++
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : String(err)
				console.error(`  [error]  Failed to patch ${docId}: ${message}`)
			}
		} else {
			// Create new document with correct fields
			const lines = text.split('\n').filter((line) => line.trim().length > 0)
			const title = lines[0] || slug
			const description = lines[1] || ''

			const doc: Record<string, unknown> = {
				_type: 'featurePage',
				_id: docId,
				title,
				slug: { _type: 'slug', current: slug },
				description,
				body,
			}

			if (parentSlug) {
				doc.category = 'capability'
				doc.parentGroup = parentSlug
			}

			await client.createOrReplace(doc)
			console.log(`  [create] ${path} → ${docId}`)
			created++
		}
	}

	console.log(`\n=== Migration complete ===`)
	console.log(`  Updated: ${updated} existing pages`)
	console.log(`  Created: ${created} sub-pages`)
}

main().catch((err) => {
	console.error('Migration failed:', err)
	process.exit(1)
})
