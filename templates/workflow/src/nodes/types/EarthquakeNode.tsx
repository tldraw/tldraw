import { sleep, T } from 'tldraw'
import { EarthquakeIcon } from '../../components/icons/EarthquakeIcon'
import { NODE_ROW_HEIGHT_PX } from '../../constants'
import { ShapePort } from '../../ports/Port'
import { NodeShape } from '../NodeShapeUtil'
import {
	ExecutionResult,
	InfoValues,
	NodeComponentProps,
	NodeDefinition,
	NodeRow,
	outputPort,
	STOP_EXECUTION,
	updateNode,
} from './shared'

/**
 * The earthquake node fetches data from USGS earthquake API and outputs magnitude.
 */
export type EarthquakeNode = T.TypeOf<typeof EarthquakeNode>
export const EarthquakeNode = T.object({
	type: T.literal('earthquake'),
	earthquakeData: T.nullable(
		T.object({
			magnitude: T.number,
			location: T.string,
			datetime: T.string,
			id: T.string, // Add unique ID to avoid duplicate selections
		})
	),
})

interface EarthquakeFeature {
	properties: {
		mag: number
		place: string
		time: number
	}
	id: string
}

interface EarthquakeApiResponse {
	features: EarthquakeFeature[]
}

export class EarthquakeNodeDefinition extends NodeDefinition<EarthquakeNode> {
	static type = 'earthquake'
	static validator = EarthquakeNode
	title = 'Earthquake data'
	heading = 'USGS Data'
	icon = <EarthquakeIcon />

	getDefault(): EarthquakeNode {
		return {
			type: 'earthquake',
			earthquakeData: null,
		}
	}

	getBodyHeightPx(_shape: NodeShape, _node: EarthquakeNode) {
		return NODE_ROW_HEIGHT_PX * 3 // Three rows for magnitude, location, datetime
	}

	getPorts(_shape: NodeShape, _node: EarthquakeNode): Record<string, ShapePort> {
		return { output: outputPort }
	}

	async execute(shape: NodeShape, _node: EarthquakeNode): Promise<ExecutionResult> {
		const setData = (earthquakeData: EarthquakeNode['earthquakeData']) =>
			updateNode<EarthquakeNode>(this.editor, shape, (node) => ({ ...node, earthquakeData }), false)

		try {
			// Simulate loading delay
			await sleep(500)

			const response = await fetch(
				'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'
			)
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}

			const data: EarthquakeApiResponse = await response.json()
			if (data.features.length === 0) {
				// Update node with no data state
				setData(null)
				return { output: STOP_EXECUTION }
			}

			// Pick a random earthquake
			const earthquake = data.features[Math.floor(Math.random() * data.features.length)]
			const earthquakeData = {
				magnitude: earthquake.properties.mag,
				location: earthquake.properties.place,
				datetime: new Date(earthquake.properties.time).toLocaleString(),
				id: earthquake.id,
			}

			// Update node with fetched data
			setData(earthquakeData)

			return { output: earthquakeData.magnitude }
		} catch (error) {
			console.error('Failed to fetch earthquake data:', error)

			// Update node with error state
			setData(null)

			return { output: STOP_EXECUTION }
		}
	}

	getOutputInfo(shape: NodeShape, node: EarthquakeNode): InfoValues {
		const { isOutOfDate } = shape.props
		return {
			output: {
				value: isOutOfDate ? STOP_EXECUTION : (node.earthquakeData?.magnitude ?? STOP_EXECUTION),
				isOutOfDate,
			},
		}
	}

	Component = EarthquakeNodeComponent
}

export function EarthquakeNodeComponent({ shape, node }: NodeComponentProps<EarthquakeNode>) {
	const { earthquakeData } = node
	const isLoading = shape.props.isOutOfDate

	// Show helpful message when no data has been loaded yet (not loading and no data)
	if (!isLoading && !earthquakeData) {
		return (
			<div className="EarthquakeNode">
				<div className="EarthquakeNode-message">
					Connect this node and run the workflow to fetch earthquake data
				</div>
			</div>
		)
	}

	return (
		<div className="EarthquakeNode">
			<NodeRow>
				<div className="NodeValue">
					<strong>Magnitude:</strong> {isLoading ? '…' : earthquakeData!.magnitude.toFixed(1)}
				</div>
			</NodeRow>
			<NodeRow>
				<div className="NodeValue" style={{ fontSize: '12px' }}>
					<strong>Location:</strong> {isLoading ? '…' : earthquakeData!.location}
				</div>
			</NodeRow>
			<NodeRow>
				<div className="NodeValue" style={{ fontSize: '12px' }}>
					<strong>Time:</strong> {isLoading ? '…' : earthquakeData!.datetime}
				</div>
			</NodeRow>
		</div>
	)
}
