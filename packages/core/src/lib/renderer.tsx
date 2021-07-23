import * as React from 'react'
import { TLShape, TLPage, TLPageState, TLSettings } from './types'
import styled from './styles'
import { BaseShape } from './shape'
import { TLState } from './state'
import { StatusBar } from './components/status-bar'
import { Canvas } from './components/canvas'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TLContext = React.createContext<TLState<TLShape>>({} as any)

export interface RendererProps<T extends TLShape> extends Partial<TLSettings> {
  shapes: Record<string, BaseShape<T>>
  page: TLPage<T>
  pageState: TLPageState
  onMount?: (tldraw: TLState<T>) => void
  onShapeSelect?: (shape: T) => void
  onShapeDelete?: (shape: T) => void
  onSelectAll?: (shape: T) => void
  onDeselectAll?: (shape: T) => void
  onCameraChange?: (shape: T) => void
}

export function Renderer<T extends TLShape>({
  shapes,
  page,
  pageState,
  onMount,
  isReadonlyMode = false,
  isDarkMode = false,
  isDebugMode = false,
  isPenMode = false,
}: RendererProps<T>): JSX.Element {
  const [state] = React.useState<TLState<T>>(
    () =>
      new TLState(shapes, page, pageState, {
        isReadonlyMode,
        isDarkMode,
        isDebugMode,
        isPenMode,
      })
  )

  React.useEffect(() => {
    onMount?.(state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <TLContext.Provider value={state as any}>
      <StyledContainer>
        <Canvas />
        <StatusBar />
      </StyledContainer>
    </TLContext.Provider>
  )
}

const StyledContainer = styled('div', {
  width: '100%',
  height: '100%',
  padding: '0px',
  margin: '0px',
  overscrollBehavior: 'none',
  overscrollBehaviorX: 'none',
  fontFamily: '$ui',
  fontSize: '$2',
  color: '$text',
  backgroundColor: '$canvas',
})
