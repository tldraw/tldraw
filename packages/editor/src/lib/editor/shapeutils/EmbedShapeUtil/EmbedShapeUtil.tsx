/* eslint-disable react-hooks/rules-of-hooks */
import { toDomPrecision } from '@tldraw/primitives'
import {
	TLEmbedShape,
	TLEmbedShapePermissions,
	embedShapePermissionDefaults,
} from '@tldraw/tlschema'
import * as React from 'react'
import { useMemo } from 'react'
import { useValue } from 'signia-react'
import { DefaultSpinner } from '../../../components/DefaultSpinner'
import { HTMLContainer } from '../../../components/HTMLContainer'
import { ROTATING_SHADOWS } from '../../../constants'
import { useIsEditing } from '../../../hooks/useIsEditing'
import { rotateBoxShadow } from '../../../utils/dom'
import { getEmbedInfo, getEmbedInfoUnsafely } from '../../../utils/embeds'
import { BaseBoxShapeUtil } from '../BaseBoxShapeUtil'
import { TLOnResizeHandler, TLShapeUtilFlag } from '../ShapeUtil'
import { resizeBox } from '../shared/resizeBox'

const getSandboxPermissions = (permissions: TLEmbedShapePermissions) => {
	return Object.entries(permissions)
		.filter(([_perm, isEnabled]) => isEnabled)
		.map(([perm]) => perm)
		.join(' ')
}

/** @public */
export class EmbedShapeUtil extends BaseBoxShapeUtil<TLEmbedShape> {
	static override type = 'embed' as const

	override canUnmount: TLShapeUtilFlag<TLEmbedShape> = () => false
	override canResize = (shape: TLEmbedShape) => {
		const result = getEmbedInfo(shape.props.url)
		return !!result?.definition?.doesResize
	}

	override hideSelectionBoundsBg: TLShapeUtilFlag<TLEmbedShape> = (shape) => !this.canResize(shape)
	override hideSelectionBoundsFg: TLShapeUtilFlag<TLEmbedShape> = (shape) => !this.canResize(shape)

	override canEdit: TLShapeUtilFlag<TLEmbedShape> = () => true

	override defaultProps(): TLEmbedShape['props'] {
		return {
			w: 300,
			h: 300,
			url: '',
			doesResize: true,
		}
	}

	isAspectRatioLocked: TLShapeUtilFlag<TLEmbedShape> = (shape) => {
		const embedInfo = getEmbedInfo(shape.props.url)
		return embedInfo?.definition.isAspectRatioLocked ?? false
	}

	onResize: TLOnResizeHandler<TLEmbedShape> = (shape, info) => {
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

	render(shape: TLEmbedShape) {
		const { w, h, url } = shape.props
		const isEditing = useIsEditing(shape.id)
		const embedInfo = useMemo(() => getEmbedInfoUnsafely(url), [url])

		const isHoveringWhileEditingSameShape = useValue(
			'is hovering',
			() => {
				const { editingId, hoveredId } = this.editor.pageState

				if (editingId && hoveredId !== editingId) {
					const editingShape = this.editor.getShapeById(editingId)
					if (editingShape && editingShape.type === 'embed') {
						return true
					}
				}
				return false
			},
			[]
		)

		const pageRotation = this.editor.getPageRotation(shape)

		const isInteractive = isEditing || isHoveringWhileEditingSameShape

		if (embedInfo?.definition.type === 'github_gist') {
			const idFromGistUrl = embedInfo.url.split('/').pop()
			if (idFromGistUrl) {
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
		}

		const sandbox = getSandboxPermissions({
			...embedShapePermissionDefaults,
			...(embedInfo?.definition.overridePermissions ?? {}),
		})

		return (
			<HTMLContainer className="tl-embed-container" id={shape.id}>
				{embedInfo?.definition ? (
					<iframe
						className={`tl-embed tl-embed-${shape.id}`}
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
							boxShadow: rotateBoxShadow(pageRotation, ROTATING_SHADOWS),
							borderRadius: embedInfo?.definition.overrideOutlineRadius ?? 8,
							background: embedInfo?.definition.backgroundColor,
						}}
					/>
				) : (
					<g transform={`translate(${(w - 38) / 2}, ${(h - 38) / 2})`}>
						<DefaultSpinner />
					</g>
				)}
			</HTMLContainer>
		)
	}

	indicator(shape: TLEmbedShape) {
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
	const rIframe = React.useRef<HTMLIFrameElement>(null)

	const fileArg = file ? `?file=${file}` : ''
	const gistLink = `https://gist.github.com/${id}.js${fileArg}`

	return (
		<iframe
			ref={rIframe}
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
				boxShadow: rotateBoxShadow(pageRotation, ROTATING_SHADOWS),
			}}
			srcDoc={`
			<html>
				<head>
					<base target="_blank">
				</head>
				<body>
					<script src=${gistLink}></script>
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
