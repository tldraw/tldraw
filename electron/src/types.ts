import type { TLDrawDocument, TLDrawFile } from '../../packages/tldraw/src'

export type Message =
  // File
  | { type: 'newFile'; file: TLDrawFile }
  | { type: 'openFile'; file: TLDrawFile }
  | { type: 'saveFile' }
  | { type: 'saveFileAs' }
  // Edit
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'cut' }
  | { type: 'copy' }
  | { type: 'paste' }
  | { type: 'delete' }
  | { type: 'selectAll' }
  | { type: 'selectNone' }
  // View
  | { type: 'zoomIn' }
  | { type: 'zoomOut' }
  | { type: 'resetZoom' }
  | { type: 'zoomToFit' }
  | { type: 'zoomToSelection' }

export type MessageToMain = { type: 'change'; document: TLDrawDocument }

export type TLApi = {
  sendMessage: (data: MessageToMain) => void
  onMessage: (cb: (message: Message) => void) => void
}
