import { CSSProperties } from 'react'

export const WIDTH = 1600
export const HEIGHT = 900
export const FPS = 30

export const FONT_FAMILY = "'Inter', -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif"

export const COLORS = {
	background: '#ffffff',
	text: '#000000',
	textLight: '#32353c',
	primary: 'hsl(214, 84%, 56%)',
	diffAdd: '#dafbe1',
	diffRemove: '#ffebe9',
	diffAddText: '#1a7f37',
	diffRemoveText: '#cf222e',
	diffHunkBg: '#ddf4ff',
	diffHunkText: '#0969da',
	diffGutter: '#f6f8fa',
	fileHeaderBg: '#f6f8fa',
	fileHeaderBorder: '#d0d7de',
	border: '#d0d7de',
}

export const slideBase: CSSProperties = {
	width: WIDTH,
	height: HEIGHT,
	backgroundColor: COLORS.background,
	fontFamily: FONT_FAMILY,
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	overflow: 'hidden',
	color: COLORS.text,
	fontSize: 24,
	fontWeight: 500,
	lineHeight: 1.3,
}
