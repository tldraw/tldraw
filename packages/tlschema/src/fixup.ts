import { SerializedStore } from '@tldraw/store'
import { Vec2dModel } from './misc/geometry-types'
import { TLRecord } from './records/TLRecord'

/** @internal */
export function CLIENT_FIXUP_SCRIPT(persistedStore: SerializedStore<TLRecord>) {
	const records = Object.values(persistedStore)

	for (let i = 0; i < records.length; i++) {
		if (!records[i]) continue

		const { record } = fixupRecord(records[i])

		if (record) {
			persistedStore[records[i].id] = record
		} else {
			delete persistedStore[records[i].id]
		}
	}

	return persistedStore
}

/** @internal */
export function fixupRecord(oldRecord: TLRecord) {
	const issues: string[] = []

	let record = JSON.parse(JSON.stringify(oldRecord))

	switch (record.typeName) {
		case 'user_presence': {
			if (!record.cursor) {
				issues.push('no cursor')
				record.cursor = { x: 0, y: 0 }
			}

			if (record.cursor.x === undefined || record.cursor.x === null) {
				issues.push('no cursor x')
				record.cursor.x = 0
			}
			if (record.cursor.y === undefined || record.cursor.y === null) {
				issues.push('no cursor y')
				record.cursor.y = 0
			}

			break
		}

		case 'asset': {
			switch (record.type) {
				case 'image':
				case 'video': {
					if (!record.props) {
						issues.push('no props in asset')
						record.props = {
							w: 100,
							h: 100,
							name: 'old_asset',
							isAnimated: false,
							mimeType: null,
							src: null,
						}
					}

					if (!record.props.mimeType) {
						issues.push('no mimeType in asset props')
						record.props.mimeType = 'image/png'
					}

					if (!record.props.src) {
						issues.push('no src in asset props')
						record.props.src = ''
					}

					if (record.props.isAnimated == null) {
						issues.push('no isAnimated in asset props')
						record.props.isAnimated = false
					}

					if (record.props.name === undefined) {
						record.props.name = 'asset'
					}

					if ('width' in record) {
						issues.push('width in asset')
						record.props.w = record.width
						delete record.width
					}
					if (
						'width' in record.props &&
						typeof record.props.width === 'number' &&
						record.props.width
					) {
						issues.push('no w in asset props')
						record.props.w = record.props.width
						delete record.props.width
					}

					if ('height' in record) {
						issues.push('height in asset')
						record.props.h = record.height
						delete record.height
					}

					if (
						'height' in record.props &&
						typeof record.props.height === 'number' &&
						record.props.height
					) {
						issues.push('no h in asset props')
						record.props.h = record.props.height
						delete record.props.height
					}
					if (!record.props.w) {
						issues.push('no w in asset props')
						record.props.w = 100
					}
					if (!record.props.h) {
						issues.push('no h in asset props')
						record.props.h = 100
					}

					if ('src' in record) {
						issues.push('src in asset')
						record.props.src = record.src
						delete record.src
					}

					if ('name' in record) {
						issues.push('name in asset')
						delete record.name
					}
					break
				}
				case 'bookmark':
					if (!record.props) {
						issues.push('no asset props')
						record.props = {
							title: '',
							description: '',
							image: '',
							src: 'url' in record && typeof record.url === 'string' ? record.url : '',
						}
					}

					if (!record.props.title) {
						issues.push('no title in bookmark asset props')
						record.props.title = ''
					}
					if (!record.props.description) {
						issues.push('no description in bookmark asset props')
						record.props.description = ''
					}
					if (!record.props.image) {
						issues.push('no image in bookmark asset props')
						record.props.image = ''
					}

					if ('src' in record) {
						issues.push('leftover src in bookmark asset')
						delete record.src
					}
					if ('width' in record) {
						issues.push('leftover width in bookmark asset')
						delete record.width
					}
					if ('height' in record) {
						issues.push('leftover height in bookmark asset')
						delete record.height
					}
					if ('name' in record) {
						issues.push('leftover name in bookmark asset')
						delete record.name
					}

					if ('meta' in record) {
						delete record.meta
					}

					break
			}
			break
		}
		case 'camera': {
			if (record.x === undefined || record.x === null) {
				issues.push('no x in camera')
				record.x = 0
			}
			if (record.y === undefined || record.y === null) {
				issues.push('no y in camera')
				record.y = 0
			}
			break
		}
		case 'instance': {
			if ('props' in record) {
				issues.push('leftover props in instance')
				delete record.props
			}

			if (record.isToolLocked === undefined) {
				issues.push('no isToolLocked in instance')
				record.isToolLocked = false
			}

			if (record.propsForNextShape === undefined) {
				issues.push('no props in instance')
				record.propsForNextShape = {
					opacity: '1',
					color: 'black',
					dash: 'draw',
					fill: 'none',
					size: 'm',
					icon: 'file',
					font: 'draw',
					align: 'middle',
					geo: 'rectangle',
					arrowheadStart: 'none',
					arrowheadEnd: 'arrow',
					spline: 'line',
				}
			}

			if ('url' in record.propsForNextShape) {
				issues.push('leftover url in instance.propsForNextShape')
				delete record.propsForNextShape.url
			}

			if ('lang' in record.propsForNextShape) {
				issues.push('leftover lang in instance.propsForNextShape')
				delete record.propsForNextShape.lang
			}

			if (record.exportBackground === undefined) {
				issues.push(`no export background in ${record.typeName}`)
				record.exportBackground = false
			}
			if (record.brush === undefined) {
				issues.push(`no brush in ${record.typeName}`)
				record.brush = null
			}
			if (record.scribble === undefined) {
				issues.push(`no scribble in ${record.typeName}`)
				record.scribble = null
			}

			if (record.dialog !== undefined) {
				issues.push(`no dialog in ${record.typeName}`)
				delete record.dialog
			}

			if (record.screenBounds === undefined) {
				issues.push(`no screen bounds in ${record.typeName}`)
				record.screenBounds = { x: 0, y: 0, w: 1080, h: 720 }
			}

			break
		}
		case 'user': {
			if (!record.name) {
				issues.push(`no name in user`)
				record.name = 'User'
			}
			if (!record.locale) {
				issues.push(`no locale in user`)
				record.locale = 'en'
			}
			if ('cursor' in record) {
				issues.push('leftover cursor in user')
				delete record.cursor
			}
			if ('color' in record) {
				issues.push('leftover color in user')
				delete record.color
			}
			if ('brush' in record) {
				issues.push('leftover brush in user')
				delete record.brush
			}
			if ('selectedIds' in record) {
				issues.push('leftover selectedIds in user')
				delete record.selectedIds
			}
			if ('scribble' in record) {
				issues.push('leftover scribble in user')
				delete record.scribble
			}
			if ('currentPageId' in record) {
				issues.push('leftover currentPageId in user')
				delete record.currentPageId
			}
			break
		}
		case 'user_document': {
			if (record.isMobileMode === undefined) {
				issues.push(`no ismobilemode in user document`)
				record.isMobileMode = false
			}

			if (record.isSnapMode === undefined) {
				issues.push(`no issnapmode in user document`)
				record.isSnapMode = false
			}
			break
		}
		case 'shape': {
			if ('url' in record) {
				delete record.url
			}

			if (record.x === undefined || record.x === null) {
				issues.push(`some bug in ${record.typeName} ${record.type}`)
				record.x = 0
			}
			if (record.y === undefined || record.y === null) {
				issues.push(`some bug in ${record.typeName} ${record.type}`)
				record.y = 0
			}

			if (record.type === 'image') {
				if (record.props.playing === undefined) {
					issues.push(`some bug in ${record.typeName} ${record.type}`)
					record.props.playing = false
				}

				if ('loaded' in record.props) {
					delete record.props.loaded
				}
			}

			if (record.type === 'arrow') {
				if (record.props.start.type === 'binding') {
					if (
						record.props.start.normalizedAnchor.x === undefined ||
						record.props.start.normalizedAnchor.x === null
					) {
						issues.push(`some bug in ${record.typeName} ${record.type}`)
						record.props.start.normalizedAnchor.x = 0
					}
					if (
						record.props.start.normalizedAnchor.y === undefined ||
						record.props.start.normalizedAnchor.y === null
					) {
						issues.push(`some bug in ${record.typeName} ${record.type}`)
						record.props.start.normalizedAnchor.y = 0
					}
				} else {
					if (record.props.start.x === undefined || record.props.start.x === null) {
						issues.push(`some bug in ${record.typeName} ${record.type}`)
						record.props.start.x = 0
					}
					if (record.props.start.y === undefined || record.props.start.y === null) {
						issues.push(`some bug in ${record.typeName} ${record.type}`)
						record.props.start.y = 0
					}
					if ('boundShapeId' in record.props.start) {
						issues.push(`leftover bound shape id in arrow`)
						delete record.props.start.boundShapeId
					}
					if ('normalizedAnchor' in record.props.start) {
						issues.push(`leftover normalize anchor in arrow`)
						delete record.props.start.normalizedAnchor
					}
					if ('isExact' in record.props.start) {
						issues.push(`leftover isExact in arrow`)
						delete record.props.start.isExact
					}
				}

				if (record.props.end.type === 'binding') {
					if (
						record.props.end.normalizedAnchor.x === undefined ||
						record.props.end.normalizedAnchor.x === null
					) {
						issues.push(`some bug in ${record.typeName}  ${record.type}`)
						record.props.end.normalizedAnchor.x = 0
					}
					if (
						record.props.end.normalizedAnchor.y === undefined ||
						record.props.end.normalizedAnchor.y === null
					) {
						issues.push(`some bug in ${record.typeName} ${record.type}`)
						record.props.end.normalizedAnchor.y = 0
					}
				} else {
					if (record.props.end.x === undefined || record.props.end.x === null) {
						issues.push(`no x in arrow end`)
						record.props.end.x = 0
					}
					if (record.props.end.y === undefined || record.props.end.y === null) {
						issues.push(`no y in arrow end`)
						record.props.end.y = 0
					}
					if ('boundShapeId' in record.props.end) {
						issues.push(`leftover bound shape id in arrow`)
						delete record.props.end.boundShapeId
					}
					if ('normalizedAnchor' in record.props.end) {
						issues.push(`leftover normalize anchor in arrow`)
						delete record.props.end.normalizedAnchor
					}
					if ('isExact' in record.props.end) {
						issues.push(`leftover isExact in arrow`)
						delete record.props.end.isExact
					}
				}
			}

			if (
				record.type === 'note' ||
				record.type === 'video' ||
				record.type === 'image' ||
				record.type === 'geo' ||
				record.type === 'bookmark'
			) {
				if (record.props.url === undefined) {
					issues.push(`missing url prop in ${record.type} shape`)
					record.props.url = ''
				}
			}

			if (record.type === 'bookmark') {
				if (record.props.assetId === undefined) {
					issues.push(`some bug in ${record.typeName}  ${record.type}`)
					record.props.assetId = null
				}

				if ('src' in record) {
					issues.push(`leftover src in bookmark`)
					delete record.src
				}
			}

			if (record.type === 'geo') {
				if ('width' in record.props) {
					issues.push(`leftover width in geo`)
					delete record.props.width
				}
				if ('height' in record.props) {
					issues.push(`leftover height in geo`)
					delete record.props.height
				}
			}

			if (record.type === 'draw') {
				if (record.props.segments === undefined) {
					issues.push(`some bug in ${record.typeName}  ${record.type}`)
					record.props.segments = [
						{
							points: [
								{ x: 0, y: 0, z: 0.5 },
								{ x: 1, y: 1, z: 0.5 },
							],
							type: 'free',
						},
					]
				}
				for (const segment of record.props.segments) {
					for (const point of segment.points) {
						if (point.x === undefined || point.y === null) {
							issues.push(`some bug in ${record.typeName}`)
							point.x = 0
						}

						if (point.y === undefined || point.y === null) {
							issues.push(`some bug in ${record.typeName}`)
							point.y = 0
						}
					}
				}

				if ('points' in record.props) {
					delete record.props.points
				}
			}

			if (record.type === 'bookmark') {
				if ('loaded' in record.props) {
					issues.push('leftover loaded in bookmark')
					delete record.props.loaded
				}
			}

			if (record.type === 'draw') {
				if ('points' in record.props && record.props.segments === undefined) {
					record.props.segments = [{ type: 'free', points: record.props.points as Vec2dModel[] }]
				}
			}

			if (record.type === 'image') {
				if (record.props.w < 1) {
					record.props.w = 1
					issues.push(`zero w image in ${record.typeName}`)
				}
				if (record.props.h < 1) {
					record.props.h = 1
					issues.push(`zero h image in ${record.typeName}`)
				}
			}

			if (record.type === 'embed') {
				if ('loaded' in record.props) {
					issues.push('leftover loaded in embed')
					delete record.props.loaded
				}
			}

			break
		}
		case undefined: {
			record = null
		}
	}

	// Assign the new record into the store
	return { record, issues }
}
