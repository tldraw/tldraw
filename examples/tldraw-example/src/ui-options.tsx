import { TDShapeType, TDToolType, Tldraw, TldrawApp } from '@tldraw/tldraw'
import * as React from 'react'

const AppContext = React.createContext<TldrawApp>({} as any)

function useApp() {
  return React.useContext(AppContext)
}

function SelectButton({
  type,
  children,
}: React.PropsWithChildren<{
  type: TDToolType
  tldrawApp?: TldrawApp
}>) {
  const app = useApp()

  // App.useStore is the same as a Zustand store's useStore hook!
  const isActive = app.useStore((app) => {
    return app.appState.activeTool === type
  })

  return (
    <button
      onClick={() => app.selectTool(type)}
      style={{
        border: '1px solid #333',
        background: isActive ? 'papayawhip' : 'transparent',
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
  const [app, setApp] = React.useState<TldrawApp>()

  const handleMount = React.useCallback((app: TldrawApp) => {
    setApp(app)
  }, [])

  return (
    <div className="tldraw">
      <Tldraw
        onMount={handleMount}
        showUI={true}
        showStyles={false}
        showTools={false}
        showZoom={true}
        showPages={false}
        showMenu={false}
      />
      {/* When we have an app, show the custom UI */}
      {app && (
        <AppContext.Provider value={app}>
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
            <SelectButton type="select">Select</SelectButton>
            <SelectButton type="erase">Erase</SelectButton>
            <SelectButton type={TDShapeType.Sticky}>Card</SelectButton>
          </div>
        </AppContext.Provider>
      )}
    </div>
  )
}
