// Imports nothing: the CLI parser runs before the DOM exists, so it cannot load tldraw.

export type CaptureScope = 'viewport' | 'selection' | 'document'
export type CaptureFormat = 'text' | 'svg' | 'png'

export const CAPTURE_SCOPES: readonly CaptureScope[] = ['viewport', 'selection', 'document']
export const CAPTURE_FORMATS: readonly CaptureFormat[] = ['text', 'svg', 'png']
