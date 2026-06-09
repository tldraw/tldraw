import { geoAlbersUsa, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import usTopology from 'us-atlas/states-10m.json'

export const MAP_WIDTH = 975
export const MAP_HEIGHT = 610

const projection = geoAlbersUsa()
	.scale(1300)
	.translate([MAP_WIDTH / 2, MAP_HEIGHT / 2])
const pathGenerator = geoPath(projection)

// FIPS code to state name
const FIPS_TO_NAME: Record<string, string> = {
	'01': 'Alabama',
	'02': 'Alaska',
	'04': 'Arizona',
	'05': 'Arkansas',
	'06': 'California',
	'08': 'Colorado',
	'09': 'Connecticut',
	'10': 'Delaware',
	'11': 'DC',
	'12': 'Florida',
	'13': 'Georgia',
	'15': 'Hawaii',
	'16': 'Idaho',
	'17': 'Illinois',
	'18': 'Indiana',
	'19': 'Iowa',
	'20': 'Kansas',
	'21': 'Kentucky',
	'22': 'Louisiana',
	'23': 'Maine',
	'24': 'Maryland',
	'25': 'Massachusetts',
	'26': 'Michigan',
	'27': 'Minnesota',
	'28': 'Mississippi',
	'29': 'Missouri',
	'30': 'Montana',
	'31': 'Nebraska',
	'32': 'Nevada',
	'33': 'New Hampshire',
	'34': 'New Jersey',
	'35': 'New Mexico',
	'36': 'New York',
	'37': 'North Carolina',
	'38': 'North Dakota',
	'39': 'Ohio',
	'40': 'Oklahoma',
	'41': 'Oregon',
	'42': 'Pennsylvania',
	'44': 'Rhode Island',
	'45': 'South Carolina',
	'46': 'South Dakota',
	'47': 'Tennessee',
	'48': 'Texas',
	'49': 'Utah',
	'50': 'Vermont',
	'51': 'Virginia',
	'53': 'Washington',
	'54': 'West Virginia',
	'55': 'Wisconsin',
	'56': 'Wyoming',
}

export interface UsStateData {
	id: string
	name: string
	pathData: string
	bounds: { x: number; y: number; w: number; h: number }
}

export function getUsStatesData(): UsStateData[] {
	const topology = usTopology as unknown as Topology<{ states: GeometryCollection }>
	const states = feature(topology, topology.objects.states)
	const result: UsStateData[] = []

	for (const f of states.features) {
		const id = String(f.id)
		const pathData = pathGenerator(f)
		if (!pathData) continue

		const bounds = pathGenerator.bounds(f)
		const [[x0, y0], [x1, y1]] = bounds
		const name = FIPS_TO_NAME[id.padStart(2, '0')] ?? `State ${id}`

		result.push({
			id,
			name,
			pathData,
			bounds: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
		})
	}

	return result
}
