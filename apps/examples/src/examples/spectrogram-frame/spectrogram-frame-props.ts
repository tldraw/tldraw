import { RecordProps, T, TLShape } from 'tldraw'

// The spectrogram frame shape type
const SPECTROGRAM_FRAME_TYPE = 'spectrogram-frame'

// Type declaration for the global shape props map
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[SPECTROGRAM_FRAME_TYPE]: {
			w: number
			h: number
			name: string
		}
	}
}

// A type for our spectrogram frame shape
export type ISpectrogramFrameShape = TLShape<typeof SPECTROGRAM_FRAME_TYPE>

// Validation schema for the shape's props
export const spectrogramFrameShapeProps: RecordProps<ISpectrogramFrameShape> = {
	w: T.number,
	h: T.number,
	name: T.string,
}

// Constants for audio synthesis
export const SPECTROGRAM_CONFIG = {
	// Frequency range (full human hearing)
	MIN_FREQ: 20,
	MAX_FREQ: 20000,
	// Duration: 2ms per pixel width (wider frames)
	MS_PER_PIXEL: 2,
	// Audio sample rate
	SAMPLE_RATE: 44100,
	// RGB amplitude weights
	RED_AMPLITUDE: 1.0,
	GREEN_AMPLITUDE: 0.67,
	BLUE_AMPLITUDE: 0.33,
} as const
