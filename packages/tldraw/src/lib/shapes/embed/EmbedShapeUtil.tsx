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
	useColorMode,
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
	unknownEmbedShapePermissionOverrides,
} from '../../defaultEmbedDefinitions'
import { TLEmbedResult, getEmbedInfo } from '../../utils/embeds/embeds'
import { BookmarkShapeComponent } from '../bookmark/BookmarkShapeUtil'
import { ShapeOptionsWithDisplayValues, getDisplayValues } from '../shared/getDisplayValues'
import { getRotatedBoxShadow } from '../shared/rotated-box-shadow'

/** @public */
export interface EmbedShapeUtilDisplayValues {
	showShadow: boolean
}

/** @public */
export interface EmbedShapeOptions extends ShapeOptionsWithDisplayValues<
	TLEmbedShape,
	EmbedShapeUtilDisplayValues
> {
	/** The embed definitions to use for this shape util. */
	readonly embedDefinitions: readonly TLEmbedDefinition[]
}

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

	override options: EmbedShapeOptions = {
		embedDefinitions: DEFAULT_EMBED_DEFINITIONS,
		getDefaultDisplayValues(): EmbedShapeUtilDisplayValues {
			return {
				showShadow: true,
			}
		},
		getCustomDisplayValues(): Partial<EmbedShapeUtilDisplayValues> {
			return {}
		},
	}

	override canEditWhileLocked(shape: TLEmbedShape) {
		const result = this.getEmbedDefinition(shape.props.url)
		if (!result) return true
		return result.definition.canEditWhileLocked ?? true
	}

	private static legacyEmbedDefinitions: readonly EmbedDefinition[] | null = null

	/** @deprecated - Use `EmbedShapeUtil.configure({ embedDefinitions: [...] })` instead. */
	static setEmbedDefinitions(embedDefinitions: readonly EmbedDefinition[]) {
		EmbedShapeUtil.legacyEmbedDefinitions = embedDefinitions
	}

	private getEmbedDefs(): readonly TLEmbedDefinition[] {
		return EmbedShapeUtil.legacyEmbedDefinitions ?? this.options.embedDefinitions
	}

	getEmbedDefinitions(): readonly TLEmbedDefinition[] {
		return this.getEmbedDefs()
	}

	getEmbedDefinition(url: string): TLEmbedResult {
		return getEmbedInfo(this.getEmbedDefs(), url)
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
	override canEdit(shape: TLEmbedShape) {
		return true
	}
	override canResize(shape: TLEmbedShape) {
		return this.getEmbedDefinition(shape.props.url)?.definition?.doesResize ?? true
	}
	override canEditInReadonly(shape: TLEmbedShape) {
		return true
	}

	override getDefaultProps(): TLEmbedShape['props'] {
		return {
			w: 300,
			h: 300,
			url: '',
		}
	}

	override getGeometry(shape: TLEmbedShape) {
		return super.getGeometry(shape)
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
		const colorMode = useColorMode()
		const dv = getDisplayValues(this, shape, colorMode)

		const embedInfo = this.getEmbedDefinition(url)

		const isHoveringWhileEditingSameShape = useValue(
			'is hovering',
			() => {
				const { editingShapeId, hoveredShapeId } = this.editor.getCurrentPageState()

				if (editingShapeId && hoveredShapeId !== editingShapeId) {
					const editingShape = this.editor.getShape(editingShapeId)
					if (editingShape && this.editor.isShapeOfType(editingShape, 'embed')) {
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
	}

	override getIndicatorPath(shape: TLEmbedShape): Path2D {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
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
