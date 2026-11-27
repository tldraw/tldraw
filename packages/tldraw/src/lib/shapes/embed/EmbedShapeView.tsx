/* eslint-disable react-hooks/rules-of-hooks */
import {
	HTMLContainer,
	TLEmbedShape,
	TLShapeView,
	definePlugin,
	shapeViewSlot,
	toDomPrecision,
	useColorMode,
	useIsEditing,
	useSvgExportContext,
	useValue,
} from '@tldraw/editor'
import {
	TLEmbedShapePermissions,
	embedShapePermissionDefaults,
	unknownEmbedShapePermissionOverrides,
} from '../../defaultEmbedDefinitions'
import { BookmarkShapeComponent } from '../bookmark/BookmarkShapeView'
import { getDisplayValues } from '../shared/getDisplayValues'
import { getRotatedBoxShadow } from '../shared/rotated-box-shadow'
import type { EmbedShapeUtil } from './EmbedShapeUtil'

const getSandboxPermissions = (permissions: TLEmbedShapePermissions) => {
	return Object.entries(permissions)
		.filter(([_perm, isEnabled]) => isEnabled)
		.map(([perm]) => perm)
		.join(' ')
}

/** @public */
export const embedShapeView: TLShapeView<TLEmbedShape, EmbedShapeUtil> = {
	type: 'embed',
	component(shape, util) {
		const svgExport = useSvgExportContext()
		const { w, h, url } = shape.props
		const isEditing = useIsEditing(shape.id)
		const colorMode = useColorMode()
		const dv = getDisplayValues(util, shape, colorMode)

		const embedInfo = util.getEmbedDefinition(url)

		const isHoveringWhileEditingSameShape = useValue(
			'is hovering',
			() => {
				const { editingShapeId, hoveredShapeId } = util.editor.getCurrentPageState()

				if (editingShapeId && hoveredShapeId !== editingShapeId) {
					const editingShape = util.editor.getShape(editingShapeId)
					if (editingShape && util.editor.isShapeOfType(editingShape, 'embed')) {
						return true
					}
				}

				return false
			},
			[]
		)

		const pageRotation = util.editor.getShapePageTransform(shape)!.rotation()

		if (svgExport) {
			// for SVG exports, we show a blank embed
			return (
				<HTMLContainer className="tl-embed-container" id={shape.id}>
					<div
						className="tl-embed"
						style={{
							border: 0,
							boxShadow: dv.showShadow ? getRotatedBoxShadow(pageRotation) : 'none',
							borderRadius: embedInfo?.definition.overrideOutlineRadius ?? 8,
							background: embedInfo?.definition.backgroundColor ?? 'var(--tl-color-background)',
							width: w,
							height: h,
						}}
					/>
				</HTMLContainer>
			)
		}

		const isInteractive = isEditing || isHoveringWhileEditingSameShape

		// Prevent nested embedding of tldraw
		const isIframe =
			typeof window !== 'undefined' && (window !== window.top || window.self !== window.parent)
		if (isIframe && embedInfo?.definition.type === 'tldraw') return null

		const sandbox = getSandboxPermissions({
			...embedShapePermissionDefaults,
			...(embedInfo
				? (embedInfo.definition.overridePermissions ?? {})
				: unknownEmbedShapePermissionOverrides),
		})

		if (embedInfo?.definition.type === 'github_gist') {
			const idFromGistUrl = embedInfo.url.split('/').pop()
			if (!idFromGistUrl) throw Error('No gist id!')

			// Gist embeds use srcDoc, so we must disable allow-same-origin. Otherwise
			// the embedded script shares the parent's origin and can escape the sandbox.
			const gistSandbox = getSandboxPermissions({
				...embedShapePermissionDefaults,
				...(embedInfo?.definition?.overridePermissions ?? {}),
				'allow-same-origin': false,
			})

			return (
				<HTMLContainer className="tl-embed-container" id={shape.id}>
					<Gist
						id={idFromGistUrl}
						sandbox={gistSandbox}
						width={toDomPrecision(w)!}
						height={toDomPrecision(h)!}
						isInteractive={isInteractive}
						pageRotation={pageRotation}
						showShadow={dv.showShadow}
					/>
				</HTMLContainer>
			)
		}

		const iframeSrc = embedInfo?.embedUrl ?? url

		return (
			<HTMLContainer className="tl-embed-container" id={shape.id}>
				{iframeSrc ? (
					<iframe
						className="tl-embed"
						sandbox={sandbox}
						src={iframeSrc}
						width={toDomPrecision(w)}
						height={toDomPrecision(h)}
						draggable={false}
						// eslint-disable-next-line @typescript-eslint/no-deprecated
						frameBorder="0"
						referrerPolicy="strict-origin-when-cross-origin"
						tabIndex={isEditing ? 0 : -1}
						allowFullScreen
						style={{
							border: 0,
							// Fill the container exactly. Relying on the fixed pixel width/height causes
							// the flex-centered iframe to be rounded independently from its box at
							// fractional sizes/zooms, leaving a 1-2px background sliver on one edge.
							width: '100%',
							height: '100%',
							pointerEvents: isInteractive ? 'auto' : 'none',
							// Fix for safari <https://stackoverflow.com/a/49150908>
							zIndex: isInteractive ? '' : '-1',
							boxShadow: dv.showShadow ? getRotatedBoxShadow(pageRotation) : 'none',
							borderRadius: embedInfo?.definition?.overrideOutlineRadius ?? 8,
							background: embedInfo?.definition?.backgroundColor,
						}}
					/>
				) : (
					<BookmarkShapeComponent
						url={url}
						h={h}
						rotation={pageRotation}
						assetId={null}
						showImageContainer={false}
					/>
				)}
			</HTMLContainer>
		)
	},
}

/**
 * Draws embed shapes with {@link embedShapeView}. Importing `tldraw` adds it to
 * `createDefaultPlugins()`, see {@link defaultShapeViewPlugins}.
 *
 * @public
 */
export const embedShapeViewPlugin = definePlugin({
	id: 'embedShapeView',
	setup: (ctx) => void ctx.contribute(shapeViewSlot, embedShapeView),
})

function Gist({
	id,
	sandbox,
	isInteractive,
	width,
	height,
	style,
	pageRotation,
	showShadow,
}: {
	id: string
	sandbox: string
	isInteractive: boolean
	width: number
	height: number
	pageRotation: number
	showShadow: boolean
	style?: React.CSSProperties
}) {
	// Security warning:
	// Gists allow adding .json extensions to the URL which return JSONP.
	// Furthermore, the JSONP can include callbacks that execute arbitrary JavaScript.
	// It _is_ sandboxed by the iframe but we still want to disable it nonetheless.
	// We restrict the id to only allow hexdecimal characters to prevent this.
	// Read more:
	//   https://github.com/bhaveshk90/Content-Security-Policy-CSP-Bypass-Techniques
	//   https://github.com/renniepak/CSPBypass
	if (!id.match(/^[0-9a-f]+$/)) throw Error('No gist id!')

	return (
		<iframe
			className="tl-embed"
			sandbox={sandbox}
			draggable={false}
			width={toDomPrecision(width)}
			height={toDomPrecision(height)}
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			frameBorder="0"
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			scrolling="no"
			referrerPolicy="strict-origin-when-cross-origin"
			tabIndex={isInteractive ? 0 : -1}
			style={{
				...style,
				pointerEvents: isInteractive ? 'all' : 'none',
				// Fix for safari <https://stackoverflow.com/a/49150908>
				zIndex: isInteractive ? '' : '-1',
				boxShadow: showShadow ? getRotatedBoxShadow(pageRotation) : 'none',
			}}
			srcDoc={`
			<html>
				<head>
					<base target="_blank">
				</head>
				<body>
					<script src=${`https://gist.github.com/${id}.js`}></script>
					<style type="text/css">
						* { margin: 0px; }
						table { height: 100%; background-color: red; }
						.gist { background-color: none; height: 100%;  }
						.gist .gist-file { height: calc(100vh - 2px); padding: 0px; display: grid; grid-template-rows: 1fr auto; }
					</style>
				</body>
			</html>`}
		/>
	)
}
