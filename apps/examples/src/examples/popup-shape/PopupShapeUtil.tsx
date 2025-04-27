/* eslint-disable react-hooks/rules-of-hooks */
import { useEffect, useRef, useState } from 'react'
import {
	BaseBoxShapeUtil,
	HTMLContainer,
	RecordProps,
	T,
	TLBaseShape,
	stopEventPropagation,
} from 'tldraw'

type IMyPopupShape = TLBaseShape<
	'my-popup-shape',
	{
		w: number
		h: number
		animal: number
	}
>

export class PopupShapeUtil extends BaseBoxShapeUtil<IMyPopupShape> {
	static override type = 'my-popup-shape' as const
	static override props: RecordProps<IMyPopupShape> = {
		w: T.number,
		h: T.number,
		animal: T.number,
	}

	getDefaultProps(): IMyPopupShape['props'] {
		return {
			w: 200,
			h: 200,
			animal: 0,
		}
	}

	component(shape: IMyPopupShape) {
		const [popped, setPopped] = useState(false)

		const ref = useRef<HTMLDivElement>(null)
		const ref2 = useRef<HTMLDivElement>(null)

		useEffect(() => {
			const elm = ref.current
			if (!elm) return
			const elm2 = ref2.current
			if (!elm2) return
			if (popped) {
				// man
				// elm2.style.transform = `rotateX(0deg) translateY(0px) translateZ(0px)`
				// note
				elm.style.transform = `rotateX(0deg) translateY(0px) translateZ(0px)`
			} else {
				// man
				// elm.style.transform = `rotateX(-50deg) translateY(5px) translateZ(0px)`
				// elm2.style.transform = `scaleY(.8)`
				// note
				elm.style.transform = `rotateX(20deg)`
			}
		}, [popped])

		const vpb = this.editor.getViewportPageBounds()
		const spb = this.editor.getShapePageBounds(shape)!
		const px = vpb.midX - spb.midX + spb.w / 2
		const py = vpb.midY - spb.midY + spb.h / 2

		return (
			<HTMLContainer
				style={{
					pointerEvents: 'all',
					perspective: `${Math.max(vpb.w, vpb.h)}px`,
					perspectiveOrigin: `${px}px ${py}px`,
				}}
				onPointerDown={stopEventPropagation}
				onDoubleClick={(e) => {
					setPopped((p) => !p)
					stopEventPropagation(e)
				}}
			>
				<div
					ref={ref2}
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: '100%',
						transition: `all .5s`,
						backgroundSize: 'contain',
						backgroundRepeat: 'no-repeat',
						backgroundPosition: 'center',
						// man
						// transformOrigin: 'bottom center',
						// backgroundImage: `url(/shadow-man.png)`,
						// note
						backgroundColor: 'rgba(0,0,0,.5)',
					}}
				/>
				<div
					ref={ref}
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: '100%',
						transition: `all .5s`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						padding: 16,
						overflow: 'hidden',
						fontFamily: 'tldraw_draw',
						color: '#333',
						fontSize: 24,
						backgroundSize: 'contain',
						backgroundRepeat: 'no-repeat',
						backgroundPosition: 'center',
						transformOrigin: 'top center',
						// man
						// backgroundImage: `url(/man.png)`,
						// transformOrigin: 'bottom center',
						// transform: `rotateX(20deg) translateY(5px) translateZ(40px)`,
						// note
						background: `gold`,
						border: '1px solid goldenrod',
					}}
				>
					{/* {shape.id.slice(-1).toUpperCase()} */}
				</div>
			</HTMLContainer>
		)
	}

	indicator(shape: IMyPopupShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}
