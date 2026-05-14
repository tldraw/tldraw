// Listing of which ISBN tiles are bundled in this example, by dataset and
// zoom level. The English-language quadrant of ISBN-space (978-0-* and
// 978-1-*) was extracted from phiresky/isbn-visualization-images for four
// representative datasets. The relative prefix is the ISBN with the EAN
// prefix replaced (978 -> 0, 979 -> 1), so e.g. "01" covers all of 978-1-*.

export type DatasetId = 'publishers' | 'all' | 'publication_date' | 'rarity'

export interface DatasetMeta {
	id: DatasetId
	name: string
	description: string
}

export const DATASETS: DatasetMeta[] = [
	{
		id: 'publishers',
		name: 'Publishers',
		description: 'Each color is a different publisher (registrant).',
	},
	{
		id: 'all',
		name: 'All Books',
		description: 'White pixels = a book exists at that ISBN in some catalog.',
	},
	{
		id: 'publication_date',
		name: 'Publication Date',
		description: 'Color encodes the average publication year of books in that range.',
	},
	{
		id: 'rarity',
		name: 'Rarity',
		description: 'Color encodes how many libraries hold copies (red=many, dim=few).',
	},
]

export const TILE_BASE_URL = '/isbn-map/tiled'

// Manifest of bundled tiles. Generated from the public folder contents.
// Keys are zoom levels; values are arrays of relative-prefix strings.
export const TILE_MANIFEST: Record<DatasetId, Record<number, string[]>> = {
	publishers: {
		1: ['0'],
		2: ['00', '01'],
		3: [
			'000',
			'001',
			'002',
			'003',
			'004',
			'005',
			'006',
			'007',
			'008',
			'009',
			'010',
			'011',
			'012',
			'013',
			'014',
			'015',
			'016',
			'017',
			'018',
			'019',
		],
	},
	all: {
		1: ['0'],
		2: ['00', '01'],
		3: [
			'000',
			'001',
			'002',
			'003',
			'004',
			'005',
			'006',
			'007',
			'008',
			'009',
			'010',
			'011',
			'012',
			'013',
			'014',
			'015',
			'016',
			'017',
			'018',
			'019',
		],
	},
	publication_date: {
		1: ['0'],
		2: ['00', '01'],
		3: [
			'000',
			'001',
			'002',
			'003',
			'004',
			'005',
			'006',
			'007',
			'008',
			'009',
			'010',
			'011',
			'012',
			'013',
			'014',
			'015',
			'016',
			'017',
			'018',
			'019',
		],
	},
	rarity: {
		1: ['0'],
		2: ['00', '01'],
		3: [
			'000',
			'001',
			'002',
			'003',
			'004',
			'005',
			'006',
			'007',
			'008',
			'009',
			'010',
			'011',
			'012',
			'013',
			'014',
			'015',
			'016',
			'017',
			'018',
			'019',
		],
	},
}

export function tileUrl(dataset: DatasetId, zoom: number, prefix: string): string {
	return `${TILE_BASE_URL}/${dataset}/zoom-${zoom}/${prefix}.png`
}
