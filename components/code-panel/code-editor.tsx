import Editor, { Monaco } from '@monaco-editor/react'
import useTheme from 'hooks/useTheme'
import typesImport from './types-import'
import React, { useCallback, useEffect, useRef } from 'react'
import styled from 'styles'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { getFormattedCode } from 'utils/code'

export type IMonaco = typeof monaco

export type IMonacoEditor = monaco.editor.IStandaloneCodeEditor

const modifierKeys = ['Escape', 'Meta', 'Control', 'Shift', 'Option', 'Alt']

interface Props {
  value: string
  error: { line: number; column: number }
  fontSize: number
  monacoRef?: React.MutableRefObject<IMonaco>
  editorRef?: React.MutableRefObject<IMonacoEditor>
  readOnly?: boolean
  onMount?: (value: string, editor: IMonacoEditor) => void
  onUnmount?: (editor: IMonacoEditor) => void
  onChange?: (value: string, editor: IMonacoEditor) => void
  onSave?: (value: string, editor: IMonacoEditor) => void
  onError?: (error: Error, line: number, col: number) => void
  onKey?: () => void
}

export default function CodeEditor({
  editorRef,
  monacoRef,
  fontSize,
  value,
  error,
  readOnly,
  onChange,
  onSave,
  onKey,
}: Props): JSX.Element {
  const { theme } = useTheme()
  const rEditor = useRef<IMonacoEditor>(null)
  const rMonaco = useRef<IMonaco>(null)

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    if (monacoRef) {
      monacoRef.current = monaco
    }
    rMonaco.current = monaco

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      allowJs: true,
      checkJs: false,
      strict: false,
      noLib: true,
      lib: ['es6'],
      target: monaco.languages.typescript.ScriptTarget.ES2016,
      allowNonTsExtensions: true,
    })

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      allowJs: true,
      checkJs: true,
      strict: true,
      noLib: true,
      lib: ['es6'],
      target: monaco.languages.typescript.ScriptTarget.ES2016,
      allowNonTsExtensions: true,
    })

    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)
    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true)

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    })

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    })

    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      typesImport.content
    )

    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      typesImport.content
    )

    monaco.languages.registerDocumentFormattingEditProvider('typescript', {
      async provideDocumentFormattingEdits(model) {
        try {
          const text = getFormattedCode(model.getValue())

          return [
            {
              range: model.getFullModelRange(),
              text,
            },
          ]
        } catch (e) {
          return [
            {
              range: model.getFullModelRange(),
              text: model.getValue(),
            },
          ]
        }
      },
    })
  }, [])

  const handleMount = useCallback((editor: IMonacoEditor) => {
    if (editorRef) {
      editorRef.current = editor
    }
    rEditor.current = editor

    editor.updateOptions({
      fontSize,
      fontFamily: "'Recursive', monospace",
      fontWeight: '420',
      wordBasedSuggestions: false,
      minimap: { enabled: false },
      lightbulb: {
        enabled: false,
      },
      readOnly,
    })
  }, [])

  const handleChange = useCallback((code: string | undefined) => {
    onChange(code, rEditor.current)
  }, [])

  const handleKeydown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      e.stopPropagation()
      !modifierKeys.includes(e.key) && onKey?.()
      const metaKey = navigator.platform.match('Mac') ? e.metaKey : e.ctrlKey
      if (e.key === 's' && metaKey) {
        const editor = rEditor.current
        if (!editor) return
        editor
          .getAction('editor.action.formatDocument')
          .run()
          .then(() =>
            onSave(rEditor.current?.getModel().getValue(), rEditor.current)
          )

        e.preventDefault()
      }
      if (e.key === 'p' && metaKey) {
        e.preventDefault()
      }
      if (e.key === 'd' && metaKey) {
        e.preventDefault()
      }
    },
    []
  )

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => e.stopPropagation(),
    []
  )

  const rDecorations = useRef<any>([])

  useEffect(() => {
    const monaco = rMonaco.current
    if (!monaco) return
    const editor = rEditor.current
    if (!editor) return

    if (!error) {
      rDecorations.current = editor.deltaDecorations(rDecorations.current, [])
      return
    }

    if (!error.line) return

    rDecorations.current = editor.deltaDecorations(rDecorations.current, [
      {
        range: new monaco.Range(
          Number(error.line) - 1,
          0,
          Number(error.line) - 1,
          0
        ),
        options: {
          isWholeLine: true,
          className: 'editorLineError',
        },
      },
    ])
  }, [error])

  useEffect(() => {
    const monaco = rMonaco.current
    if (!monaco) return
    monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'light')
  }, [theme])

  useEffect(() => {
    const editor = rEditor.current
    if (!editor) return

    editor.updateOptions({
      fontSize,
    })
  }, [fontSize])

  return (
    <EditorContainer onKeyDown={handleKeydown} onKeyUp={handleKeyUp}>
      <Editor
        height="100%"
        language="typescript"
        value={value}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        onChange={handleChange}
      />
    </EditorContainer>
  )
}

const EditorContainer = styled('div', {
  height: '100%',
  pointerEvents: 'all',
  userSelect: 'all',

  '& > *': {
    userSelect: 'all',
    pointerEvents: 'all',
  },

  '.editorLineError': {
    backgroundColor: '$lineError',
  },
})
