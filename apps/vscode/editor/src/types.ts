export type MessageFromWebview =
  | {
      type: 'editorUpdated'
      text: string
    }
  | {
      type: 'svg'
      content: string
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
  | {
      type: 'getSvg'
    }
