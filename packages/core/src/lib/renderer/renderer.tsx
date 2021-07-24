import {
  TLShape,
  TLPage,
  TLPageState,
  TLSettings,
  TLCallbacks,
  TLShapeUtils,
  TLTheme,
} from '../types'
import { Canvas } from './components/canvas'
import { useTLTheme } from './hooks/useStyle'
import { TLContext } from './hooks/useTLContext'

export interface RendererProps<T extends TLShape>
  extends Partial<TLSettings>,
    Partial<TLCallbacks> {
  shapeUtils: TLShapeUtils<T>
  page: TLPage<T>
  pageState: TLPageState
  theme?: Partial<TLTheme>
}

export function Renderer<T extends TLShape>({
  shapeUtils,
  page,
  pageState,
  theme,
  isReadonlyMode = false,
  isDarkMode = false,
  isDebugMode = false,
  isPenMode = false,
  ...rest
}: RendererProps<T>): JSX.Element {
  useTLTheme(theme)

  return (
    <TLContext.Provider value={{ callbacks: rest, shapeUtils }}>
      <Canvas page={page} pageState={pageState} />
    </TLContext.Provider>
  )
}
