// The baseline is a frozen, verbatim copy of the freehand ink algorithm in
// packages/tldraw/src/lib/shapes/shared/freehand (with imports pointed at the
// vendored primitives). Do not modify these files: the comparison harness and
// the parity tests treat their output as the source of truth. The guard test
// in ../guard.test.ts fails if the tldraw sources change without this copy
// being refreshed.
export { getStroke } from './getStroke'
export { getStrokeOutlinePoints, getStrokeOutlineTracks } from './getStrokeOutlinePoints'
export { getStrokePoints } from './getStrokePoints'
export { setStrokePointRadii } from './setStrokePointRadii'
export { getSvgPathFromStrokePoints } from './svg'
export { svgInk } from './svgInk'
export { type StrokeOptions, type StrokePoint } from './types'
