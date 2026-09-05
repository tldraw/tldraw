import { registerTldrawLibraryVersion } from '@tldraw/utils'
export { createNodeMeasureContext } from './backends/node'
export type { NodeFontSource, NodeMeasureContextOptions } from './backends/node'
export { defaultNodeRegistry } from './document/registry'
export type {
	ListItemInfo,
	NodeKind,
	NodeRegistry,
	NodeSpec,
	PMMark,
	PMNode,
} from './document/types'
export { detectDirection } from './layout/bidi'
export { layoutDocument } from './layout/document'
export { layoutPlainText } from './layout/plainText'
export { LayoutQuery, compareDocPositions } from './layout/query'
export type { CaretRect, DocPosition, HitResult, Rect } from './layout/query'
export { chromiumLayoutProfile, webkitLayoutProfile } from './layout/profile'
export type { LayoutEngine, LayoutProfile } from './layout/profile'
export type { PlainTextLayoutOptions } from './layout/plainText'
export type {
	BlockBox,
	Fragment,
	FragmentKind,
	FragmentSource,
	LayoutOptions,
	LineBox,
	MarkerSymbol,
	TextLayout,
} from './layout/types'
export { createCanvasMeasureContext } from './measure/canvas'
export type { CanvasMeasureContextOptions, CanvasTextContextLike } from './measure/canvas'
export { createFakeMeasureContext } from './measure/fake'
export type { FakeMeasureContextOptions } from './measure/fake'
export { getMeasureContext, installMeasureContext, isMeasureContextReady } from './measure/install'
export { fontSpecToString, parseFontString } from './measure/types'
export type { FontMetrics, FontSpec, MeasureContext } from './measure/types'
export { markRule, nodeRule } from './style/stylesheet'
export type {
	DirectionValue,
	FontSizeValue,
	FontStyleValue,
	FontWeightValue,
	Length,
	LineHeightValue,
	ListStyleTypeValue,
	OverflowWrapValue,
	ResolvedBlockStyle,
	ResolvedInlineStyle,
	StyleDeclaration,
	StyleMatchContext,
	StyleRule,
	StyleSheet,
	TextAlignValue,
	TextDecorationValue,
	VerticalAlignValue,
	WhiteSpaceValue,
	WordBreakValue,
} from './style/types'
export { defaultUserAgentStyles } from './style/userAgent'
export { drawLayout } from './render/canvas'
export type { CanvasDrawContextLike, CanvasRenderOptions } from './render/canvas'
export { renderDom } from './render/dom'
export type { DomElementLike, DomRenderOptions } from './render/dom'
export { renderSvg, renderSvgTree, svgNodeToString } from './render/svg'
export type { SvgNode, SvgRenderOptions } from './render/svg'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
