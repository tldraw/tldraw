export type Message =
  | { type: 'zoomIn' }
  | { type: 'zoomOut' }
  | { type: 'resetZoom' }
  | { type: 'zoomToFit' }
  | { type: 'zoomToSelection' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'cut' }
  | { type: 'copy' }
  | { type: 'paste' }
  | { type: 'delete' }
  | { type: 'selectAll' }
  | { type: 'selectNone' }

export type TldrawBridgeApi = {
  send: (channel: string, data: Message) => void
  on: (channel: string, cb: (message: Message) => void) => void
}
