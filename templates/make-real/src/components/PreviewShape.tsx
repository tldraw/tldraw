/* eslint-disable react-hooks/rules-of-hooks */
import { ReactElement } from 'react'
import {
	BaseBoxShapeUtil,
	DefaultSpinner,
	HTMLContainer,
	RecordProps,
	SvgExportContext,
	T,
	TldrawUiIcon,
	TLShape,
	toDomPrecision,
	useIsEditing,
	useToasts,
	useValue,
	Vec,
} from 'tldraw'

export const PREVIEW_SHAPE_TYPE = 'response'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[PREVIEW_SHAPE_TYPE]: {
			html: string
			w: number
			h: number
		}
	}
}

export type PreviewShape = TLShape<typeof PREVIEW_SHAPE_TYPE>

export class PreviewShapeUtil extends BaseBoxShapeUtil<PreviewShape> {
	static override type = PREVIEW_SHAPE_TYPE
	static override props: RecordProps<PreviewShape> = {
		html: T.string,
		w: T.number,
		h: T.number,
	}

	getDefaultProps(): PreviewShape['props'] {
		return {
			html: '',
			w: (960 * 2) / 3,
			h: (540 * 2) / 3,
		}
	}

	override canEdit() {
		return true
	}
	override isAspectRatioLocked() {
		return false
	}
	override canResize() {
		return true
	}

	override component(shape: PreviewShape) {
		const isEditing = useIsEditing(shape.id)
		const toast = useToasts()

		const boxShadow = useValue(
			'box shadow',
			() => {
				const rotation = this.editor.getShapePageTransform(shape)!.rotation()
				return getRotatedBoxShadow(rotation)
			},
			[this.editor]
		)

		// We inject a small script so the iframe can produce a screenshot when the
		// shape is exported, and so that pinch-zoom inside the iframe is disabled.
		const htmlToUse = shape.props.html.replace(
			`</body>`,
			`<script src="https://unpkg.com/html2canvas"></script><script>
			window.addEventListener('message', function(event) {
				if (event.data.action === 'take-screenshot' && event.data.shapeid === "${shape.id}") {
					html2canvas(document.body, { useCors: true }).then(function(canvas) {
						const data = canvas.toDataURL('image/png');
						window.parent.postMessage({ screenshot: data, shapeid: "${shape.id}" }, "*");
					});
				}
			}, false);
			document.body.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); return }, { passive: false })
			</script>
</body>`
		)

		return (
			<HTMLContainer className="tl-embed-container" id={shape.id}>
				{htmlToUse ? (
					<iframe
						id={`iframe-1-${shape.id}`}
						srcDoc={htmlToUse}
						width={toDomPrecision(shape.props.w)}
						height={toDomPrecision(shape.props.h)}
						draggable={false}
						style={{
							pointerEvents: isEditing ? 'auto' : 'none',
							boxShadow,
							border: '1px solid var(--color-panel-contrast)',
							borderRadius: 'var(--radius-2)',
						}}
					/>
				) : (
					<div
						style={{
							width: '100%',
							height: '100%',
							backgroundColor: 'var(--color-muted-2)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							border: '1px solid var(--color-muted-1)',
						}}
					>
						<DefaultSpinner />
					</div>
				)}
				<div
					style={{
						position: 'absolute',
						top: 0,
						right: -40,
						height: 40,
						width: 40,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						cursor: 'pointer',
						pointerEvents: 'all',
					}}
					onClick={() => {
						if (navigator?.clipboard) {
							navigator.clipboard.writeText(shape.props.html)
							toast.addToast({
								icon: 'duplicate',
								title: 'Copied to clipboard',
							})
						}
					}}
					onPointerDown={(e) => this.editor.markEventAsHandled(e)}
				>
					<TldrawUiIcon icon="duplicate" label="Copy HTML" />
				</div>
				{htmlToUse && (
					<div
						style={{
							textAlign: 'center',
							position: 'absolute',
							bottom: isEditing ? -40 : 0,
							padding: 4,
							fontFamily: 'inherit',
							fontSize: 12,
							left: 0,
							width: '100%',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							pointerEvents: 'none',
						}}
					>
						<span
							style={{
								background: 'var(--color-panel)',
								padding: '4px 12px',
								borderRadius: 99,
								border: '1px solid var(--color-muted-1)',
							}}
						>
							{isEditing ? 'Click the canvas to exit' : 'Double click to interact'}
						</span>
					</div>
				)}
			</HTMLContainer>
		)
	}

	override toSvg(shape: PreviewShape, _ctx: SvgExportContext) {
		// Ask the iframe for a fresh screenshot, then render it as an <image>.
		return new Promise<ReactElement>((resolve, reject) => {
			if (typeof window === 'undefined') {
				reject(new Error('window is undefined'))
				return
			}

			const windowListener = (event: MessageEvent) => {
				if (event.data.screenshot && event.data?.shapeid === shape.id) {
					window.removeEventListener('message', windowListener)
					clearTimeout(timeOut)
					resolve(<PreviewImage href={event.data.screenshot} shape={shape} />)
				}
			}

			const timeOut = setTimeout(() => {
				window.removeEventListener('message', windowListener)
				reject(new Error('Screenshot timed out'))
			}, 2000)

			window.addEventListener('message', windowListener)

			const firstLevelIframe = document.getElementById(
				`iframe-1-${shape.id}`
			) as HTMLIFrameElement | null
			if (firstLevelIframe) {
				firstLevelIframe.contentWindow?.postMessage(
					{ action: 'take-screenshot', shapeid: shape.id },
					'*'
				)
			} else {
				reject(new Error('First level iframe not found or not accessible'))
			}
		})
	}

	override getIndicatorPath(shape: PreviewShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

function getRotatedBoxShadow(rotation: number) {
	return ROTATING_BOX_SHADOWS.map((shadow) => {
		const { offsetX, offsetY, blur, spread, color } = shadow
		const vec = new Vec(offsetX, offsetY)
		const { x, y } = vec.rot(-rotation)
		return `${x}px ${y}px ${blur}px ${spread}px ${color}`
	}).join(', ')
}

function PreviewImage({ shape, href }: { shape: PreviewShape; href: string }) {
	return <image href={href} width={shape.props.w.toString()} height={shape.props.h.toString()} />
}

const ROTATING_BOX_SHADOWS = [
	{
		offsetX: 0,
		offsetY: 2,
		blur: 4,
		spread: -1,
		color: '#0000003a',
	},
	{
		offsetX: 0,
		offsetY: 3,
		blur: 12,
		spread: -2,
		color: '#0000001f',
	},
]
