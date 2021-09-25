export enum UI_EVENT {
  TLDRAW_UPDATED = 'TLDRAW_UPDATED',
}

export enum EXTENSION_EVENT {
  INITIAL_DOCUMENT = 'INITIAL_DOCUMENT',
  LOCAL_FILE_UPDATED = 'LOCAL_FILE_UPDATED',
}

export type UIMessage = MessageEvent<{ type: UI_EVENT; text: string }>

export type ExtensionMessage = MessageEvent<{ type: EXTENSION_EVENT; text: string }>
