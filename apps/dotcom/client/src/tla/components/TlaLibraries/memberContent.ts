import {
	AssetRecordType,
	createShapeId,
	createTLSchema,
	fetch,
	FileHelpers,
	getHashForString,
	MediaHelpers,
	PageRecordType,
	toRichText,
	type IndexKey,
	type TLContent,
	type TLGeoShape,
	type TLGroupShape,
	type TLImageAsset,
	type TLImageShape,
	type TLShapeCrop,
	type TLShapeId,
	type TLTextShape,
} from 'tldraw'

const AVATAR_SIZE = 96
const NAME_WIDTH = 160
const NAME_GAP = 8

export function getInitial(name: string) {
	return name.trim().charAt(0).toUpperCase() || '?'
}

const base = (
	id: TLShapeId,
	parentId: TLGroupShape['parentId'],
	x: number,
	y: number,
	index: string
) => ({
	id,
	typeName: 'shape' as const,
	x,
	y,
	rotation: 0,
	index: index as IndexKey,
	parentId,
	isLocked: false,
	opacity: 1,
	meta: {},
})

/** The middle square of an image, as a circle. */
function getCircleCrop({ w, h }: { w: number; h: number }): TLShapeCrop {
	const insetX = w > h ? (1 - h / w) / 2 : 0
	const insetY = h > w ? (1 - w / h) / 2 : 0
	return {
		topLeft: { x: insetX, y: insetY },
		bottomRight: { x: 1 - insetX, y: 1 - insetY },
		isCircle: true,
	}
}

/**
 * A member as shapes: a group of their avatar, cropped to a circle, or else their initial in a
 * circle, over their name.
 */
export function getMemberContent(
	member: { userName: string },
	avatar: TLImageAsset | undefined
): TLContent {
	const group: TLGroupShape = {
		...base(createShapeId(), PageRecordType.createId('page'), 0, 0, 'a1'),
		type: 'group',
		props: {},
	}
	const face: TLImageShape | TLGeoShape = avatar
		? {
				...base(createShapeId(), group.id, 0, 0, 'a1'),
				type: 'image',
				props: {
					w: AVATAR_SIZE,
					h: AVATAR_SIZE,
					assetId: avatar.id,
					playing: true,
					url: '',
					crop: getCircleCrop(avatar.props),
					flipX: false,
					flipY: false,
					altText: member.userName,
				},
			}
		: {
				...base(createShapeId(), group.id, 0, 0, 'a1'),
				type: 'geo',
				props: {
					geo: 'ellipse',
					w: AVATAR_SIZE,
					h: AVATAR_SIZE,
					dash: 'solid',
					growY: 0,
					url: '',
					scale: 1,
					flipX: false,
					flipY: false,
					color: 'violet',
					labelColor: 'white',
					fill: 'fill',
					size: 'xl',
					font: 'sans',
					align: 'middle',
					verticalAlign: 'middle',
					richText: toRichText(getInitial(member.userName)),
				},
			}
	const name: TLTextShape = {
		...base(
			createShapeId(),
			group.id,
			(AVATAR_SIZE - NAME_WIDTH) / 2,
			AVATAR_SIZE + NAME_GAP,
			'a2'
		),
		type: 'text',
		props: {
			color: 'black',
			size: 's',
			font: 'sans',
			textAlign: 'middle',
			w: NAME_WIDTH,
			richText: toRichText(member.userName),
			scale: 1,
			autoSize: false,
		},
	}
	return {
		shapes: [group, face, name],
		bindings: [],
		rootShapeIds: [group.id],
		assets: avatar ? [avatar] : [],
		schema: createTLSchema().serialize(),
	}
}

/**
 * A member's avatar as an asset whose src is the image itself, as a data URL. Placing it uploads it
 * to the board, as pasting an image does, so the board keeps its own copy rather than depending on
 * the avatar's host. Its id comes from the avatar's URL, so placing the member again on a board
 * reuses the board's copy.
 */
export async function loadAvatarAsset({
	userName,
	userAvatar,
}: {
	userName: string
	userAvatar: string
}): Promise<TLImageAsset> {
	const response = await fetch(userAvatar)
	if (!response.ok) throw new Error(`Couldn't load the avatar: ${response.status}`)
	const blob = await response.blob()
	const size = await MediaHelpers.getImageSize(blob)
	const extension = (blob.type.split(/[/;]/)[1] || 'png').replace('+xml', '')
	return AssetRecordType.create({
		id: AssetRecordType.createId(`member-avatar-${getHashForString(userAvatar)}`),
		type: 'image',
		props: {
			name: `${userName}.${extension}`,
			src: await FileHelpers.blobToDataUrl(blob),
			w: size.w,
			h: size.h,
			mimeType: blob.type,
			isAnimated: false,
			fileSize: blob.size,
		},
		meta: {},
	}) as TLImageAsset
}
