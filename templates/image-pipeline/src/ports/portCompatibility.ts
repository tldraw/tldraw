import { ShapePort } from './Port'

export function arePortDataTypesCompatible(a: ShapePort['dataType'], b: ShapePort['dataType']) {
	return a === 'any' || b === 'any' || a === b
}

export function findFirstCompatiblePort(
	ports: ShapePort[],
	terminal: ShapePort['terminal'],
	dataType: ShapePort['dataType']
) {
	// Prefer an exact type match over an 'any' match so that e.g. a text
	// source connects to the 'prompt' port rather than a generic 'any' port.
	const candidates = ports.filter((port) => {
		return port.terminal === terminal && arePortDataTypesCompatible(port.dataType, dataType)
	})
	return (
		candidates.find((port) => port.dataType === dataType) ??
		candidates.find((port) => port.dataType === 'any' || dataType === 'any') ??
		candidates[0]
	)
}
