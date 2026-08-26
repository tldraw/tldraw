// Maps UI event names to the editor API call that the default UI makes for them. This is only
// for display: the events are already handled by the time `onUiEvent` fires. Not every event
// has a one-line equivalent; those return an empty string. See `TLUiEventMap` for the full list.

const STYLE_PROPS: Record<string, string> = {
	'tldraw:color': 'DefaultColorStyle',
	'tldraw:labelColor': 'DefaultLabelColorStyle',
	'tldraw:dash': 'DefaultDashStyle',
	'tldraw:fill': 'DefaultFillStyle',
	'tldraw:font': 'DefaultFontStyle',
	'tldraw:horizontalAlign': 'DefaultHorizontalAlignStyle',
	'tldraw:verticalAlign': 'DefaultVerticalAlignStyle',
	'tldraw:textAlign': 'DefaultTextAlignStyle',
	'tldraw:size': 'DefaultSizeStyle',
	'tldraw:geo': 'GeoShapeGeoStyle',
	'tldraw:arrowKind': 'ArrowShapeKindStyle',
	'tldraw:arrowheadStart': 'ArrowShapeArrowheadStartStyle',
	'tldraw:arrowheadEnd': 'ArrowShapeArrowheadEndStyle',
	'tldraw:spline': 'LineShapeSplineStyle',
}

const REORDER_METHODS: Record<string, string> = {
	toFront: 'bringToFront',
	forward: 'bringForward',
	backward: 'sendBackward',
	toBack: 'sendToBack',
}

const SELECTION_METHODS: Record<string, string> = {
	'group-shapes': 'groupShapes',
	'ungroup-shapes': 'ungroupShapes',
	'delete-shapes': 'deleteShapes',
	'toggle-lock': 'toggleLock',
	'distribute-shapes': 'distributeShapes',
	'align-shapes': 'alignShapes',
	'stretch-shapes': 'stretchShapes',
	'flip-shapes': 'flipShapes',
	'stack-shapes': 'stackShapes',
}

const USER_PREF_TOGGLES: Record<string, string> = {
	'toggle-snap-mode': 'isSnapMode',
	'toggle-wrap-mode': 'isWrapMode',
	'toggle-dynamic-size-mode': 'isDynamicSizeMode',
	'toggle-paste-at-cursor': 'isPasteAtCursorMode',
	'toggle-keyboard-shortcuts': 'areKeyboardShortcutsEnabled',
	'toggle-invert-zoom': 'isZoomDirectionInverted',
	'toggle-reduce-motion': 'animationSpeed',
	'toggle-edge-scrolling': 'edgeScrollSpeed',
}

const INSTANCE_STATE_TOGGLES: Record<string, string> = {
	'toggle-transparent': 'exportBackground',
	'toggle-tool-lock': 'isToolLocked',
	'toggle-focus-mode': 'isFocusMode',
	'toggle-grid-mode': 'isGridMode',
	'toggle-debug-mode': 'isDebugMode',
}

const ZOOM_METHODS: Record<string, string> = {
	'zoom-in': 'zoomIn',
	'zoom-out': 'zoomOut',
	'reset-zoom': 'resetZoom',
	'zoom-to-fit': 'zoomToFit',
	'zoom-to-selection': 'zoomToSelection',
}

export function getCodeSnippet(name: string, data: any): string {
	switch (name) {
		case 'set-style':
			if (data.id === 'opacity') {
				return `editor.setOpacityForSelectedShapes(${data.value}); editor.setOpacityForNextShapes(${data.value})`
			}
			return `editor.setStyleForSelectedShapes(${STYLE_PROPS[data.id] ?? '?'}, '${data.value}'); editor.setStyleForNextShapes(${STYLE_PROPS[data.id] ?? '?'}, '${data.value}')`
		case 'select-tool':
			if (data.id === 'media') return 'insertMedia()'
			if (data.id.startsWith('geo-')) {
				const geo = data.id.replace('geo-', '')
				return `editor.setStyleForNextShapes(GeoShapeGeoStyle, '${geo}'); editor.setCurrentTool('geo')`
			}
			return `editor.setCurrentTool('${data.id}')`
		case 'rotate-ccw':
		case 'rotate-cw':
			return 'editor.rotateShapesBy(editor.getSelectedShapeIds(), <radians>)'
		case 'reorder-shapes':
			return `editor.${REORDER_METHODS[data.operation] ?? '?'}(editor.getSelectedShapeIds())`
		case 'stack-shapes':
			return `editor.stackShapes(editor.getSelectedShapeIds(), '${data.operation}', editor.options.adjacentShapeMargin)`
		case 'pack-shapes':
			return `editor.packShapes(editor.getSelectedShapeIds(), editor.options.adjacentShapeMargin)`
		case 'duplicate-shapes':
			return `editor.duplicateShapes(editor.getSelectedShapeIds(), { x: <number>, y: <number> })`
		case 'select-all-shapes':
			return `editor.selectAll()`
		case 'select-none-shapes':
			return `editor.selectNone()`
		case 'export-as':
			return `exportAs(editor, editor.getSelectedShapeIds(), { format: '${data.format}' })`
		case 'copy-as':
			return `copyAs(editor, editor.getSelectedShapeIds(), { format: '${data.format}' })`
		case 'undo':
		case 'redo':
			return `editor.${name}()`
		case 'cut':
		case 'copy':
			return `const { ${name} } = useMenuClipboardEvents(); ${name}()`
		case 'paste':
			return `const { paste } = useMenuClipboardEvents(); navigator.clipboard.read().then(paste)`
		case 'print':
			return 'printSelectionOrPages()'
		case 'stop-following':
			return `editor.stopFollowingUser()`
		case 'exit-pen-mode':
			return `editor.updateInstanceState({ isPenMode: false })`
		case 'remove-frame':
			return `removeFrame(editor, editor.getSelectedShapeIds())`
		case 'fit-frame-to-content':
			return `fitFrameToContent(editor, editor.getOnlySelectedShape().id)`
		case 'unlock-all':
			return `editor.updateShapes(editor.getCurrentPageShapes().filter((s) => s.isLocked).map((s) => ({ id: s.id, type: s.type, isLocked: false })))`
		case 'color-scheme':
			return `editor.user.updateUserPreferences({ colorScheme: '${data.value}' })`
	}

	if (name in SELECTION_METHODS) {
		const operation = data.operation !== undefined ? `, '${data.operation}'` : ''
		return `editor.${SELECTION_METHODS[name]}(editor.getSelectedShapeIds()${operation})`
	}

	if (name in ZOOM_METHODS) {
		const point =
			name === 'zoom-in' || name === 'zoom-out' || name === 'reset-zoom' ? 'undefined, ' : ''
		return `editor.${ZOOM_METHODS[name]}(${point}{ animation: { duration: editor.options.animationMediumMs } })`
	}

	if (name in USER_PREF_TOGGLES) {
		return `editor.user.updateUserPreferences({ ${USER_PREF_TOGGLES[name]}: <value> })`
	}

	if (name in INSTANCE_STATE_TOGGLES) {
		const key = INSTANCE_STATE_TOGGLES[name]
		return `editor.updateInstanceState({ ${key}: !editor.getInstanceState().${key} })`
	}

	return ''
}
