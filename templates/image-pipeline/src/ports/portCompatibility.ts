import { ShapePort } from './Port'

export function arePortDataTypesCompatible(a: ShapePort['dataType'], b: ShapePort['dataType']) {
	return a === 'any' || b === 'any' || a === b
}

export function findFirstCompatiblePort(
	ports: ShapePort[],
	terminal: ShapePort['terminal'],
	dataType: ShapePort['dataType']
) {
	return ports.find((port) => {
		return port.terminal === terminal && arePortDataTypesCompatible(port.dataType, dataType)
	})
}
