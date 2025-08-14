/* eslint-disable react-hooks/rules-of-hooks */

import {
	BaseBoxShapeUtil,
	HTMLContainer,
	TLEmbedShape,
	TLEmbedShapeProps,
	TLResizeInfo,
	embedShapeMigrations,
	embedShapeProps,
	lerp,
	resizeBox,
	toDomPrecision,
	useIsEditing,
	useSvgExportContext,
	useValue,
} from '@tldraw/editor'

import {
	DEFAULT_EMBED_DEFINITIONS,
	EmbedDefinition,
	TLEmbedDefinition,
	TLEmbedShapePermissions,
	embedShapePermissionDefaults,
} from '../../defaultEmbedDefinitions'
import { TLEmbedResult, getEmbedInfo } from '../../utils/embeds/embeds'
import { getRotatedBoxShadow } from '../shared/rotated-box-shadow'

const getSandboxPermissions = (permissions: TLEmbedShapePermissions) => {
	return Object.entries(permissions)
		.filter(([_perm, isEnabled]) => isEnabled)
		.map(([perm]) => perm)
		.join(' ')
}

/** @public */
export class EmbedShapeUtil extends BaseBoxShapeUtil<TLEmbedShape> {
	static override type = 'embed' as const
	static override props = embedShapeProps
	static override migrations = embedShapeMigrations
	private static embedDefinitions: readonly EmbedDefinition[] = DEFAULT_EMBED_DEFINITIONS

	static setEmbedDefinitions(embedDefinitions: readonly TLEmbedDefinition[]) {
		EmbedShapeUtil.embedDefinitions = embedDefinitions
	}

	getEmbedDefinitions(): readonly TLEmbedDefinition[] {
		return EmbedShapeUtil.embedDefinitions
	}

	getEmbedDefinition(url: string): TLEmbedResult {
		return getEmbedInfo(EmbedShapeUtil.embedDefinitions, url)
	}

	override getText(shape: TLEmbedShape) {
		return shape.props.url
	}

	override getAriaDescriptor(shape: TLEmbedShape) {
		const embedInfo = this.getEmbedDefinition(shape.props.url)
		return embedInfo?.definition.title
	}

	override hideSelectionBoundsFg(shape: TLEmbedShape) {
		return !this.canResize(shape)
	}
	override canEdit() {
		return true
	}
	override canResize(shape: TLEmbedShape) {
		return !!this.getEmbedDefinition(shape.props.url)?.definition?.doesResize
	}
	override canEditInReadonly() {
		return true
	}

	override getDefaultProps(): TLEmbedShape['props'] {
		return {
			w: 300,
			h: 300,
			url: '',
		}
	}

	override isAspectRatioLocked(shape: TLEmbedShape) {
		const embedInfo = this.getEmbedDefinition(shape.props.url)
		return embedInfo?.definition.isAspectRatioLocked ?? false
	}

	override onResize(shape: TLEmbedShape, info: TLResizeInfo<TLEmbedShape>) {
		const isAspectRatioLocked = this.isAspectRatioLocked(shape)
		const embedInfo = this.getEmbedDefinition(shape.props.url)
		let minWidth = embedInfo?.definition.minWidth ?? 200
		let minHeight = embedInfo?.definition.minHeight ?? 200
		if (isAspectRatioLocked) {
			// Enforce aspect ratio
			// Neither the width or height can be less than 200
			const aspectRatio = shape.props.w / shape.props.h
			if (aspectRatio > 1) {
				// Landscape
				minWidth *= aspectRatio
			} else {
				// Portrait
				minHeight /= aspectRatio
			}
		}

		return resizeBox(shape, info, { minWidth, minHeight })
	}

	override component(shape: TLEmbedShape) {
		const svgExport = useSvgExportContext()
		const { w, h, url } = shape.props
		const isEditing = useIsEditing(shape.id)

		const embedInfo = this.getEmbedDefinition(url)

		const isHoveringWhileEditingSameShape = useValue(
			'is hovering',
			() => {
				const { editingShapeId, hoveredShapeId } = this.editor.getCurrentPageState()

				if (editingShapeId && hoveredShapeId !== editingShapeId) {
					const editingShape = this.editor.getShape(editingShapeId)
					if (editingShape && this.editor.isShapeOfType<TLEmbedShape>(editingShape, 'embed')) {
						return true
					}
				}

				return false
			},
			[]
		)

		const pageRotation = this.editor.getShapePageTransform(shape)!.rotation()

		if (svgExport) {
			// for SVG exports, we show a blank embed
			return (
				<HTMLContainer className="tl-embed-container" id={shape.id}>
					<div
						className="tl-embed"
						style={{
							border: 0,
							boxShadow: getRotatedBoxShadow(pageRotation),
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

		if (embedInfo?.definition.type === 'github_gist') {
			const idFromGistUrl = embedInfo.url.split('/').pop()
			if (!idFromGistUrl) throw Error('No gist id!')

			return (
				<HTMLContainer className="tl-embed-container" id={shape.id}>
					<Gist
						id={idFromGistUrl}
						width={toDomPrecision(w)!}
						height={toDomPrecision(h)!}
						isInteractive={isInteractive}
						pageRotation={pageRotation}
					/>
				</HTMLContainer>
			)
		}

		const sandbox = getSandboxPermissions({
			...embedShapePermissionDefaults,
			...(embedInfo?.definition.overridePermissions ?? {}),
		})

		return (
			<HTMLContainer className="tl-embed-container" id={shape.id}>
				{embedInfo?.definition ? (
					<iframe
						className="tl-embed"
						sandbox={sandbox}
						src={embedInfo.embedUrl}
						width={toDomPrecision(w)}
						height={toDomPrecision(h)}
						draggable={false}
						// eslint-disable-next-line @typescript-eslint/no-deprecated
						frameBorder="0"
						referrerPolicy="no-referrer-when-downgrade"
						tabIndex={isEditing ? 0 : -1}
						style={{
							border: 0,
							pointerEvents: isInteractive ? 'auto' : 'none',
							// Fix for safari <https://stackoverflow.com/a/49150908>
							zIndex: isInteractive ? '' : '-1',
							boxShadow: getRotatedBoxShadow(pageRotation),
							borderRadius: embedInfo?.definition.overrideOutlineRadius ?? 8,
							background: embedInfo?.definition.backgroundColor,
						}}
					/>
				) : null}
			</HTMLContainer>
		)
	}

	override indicator(shape: TLEmbedShape) {
		const embedInfo = this.getEmbedDefinition(shape.props.url)
		return (
			<rect
				width={toDomPrecision(shape.props.w)}
				height={toDomPrecision(shape.props.h)}
				rx={embedInfo?.definition.overrideOutlineRadius ?? 8}
				ry={embedInfo?.definition.overrideOutlineRadius ?? 8}
			/>
		)
	}
	override getInterpolatedProps(
		startShape: TLEmbedShape,
		endShape: TLEmbedShape,
		t: number
	): TLEmbedShapeProps {
		return {
			...(t > 0.5 ? endShape.props : startShape.props),
			w: lerp(startShape.props.w, endShape.props.w, t),
			h: lerp(startShape.props.h, endShape.props.h, t),
		}
	}
}

function Gist({
	id,
	isInteractive,
	width,
	height,
	style,
	pageRotation,
}: {
	id: string
	isInteractive: boolean
	width: number
	height: number
	pageRotation: number
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
			draggable={false}
			width={toDomPrecision(width)}
			height={toDomPrecision(height)}
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			frameBorder="0"
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			scrolling="no"
			referrerPolicy="no-referrer-when-downgrade"
			tabIndex={isInteractive ? 0 : -1}
			style={{
				...style,
				pointerEvents: isInteractive ? 'all' : 'none',
				// Fix for safari <https://stackoverflow.com/a/49150908>
				zIndex: isInteractive ? '' : '-1',
				boxShadow: getRotatedBoxShadow(pageRotation),
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
