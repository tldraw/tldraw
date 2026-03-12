const STYLE_EVENT = {
	'tldraw:color': 'DefaultColorStyle',
	'tldraw:dash': 'DefaultDashStyle',
	'tldraw:fill': 'DefaultFillStyle',
	'tldraw:font': 'DefaultFontStyle',
	'tldraw:horizontalAlign': 'DefaultHorizontalAlignStyle',
	'tldraw:size': 'DefaultSizeStyle',
	'tldraw:verticalAlign': 'DefaultVerticalAlignStyle',
	'tldraw:geo': 'GeoShapeGeoStyle',
}

const REORDER_EVENT = {
	toFront: 'bringToFront',
	forward: 'bringForward',
	backward: 'sendBackward',
	toBack: 'sendToBack',
}

const SHAPES_META_EVENT = {
	'group-shapes': 'groupShapes',
	'ungroup-shapes': 'ungroupShapes',
	'delete-shapes': 'deleteShapes',
}

const SHAPES_EVENT = {
	'distribute-shapes': 'distributeShapes',
	'align-shapes': 'alignShapes',
	'stretch-shapes': 'stretchShapes',
	'flip-shapes': 'flipShapes',
}

const USER_PREFS_EVENT = {
	'toggle-snap-mode': 'isSnapMode',
	'toggle-dark-mode': 'isDarkMode',
	'toggle-reduce-motion': 'animationSpeed',
	'toggle-edge-scrolling': 'edgeScrollSpeed',
}

const PREFS_EVENT = {
	'toggle-transparent': 'exportBackground',
	'toggle-tool-lock': 'isToolLocked',
	'toggle-focus-mode': 'isFocusMode',
	'toggle-grid-mode': 'isGridMode',
	'toggle-debug-mode': 'isDebugMode',
}

const ZOOM_EVENT = {
	'zoom-in': 'zoomIn',
	'zoom-out': 'zoomOut',
	'reset-zoom': 'resetZoom',
	'zoom-to-fit': 'zoomToFit',
	'zoom-to-selection': 'zoomToSelection',
}

export function getCodeSnippet(name: string, data: any) {
	let codeSnippet = ''

	if (name === 'set-style') {
		if (data.id === 'opacity') {
			codeSnippet = `editor.setOpacityForNextShapes(${data.value});`
		} else {
			codeSnippet = `editor.setStyleForNextShapes(${
				STYLE_EVENT[data.id as keyof typeof STYLE_EVENT] ?? '?'
			}, '${data.value}');`
		}
	} else if (['rotate-ccw', 'rotate-cw'].includes(name)) {
		codeSnippet = 'editor.rotateShapesBy(editor.getSelectedShapeIds(), <number>)'
	} else if (name === 'edit-link') {
		codeSnippet =
			'editor.updateShapes([{ id: editor.getOnlySelectedShape().id, type: editor.getOnlySelectedShape().type, props: { url: <url> }, }, ])'
	} else if (name.startsWith('export-as')) {
		codeSnippet = `exportAs(editor.getSelectedShapeIds(), '${data.format}')`
	} else if (name.startsWith('copy-as')) {
		codeSnippet = `copyAs(editor.getSelectedShapeIds(), '${data.format}')`
	} else if (name === 'select-all-shapes') {
		codeSnippet = `editor.selectAll()`
	} else if (name === 'select-none-shapes') {
		codeSnippet = `editor.selectNone()`
	} else if (name === 'reorder-shapes') {
		codeSnippet = `editor.${
			REORDER_EVENT[data.operation as keyof typeof REORDER_EVENT] ?? '?'
		}(editor.getSelectedShapeIds())`
	} else if (['group-shapes', 'ungroup-shapes', 'delete-shapes'].includes(name)) {
		codeSnippet = `editor.${
			SHAPES_META_EVENT[name as keyof typeof SHAPES_META_EVENT] ?? '?'
		}(editor.getSelectedShapeIds())`
	} else if (name === 'stack-shapes') {
		codeSnippet = `editor.stackShapes(editor.getSelectedShapeIds(), '${data.operation}', 16)`
	} else if (name === 'pack-shapes') {
		codeSnippet = `editor.packShapes(editor.getSelectedShapeIds(), 16)`
	} else if (name === 'duplicate-shapes') {
		codeSnippet = `editor.duplicateShapes(editor.getSelectedShapeIds(), {x: <value>, y: <value>})`
	} else if (name.endsWith('-shapes')) {
		codeSnippet = `editor.${
			SHAPES_EVENT[name as keyof typeof SHAPES_EVENT] ?? '?'
		}(editor.getSelectedShapeIds(), '${data.operation}')`
	} else if (name === 'select-tool') {
		if (data.id === 'media') {
			codeSnippet = 'insertMedia()'
		} else if (data.id.startsWith('geo-')) {
			codeSnippet = `\n  editor.updateInstanceState({
  stylesForNextShape: {
    ...editor.getInstanceState().stylesForNextShape,
    [GeoShapeGeoStyle.id]: '${data.id.replace('geo-', '')}',
  },
}, { ephemeral: true });
editor.setCurrentTool('${data.id}')`
		} else {
			codeSnippet = `editor.setCurrentTool('${data.id}')`
		}
	} else if (name === 'print') {
		codeSnippet = 'printSelectionOrPages()'
	} else if (name === 'unlock-all') {
		codeSnippet = `\n  const updates = [] as TLShapePartial[]
for (const shape of editor.getCurrentPageShapes()) {
  if (shape.isLocked) {
    updates.push({ id: shape.id, type: shape.type, isLocked: false })
  }
}
if (updates.length > 0) {
  editor.updateShapes(updates)
}`
	} else if (['undo', 'redo'].includes(name)) {
		codeSnippet = `editor.${name}()`
	} else if (['cut', 'copy'].includes(name)) {
		codeSnippet = `\n  const { ${name} } = useMenuClipboardEvents();\n  ${name}()`
	} else if (name === 'paste') {
		codeSnippet = `\n  const { paste } = useMenuClipboardEvents();\n  navigator.clipboard?.read().then((clipboardItems) => {\n    paste(clipboardItems)\n  })`
	} else if (name === 'stop-following') {
		codeSnippet = `editor.stopFollowingUser()`
	} else if (name === 'exit-pen-mode') {
		codeSnippet = `editor.updateInstanceState({ isPenMode: false })`
	} else if (name === 'remove-frame') {
		codeSnippet = `removeFrame(editor, editor.getSelectedShapes().map((shape) => shape.id))`
	} else if (name === 'fit-frame-to-content') {
		codeSnippet = `fitFrameToContent(editor, editor.getOnlySelectedShape().id)`
	} else if (name.startsWith('zoom-') || name === 'reset-zoom') {
		codeSnippet = `editor.${ZOOM_EVENT[name as keyof typeof ZOOM_EVENT]}(${
			name !== 'zoom-to-fit' && name !== 'zoom-to-selection'
				? 'editor.getViewportScreenCenter(), '
				: ''
		}{ duration: 320 })`
	} else if (name.startsWith('toggle-')) {
		if (name === 'toggle-lock') {
			codeSnippet = `editor.toggleLock(editor.getSelectedShapeIds())`
		} else {
			const userPrefName = USER_PREFS_EVENT[name as keyof typeof USER_PREFS_EVENT]
			const prefName = PREFS_EVENT[name as keyof typeof PREFS_EVENT]
			codeSnippet = userPrefName
				? `editor.user.updateUserPreferences({ ${userPrefName}: <value> })`
				: `editor.updateInstanceState({ ${prefName}: !editor.getInstanceState().${prefName} })`
		}
	}

	return codeSnippet
}
