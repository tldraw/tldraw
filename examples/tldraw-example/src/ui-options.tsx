import { TDShapeType, TDToolType, Tldraw, TldrawApp } from '@tldraw/tldraw'
import * as React from 'react'

function SelectButton({
  type,
  tldrawApp,
  children,
}: React.PropsWithChildren<{
  type: TDToolType
  tldrawApp?: TldrawApp
}>) {
  return (
    <button
      onClick={() => {
        tldrawApp?.selectTool(type)
      }}
      style={{
        border: '1px solid #333',
        // @TODO: have the button re-render when tldrawApp.currentTool.type changes, else active states won't work
        background: tldrawApp?.currentTool?.type === type ? 'papayawhip' : 'transparent',
        fontSize: '1.5rem',
        padding: '0.3em 0.8em',
        borderRadius: '0.15em',
      }}
    >
      {children}
    </button>
  )
}

export default function UIOptions() {
  const [tldrawApp, setApp] = React.useState<TldrawApp>()

  const handleMount = React.useCallback((app: TldrawApp) => {
    setApp(app)
  }, [])

  return (
    <div className="tldraw">
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          gap: '1em',
          zIndex: 100,
          bottom: '1em',
          left: '1em',
        }}
      >
        <SelectButton type="select" tldrawApp={tldrawApp}>
          Select
        </SelectButton>
        <SelectButton type="erase" tldrawApp={tldrawApp}>
          Erase
        </SelectButton>
        <SelectButton type={TDShapeType.Sticky} tldrawApp={tldrawApp}>
          Card
        </SelectButton>
      </div>

      <Tldraw
        onMount={handleMount}
        showUI={true}
        showStyles={false}
        showTools={false}
        showZoom={true}
        showPages={false}
        showMenu={false}
      />
    </div>
  )
}
