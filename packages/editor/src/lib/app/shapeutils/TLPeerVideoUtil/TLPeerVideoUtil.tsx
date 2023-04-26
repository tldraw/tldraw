import { toDomPrecision } from '@tldraw/primitives'
import {
	TLPeerVideoShape,
	TLUserPresence,
	peerVideoShapeMigrations,
	peerVideoShapeTypeValidator,
} from '@tldraw/tlschema'
import Peer, { MediaConnection } from 'peerjs'
import * as React from 'react'
import { track } from 'signia-react'
import { HTMLContainer } from '../../../components/HTMLContainer'
import { defineShape } from '../../../config/TLShapeDefinition'
import { useApp } from '../../../hooks/useApp'
import { stopEventPropagation } from '../../../utils/dom'
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
	const { shape } = props
	const app = useApp()

	const presencesQuery = React.useMemo(() => {
		return app.store.query.records('user_presence', () => ({ userId: { neq: app.userId } }))
	}, [app])

	const presences = presencesQuery.value
	const rPresences = React.useRef<TLUserPresence[]>([])
	rPresences.current = presences

	const rVideo = React.useRef<HTMLVideoElement>(null!)
	const [peer, setPeer] = React.useState<Peer | null>(null)

	const slugify = (str?: string) => {
		return str?.replace(/:/g, '-') ?? 'unknown'
	}
	const myUserId = slugify(app.user.id)
	const shapeUserId = slugify(shape.props.userId)

	React.useEffect(() => {
		const peer = new Peer(myUserId)
		setPeer(peer)

		return () => {
			peer.destroy()
		}
	}, [myUserId])

	const [myMediaStream, setMyMediaStream] = React.useState<MediaStream | null>(null)

	React.useEffect(() => {
		if (!peer) return
		if (myUserId === shapeUserId) {
			const videoEl = rVideo.current
			let cancelled = false
			let stream: MediaStream
			const run = async () => {
				stream = await navigator.mediaDevices.getUserMedia({
					video: true,
					// audio: true,
				})

				if (cancelled) return
				const { aspectRatio } = stream.getVideoTracks()[0].getSettings()
				if (aspectRatio) {
					const oldShape = app.getShapeById(shape.id) as TLPeerVideoShape
					if (oldShape) {
						app.updateShapes([
							{
								...oldShape,
								props: {
									...oldShape.props,
									h: oldShape.props.w / aspectRatio,
								},
							},
						])
					}
				}

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
				if (stream) {
					stream.getVideoTracks().forEach((track) => track.stop())
				}
			}
		}
	}, [app, peer, rVideo, myUserId, shapeUserId])

	React.useEffect(() => {
		if (!peer) return

		if (myUserId === shapeUserId) {
			if (!myMediaStream) return

			// Share my mediasteam
			const userIds = rPresences.current.map((p) => slugify(p.userId))
			const calls = userIds.map((userId) => {
				peer.connect(userId)
				return peer.call(userId, myMediaStream)
			})

			return () => {
				calls.forEach((call) => call?.close())
			}
		}
	}, [peer, myUserId, shapeUserId, myMediaStream])

	React.useEffect(() => {
		if (!peer) return

		if (myUserId !== shapeUserId) {
			const videoEl = rVideo.current
			let stream: MediaStream
			const handler = (call: MediaConnection) => {
				call.answer()
				call.on('stream', function (mediasteam) {
					stream = mediasteam
					videoEl.srcObject = stream
					videoEl.onloadedmetadata = () => {
						videoEl.play()
					}
				})
			}

			peer.on('call', handler)
			return () => {
				peer.off('call', handler)
				videoEl.srcObject = null
				if (stream) {
					stream.getVideoTracks().forEach((track) => track.stop())
				}
			}
		}
	}, [peer, myUserId, shapeUserId, myMediaStream])

	const onPnP = () => {
		if (document.pictureInPictureElement) {
			document.exitPictureInPicture()
		} else if (rVideo.current && document.pictureInPictureEnabled) {
			rVideo.current.requestPictureInPicture()
		}
	}

	const [isPnP, setIsPnP] = React.useState(false)

	React.useEffect(() => {
		rVideo.current.addEventListener('enterpictureinpicture', () => {
			setIsPnP(true)
		})
		rVideo.current.addEventListener('leavepictureinpicture', () => {
			setIsPnP(false)
		})
	}, [])

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
					<button
						onPointerDown={stopEventPropagation}
						onPointerUp={stopEventPropagation}
						style={{
							display: 'none',
							position: 'absolute',
							bottom: 10,
							right: 10,
							pointerEvents: 'all',
							WebkitTouchCallout: 'initial',
						}}
						onClick={onPnP}
					>
						{isPnP ? 'EX' : 'PP'}
					</button>
				</div>
			</HTMLContainer>
		</>
	)
})
