/* eslint-disable react-hooks/rules-of-hooks */

import {
	BaseBoxShapeUtil,
	HTMLContainer,
	TLEmbedShape,
	TLEmbedShapePermissions,
	TLOnResizeHandler,
	TLShapeUtilFlag,
	embedShapeMigrations,
	embedShapePermissionDefaults,
	embedShapeProps,
	toDomPrecision,
	useIsEditing,
	useValue,
} from '@tldraw/editor'
import { useMemo } from 'react'
import { getEmbedInfo, getEmbedInfoUnsafely } from '../../utils/embeds/embeds'
import { resizeBox } from '../shared/resizeBox'
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

	override hideSelectionBoundsFg: TLShapeUtilFlag<TLEmbedShape> = (shape) => !this.canResize(shape)
	override canEdit: TLShapeUtilFlag<TLEmbedShape> = () => true
	override canUnmount: TLShapeUtilFlag<TLEmbedShape> = (shape: TLEmbedShape) => {
		return !!getEmbedInfo(shape.props.url)?.definition?.canUnmount
	}
	override canResize = (shape: TLEmbedShape) => {
		return !!getEmbedInfo(shape.props.url)?.definition?.doesResize
	}
	override canEditInReadOnly = () => true

	override getDefaultProps(): TLEmbedShape['props'] {
		return {
			w: 300,
			h: 300,
			url: '',
		}
	}

	override isAspectRatioLocked: TLShapeUtilFlag<TLEmbedShape> = (shape) => {
		const embedInfo = getEmbedInfo(shape.props.url)
		return embedInfo?.definition.isAspectRatioLocked ?? false
	}

	override onResize: TLOnResizeHandler<TLEmbedShape> = (shape, info) => {
		const isAspectRatioLocked = this.isAspectRatioLocked(shape)
		const embedInfo = getEmbedInfo(shape.props.url)
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
		const { w, h, url } = shape.props
		const isEditing = useIsEditing(shape.id)
		const embedInfo = useMemo(() => getEmbedInfoUnsafely(url), [url])

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

		const isInteractive = isEditing || isHoveringWhileEditingSameShape

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
						frameBorder="0"
						referrerPolicy="no-referrer-when-downgrade"
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
		const embedInfo = useMemo(() => getEmbedInfo(shape.props.url), [shape.props.url])
		return (
			<rect
				width={toDomPrecision(shape.props.w)}
				height={toDomPrecision(shape.props.h)}
				rx={embedInfo?.definition.overrideOutlineRadius ?? 8}
				ry={embedInfo?.definition.overrideOutlineRadius ?? 8}
			/>
		)
	}
}

function Gist({
	id,
	file,
	isInteractive,
	width,
	height,
	style,
	pageRotation,
}: {
	id: string
	file?: string
	isInteractive: boolean
	width: number
	height: number
	pageRotation: number
	style?: React.CSSProperties
}) {
	return (
		<iframe
			className="tl-embed"
			draggable={false}
			width={toDomPrecision(width)}
			height={toDomPrecision(height)}
			frameBorder="0"
			scrolling="no"
			seamless
			referrerPolicy="no-referrer-when-downgrade"
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
					<script src=${`https://gist.github.com/${id}.js${file ? `?file=${file}` : ''}`}></script>
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
