export type MessageFromWebview = {
  type: 'editorUpdated'
  text: string
}

export type MessageFromExtension =
  | {
      type: 'openedFile'
      text: string
    }
  | {
      type: 'fileSaved'
      text: string
    }
