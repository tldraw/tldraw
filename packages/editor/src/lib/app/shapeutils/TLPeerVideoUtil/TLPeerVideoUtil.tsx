import { toDomPrecision } from '@tldraw/primitives'
import {
	TLPeerVideoShape,
	peerVideoShapeMigrations,
	peerVideoShapeTypeValidator,
} from '@tldraw/tlschema'
import Peer, { MediaConnection } from 'peerjs'
import * as React from 'react'
import { track } from 'signia-react'
import { HTMLContainer } from '../../../components/HTMLContainer'
import { defineShape } from '../../../config/TLShapeDefinition'
import { useApp } from '../../../hooks/useApp'
import { TLBoxUtil } from '../TLBoxUtil'

/** @public */
export class TLPeerVideoUtil extends TLBoxUtil<TLPeerVideoShape> {
	static type = 'peer-video'

	override canEdit = () => false
	override isAspectRatioLocked = () => true

	override defaultProps(): TLPeerVideoShape['props'] {
		return {
			opacity: '1',
			w: 100,
			h: 100,
			userId: undefined,
		}
	}

	render(shape: TLPeerVideoShape) {
		return <TLPeerVideoUtilComponent shape={shape} videoUtil={this} />
	}

	indicator(shape: TLPeerVideoShape) {
		return <rect width={toDomPrecision(shape.props.w)} height={toDomPrecision(shape.props.h)} />
	}

	toSvg(_shape: TLPeerVideoShape) {
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
		return g
	}
}

/** @public */
export const TLPeerVideoShapeDef = defineShape<TLPeerVideoShape, TLPeerVideoUtil>({
	type: 'peer-video',
	getShapeUtil: () => TLPeerVideoUtil,
	validator: peerVideoShapeTypeValidator,
	migrations: peerVideoShapeMigrations,
})

const TLPeerVideoUtilComponent = track(function TLPeerVideoUtilComponent(props: {
	shape: TLPeerVideoShape
	videoUtil: TLPeerVideoUtil
}) {
	const { shape, videoUtil } = props
	const app = useApp()

	const presencesQuery = React.useMemo(() => {
		return app.store.query.records('user_presence', () => ({ userId: { neq: app.userId } }))
	}, [app])

	const presences = presencesQuery.value

	const rVideo = React.useRef<HTMLVideoElement>(null!)

	const peer = React.useMemo(() => {
		return new Peer(shape.id)
	}, [shape.id])

	const shapeUserId = shape.props.userId
	const myUserId = app.user.id

	const [myMediaStream, setMyMediaStream] = React.useState<MediaStream | null>(null)

	React.useEffect(() => {
		if (myUserId === shapeUserId) {
			const videoEl = rVideo.current
			let cancelled = false
			const run = async () => {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: true,
				})
				if (cancelled) return
				setMyMediaStream(stream)

				videoEl.srcObject = stream
				videoEl.onloadedmetadata = () => {
					videoEl.play()
				}
			}
			run()
			return () => {
				cancelled = true
				videoEl.srcObject = null
			}
		}
	}, [rVideo, myUserId, shapeUserId])

	React.useEffect(() => {
		if (myUserId === shapeUserId) {
			if (!myMediaStream) return

			// Share my mediasteam
			const userIds = presences.map((p) => p.userId)

			const calls = userIds.map((userId) => {
				return peer.call(userId, myMediaStream)
			})

			return () => {
				calls.forEach((call) => call.close())
			}
		} else {
			const handler = (call: MediaConnection) => {
				call.answer()

				call.on('stream', function (mediasteam) {
					setMyMediaStream(mediasteam)
				})
			}
			peer.on('call', handler)
			return () => {
				peer.off('call', handler)
			}
		}
	}, [myUserId, shapeUserId, presences, peer, myMediaStream])

	console.log('peer[%s]=', shape.props.userId, peer)

	return (
		<>
			<HTMLContainer id={shape.id}>
				<div
					style={{
						background: myUserId === shapeUserId ? 'red' : 'black',
						width: shape.props.w,
						height: shape.props.h,
						pointerEvents: 'all',
					}}
				>
					<video ref={rVideo} style={{ width: '100%', height: '100%' }} />
					<div
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							zIndex: 999,
							background: 'white',
						}}
					>
						{myUserId}
					</div>
				</div>
			</HTMLContainer>
		</>
	)
})
