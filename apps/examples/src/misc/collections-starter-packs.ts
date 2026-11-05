import type {
	CollectionPack,
	CollectionPackItem,
	TLCollectionItemContent,
} from '@tldraw/collections'
import {
	createShapeId,
	createTLSchema,
	type IndexKey,
	PageRecordType,
	type TLArrowShape,
	type TLGeoShape,
	type TLShape,
	type TLShapeId,
	type TLTextShape,
	toRichText,
} from 'tldraw'
import floorPlan from './collections-pack-floor-plan.json'
import tldrawCharacters from './collections-pack-tldraw-characters.json'
import wireframingSketches from './collections-pack-wireframing-sketches.json'

type Color = 'black' | 'grey' | 'blue' | 'green' | 'yellow' | 'violet'

type PackShape =
	| {
			type: 'geo'
			geo: 'rectangle' | 'ellipse' | 'diamond'
			x: number
			y: number
			w: number
			h: number
			text?: string
			color?: Color
			fill?: 'none' | 'semi' | 'solid'
	  }
	| { type: 'text'; x: number; y: number; w: number; text: string; color?: Color }
	| { type: 'arrow'; x: number; y: number; dx: number; dy: number; color?: Color }

// The light theme's stroke and tint for each colour, for thumbnails that match the placed shapes.
const PALETTE: Record<Color, { stroke: string; tint: string }> = {
	black: { stroke: '#1d1d1d', tint: '#e8e8e8' },
	grey: { stroke: '#9fa8b2', tint: '#eceef0' },
	blue: { stroke: '#4465e9', tint: '#dce1f8' },
	green: { stroke: '#099268', tint: '#d3e9e3' },
	yellow: { stroke: '#f1ac4b', tint: '#f9f0e6' },
	violet: { stroke: '#ae3ec9', tint: '#ecdcf2' },
}

const FONT_SIZE = 18
const SCHEMA = createTLSchema().serialize()
// Placing content gives its shapes a parent and index on the page they land on.
const PAGE = PageRecordType.createId('pack')
const INDEX = 'a1' as IndexKey

// Every style is set, so placed shapes look the same whatever styles the user last picked.
function toRecord(shape: PackShape, id: TLShapeId): TLShape {
	const base = {
		id,
		typeName: 'shape' as const,
		x: shape.x,
		y: shape.y,
		rotation: 0,
		index: INDEX,
		parentId: PAGE,
		isLocked: false,
		opacity: 1,
		meta: {},
	}
	const color = shape.color ?? 'black'
	switch (shape.type) {
		case 'geo':
			return {
				...base,
				type: 'geo',
				props: {
					geo: shape.geo,
					dash: 'solid',
					url: '',
					w: shape.w,
					h: shape.h,
					growY: 0,
					scale: 1,
					flipX: false,
					flipY: false,
					labelColor: 'black',
					color,
					fill: shape.fill ?? 'none',
					size: 's',
					font: 'sans',
					align: 'middle',
					verticalAlign: 'middle',
					richText: toRichText(shape.text ?? ''),
				},
			} satisfies TLGeoShape
		case 'text':
			return {
				...base,
				type: 'text',
				props: {
					color,
					size: 's',
					font: 'sans',
					textAlign: 'start',
					w: shape.w,
					richText: toRichText(shape.text),
					scale: 1,
					autoSize: false,
				},
			} satisfies TLTextShape
		case 'arrow':
			return {
				...base,
				type: 'arrow',
				props: {
					kind: 'arc',
					labelColor: 'black',
					color,
					fill: 'none',
					dash: 'solid',
					size: 's',
					arrowheadStart: 'none',
					arrowheadEnd: 'arrow',
					font: 'sans',
					start: { x: 0, y: 0 },
					end: { x: shape.dx, y: shape.dy },
					bend: 0,
					richText: toRichText(''),
					labelPosition: 0.5,
					scale: 1,
					elbowMidPoint: 0.5,
				},
			} satisfies TLArrowShape
	}
}

const escapeXml = (text: string) =>
	text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function toSvg(shape: PackShape): string {
	const { stroke, tint } = PALETTE[shape.color ?? 'black']
	const text = (x: number, y: number, value: string, anchor: string, fill: string) =>
		`<text x="${x}" y="${y}" font-family="sans-serif" font-size="${FONT_SIZE}" text-anchor="${anchor}" dominant-baseline="central" fill="${fill}">${escapeXml(value)}</text>`
	switch (shape.type) {
		case 'geo': {
			const { x, y, w, h } = shape
			const fill = { none: 'none', semi: '#fcfffe', solid: tint }[shape.fill ?? 'none']
			const paint = `fill="${fill}" stroke="${stroke}" stroke-width="2"`
			const outline = {
				rectangle: `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" ${paint}/>`,
				ellipse: `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" ${paint}/>`,
				diamond: `<polygon points="${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}" ${paint}/>`,
			}[shape.geo]
			const label = shape.text
				? text(x + w / 2, y + h / 2, shape.text, 'middle', PALETTE.black.stroke)
				: ''
			return outline + label
		}
		case 'text':
			return text(shape.x, shape.y + FONT_SIZE * 0.7, shape.text, 'start', stroke)
		case 'arrow': {
			const { x, y, dx, dy } = shape
			const angle = Math.atan2(dy, dx)
			const head = (turn: number) =>
				`${x + dx - 14 * Math.cos(angle + turn)},${y + dy - 14 * Math.sin(angle + turn)}`
			return `<path d="M${x},${y} L${x + dx},${y + dy} M${head(0.5)} L${x + dx},${y + dy} L${head(-0.5)}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
		}
	}
}

function bounds(shape: PackShape) {
	switch (shape.type) {
		case 'geo':
			return { minX: shape.x, minY: shape.y, maxX: shape.x + shape.w, maxY: shape.y + shape.h }
		case 'text':
			return {
				minX: shape.x,
				minY: shape.y,
				maxX: shape.x + shape.w,
				maxY: shape.y + FONT_SIZE * 1.4,
			}
		case 'arrow':
			return {
				minX: Math.min(shape.x, shape.x + shape.dx),
				minY: Math.min(shape.y, shape.y + shape.dy) - 8,
				maxX: Math.max(shape.x, shape.x + shape.dx),
				maxY: Math.max(shape.y, shape.y + shape.dy) + 8,
			}
	}
}

function thumbnailUrl(shapes: PackShape[]) {
	const all = shapes.map(bounds)
	const pad = 8
	const minX = Math.min(...all.map((b) => b.minX)) - pad
	const minY = Math.min(...all.map((b) => b.minY)) - pad
	const w = Math.max(...all.map((b) => b.maxX)) + pad - minX
	const h = Math.max(...all.map((b) => b.maxY)) + pad - minY
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${w} ${h}" width="${w}" height="${h}">${shapes.map(toSvg).join('')}</svg>`
	return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function item(packId: string, id: string, name: string, shapes: PackShape[]) {
	const records = shapes.map((shape, i) => toRecord(shape, createShapeId(`${packId}-${id}-${i}`)))
	const content: TLCollectionItemContent = {
		formatVersion: 1,
		content: {
			shapes: records,
			bindings: [],
			rootShapeIds: records.map((record) => record.id),
			assets: [],
			schema: SCHEMA,
		},
	}
	return { id, name, content, thumbnail: thumbnailUrl(shapes) }
}

const wireframing: CollectionPack = {
	id: 'wireframing',
	name: 'Wireframing',
	version: 2,
	items: [
		item('wireframing', 'button', 'Button', [
			{
				type: 'geo',
				geo: 'rectangle',
				x: 0,
				y: 0,
				w: 160,
				h: 48,
				text: 'Button',
				color: 'blue',
				fill: 'solid',
			},
		]),
		item('wireframing', 'input', 'Input', [
			{ type: 'geo', geo: 'rectangle', x: 0, y: 0, w: 240, h: 48, color: 'grey', fill: 'semi' },
			{ type: 'text', x: 16, y: 12, w: 200, text: 'Placeholder', color: 'grey' },
		]),
		item('wireframing', 'card', 'Card', [
			{ type: 'geo', geo: 'rectangle', x: 0, y: 0, w: 200, h: 160, color: 'grey', fill: 'semi' },
			{ type: 'geo', geo: 'rectangle', x: 16, y: 16, w: 168, h: 76, color: 'grey', fill: 'solid' },
			{ type: 'text', x: 16, y: 112, w: 168, text: 'Title' },
		]),
		item('wireframing', 'avatar', 'Avatar', [
			{ type: 'geo', geo: 'ellipse', x: 0, y: 0, w: 64, h: 64, color: 'violet', fill: 'solid' },
			{ type: 'text', x: 80, y: 20, w: 120, text: 'Name' },
		]),
		item('wireframing', 'checkbox', 'Checkbox', [
			{ type: 'geo', geo: 'rectangle', x: 0, y: 0, w: 28, h: 28, fill: 'semi' },
			{ type: 'text', x: 44, y: 2, w: 120, text: 'Label' },
		]),
		item('wireframing', 'nav-bar', 'Navigation bar', [
			{ type: 'geo', geo: 'rectangle', x: 0, y: 0, w: 360, h: 56, color: 'grey', fill: 'solid' },
			{ type: 'text', x: 20, y: 16, w: 80, text: 'Logo' },
			{ type: 'text', x: 180, y: 16, w: 70, text: 'Docs', color: 'grey' },
			{ type: 'text', x: 260, y: 16, w: 80, text: 'Sign in', color: 'blue' },
		]),
		...(wireframingSketches as unknown as CollectionPackItem[]),
	],
}

const diagramming: CollectionPack = {
	id: 'diagramming',
	name: 'Diagramming',
	version: 1,
	items: [
		item('diagramming', 'process', 'Process', [
			{
				type: 'geo',
				geo: 'rectangle',
				x: 0,
				y: 0,
				w: 160,
				h: 80,
				text: 'Process',
				color: 'blue',
				fill: 'semi',
			},
		]),
		item('diagramming', 'decision', 'Decision', [
			{
				type: 'geo',
				geo: 'diamond',
				x: 0,
				y: 0,
				w: 160,
				h: 120,
				text: 'Decision',
				color: 'yellow',
				fill: 'solid',
			},
		]),
		item('diagramming', 'terminal', 'Start or end', [
			{
				type: 'geo',
				geo: 'ellipse',
				x: 0,
				y: 0,
				w: 160,
				h: 72,
				text: 'Start',
				color: 'green',
				fill: 'solid',
			},
		]),
		item('diagramming', 'arrow', 'Arrow', [{ type: 'arrow', x: 0, y: 0, dx: 160, dy: 0 }]),
		item('diagramming', 'note', 'Note', [
			{
				type: 'geo',
				geo: 'rectangle',
				x: 0,
				y: 0,
				w: 160,
				h: 160,
				text: 'Note',
				color: 'yellow',
				fill: 'solid',
			},
		]),
		item('diagramming', 'step', 'Step to decision', [
			{
				type: 'geo',
				geo: 'rectangle',
				x: 0,
				y: 20,
				w: 140,
				h: 80,
				text: 'Step',
				color: 'blue',
				fill: 'semi',
			},
			{ type: 'arrow', x: 148, y: 60, dx: 84, dy: 0 },
			{
				type: 'geo',
				geo: 'diamond',
				x: 240,
				y: 0,
				w: 160,
				h: 120,
				text: 'Done?',
				color: 'yellow',
				fill: 'solid',
			},
		]),
	],
}

export const STARTER_PACKS: CollectionPack[] = [
	wireframing,
	diagramming,
	floorPlan as unknown as CollectionPack,
	tldrawCharacters as unknown as CollectionPack,
]
