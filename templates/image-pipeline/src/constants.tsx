export const CONNECTION_CENTER_HANDLE_SIZE_PX = 16
export const CONNECTION_CENTER_HANDLE_HOVER_SIZE_PX = 24

export const NODE_WIDTH_PX = 260
export const NODE_HEADER_HEIGHT_PX = 40
export const NODE_ROW_HEADER_GAP_PX = 8
export const NODE_ROW_BOTTOM_PADDING_PX = 8
export const NODE_FOOTER_HEIGHT_PX = 40
export const NODE_ROW_HEIGHT_PX = 44
export const NODE_IMAGE_PREVIEW_HEIGHT_PX = 160 + 8

export const PORT_RADIUS_PX = 6

export const DEFAULT_NODE_SPACING_PX = 60

/**
 * Port data types define the kind of data that flows between nodes. Each type
 * has a CSS color used to tint ports and connections so users can see at a
 * glance which outputs are compatible with which inputs.
 */
export type PortDataType = 'image' | 'text' | 'model' | 'number' | 'latent' | 'any'

export const PORT_TYPE_COLORS: Record<PortDataType, string> = {
	image: '#c060e0',
	text: '#4caf50',
	model: '#2196f3',
	number: '#9e9e9e',
	latent: '#ff9800',
	any: '#c08520',
}
