/**
 * Shared shape types for tests in this package.
 *
 * Every `TLGlobalShapePropsMap` augmentation in a test file adds a member to `TLShape['type']`
 * for the whole package typecheck. TypeScript gives up on discriminated-union assignability once
 * the union has more than 25 constituents, and then `Editor.ts` itself stops compiling at its
 * `updateShapes` call sites. The 13 default shapes already use half of that budget, so tests that
 * only need a plain box (or a frame-like container) must reuse these types rather than declaring
 * their own. Declare a new type only when a test genuinely needs different props.
 */
export const TEST_BOX_TYPE = 'test-box'
export const TEST_FRAME_TYPE = 'test-frame'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[TEST_BOX_TYPE]: { w: number; h: number }
		[TEST_FRAME_TYPE]: { w: number; h: number }
	}
}
