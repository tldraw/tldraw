import useKeyboardEvents from 'hooks/useKeyboardEvents'
import useLoadOnMount from 'hooks/useLoadOnMount'
import Canvas from './canvas/canvas'
import StatusBar from './status-bar'
import CodePanel from './code-panel/code-panel'
import ControlsPanel from './controls-panel/controls-panel'
import ToolsPanel from './tools-panel/tools-panel'
import StylePanel from './style-panel/style-panel'
import { useSelector } from 'state'
import styled from 'styles'

export default function Editor() {
  useKeyboardEvents()
  useLoadOnMount()

  const hasControls = useSelector(
    (s) => Object.keys(s.data.codeControls).length > 0
  )

  return (
    <Layout>
      <Canvas />
      <LeftPanels>
        <CodePanel />
        {hasControls && <ControlsPanel />}
      </LeftPanels>
      <RightPanels>
        <StylePanel />
      </RightPanels>
      <ToolsPanel />
      <StatusBar />
    </Layout>
  )
}

const Layout = styled('main', {
  position: 'fixed',
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  height: '100%',
  width: '100%',
  display: 'grid',
  gridTemplateRows: '1fr auto 144px',
  gridTemplateColumns: 'minmax(0, 720px) 1fr auto',
  gridTemplateAreas: `
    "leftPanels main rightPanels"
    "tools tools tools"
    "statusbar statusbar statusbar"
  `,
})

const LeftPanels = styled('div', {
  display: 'grid',
  gridArea: 'leftPanels',
  gridTemplateRows: '1fr auto',
  padding: 8,
  gap: 8,
  zIndex: 250,
  pointerEvents: 'none',
})

const RightPanels = styled('div', {
  gridArea: 'rightPanels',
  padding: 8,
  display: 'grid',
  gridTemplateRows: 'auto',
  height: 'fit-content',
  justifyContent: 'flex-end',
  gap: 8,
  zIndex: 300,
  pointerEvents: 'none',
})
