import { Utils } from '@tldraw/core'
import type { TDCallbacks } from '~state'
import type { TldrawSession } from '~state/sessions'
import { defaultStyle } from '~state/shapes/shared'
import { FileSystemHandle, TDBinding, TDEventHandler, TDShape, TDStatus, TDUser } from '~types'
import { AppState, Document, Room, Settings } from './stores'

export interface TDNuCallbacks {
  /**
   * (optional) A callback to run when the component mounts.
   */
  onMount?: (state: App) => void

  /**
   * (optional) A callback to run when the user creates a new project through the menu or through a keyboard shortcut.
   */
  onNewProject?: (state: App, e?: KeyboardEvent) => void

  /**
   * (optional) A callback to run when the user saves a project through the menu or through a keyboard shortcut.
   */
  onSaveProject?: (state: App, e?: KeyboardEvent) => void

  /**
   * (optional) A callback to run when the user saves a project as a new project through the menu or through a keyboard shortcut.
   */
  onSaveProjectAs?: (state: App, e?: KeyboardEvent) => void

  /**
   * (optional) A callback to run when the user opens new project through the menu or through a keyboard shortcut.
   */
  onOpenProject?: (state: App, e?: KeyboardEvent) => void

  /**
   * (optional) A callback to run when the user signs in via the menu.
   */
  onSignIn?: (state: App) => void

  /**
   * (optional) A callback to run when the user signs out via the menu.
   */
  onSignOut?: (state: App) => void

  /**
   * (optional) A callback to run when the user creates a new project.
   */
  onChangePresence?: (state: App, user: TDUser) => void
  /**
   * (optional) A callback to run when the component's state changes.
   */
  onChange?: (state: App, reason?: string) => void
  /**
   * (optional) A callback to run when the state is patched.
   */
  onPatch?: (state: App, reason?: string) => void
  /**
   * (optional) A callback to run when the state is changed with a command.
   */
  onCommand?: (state: App, reason?: string) => void
  /**
   * (optional) A callback to run when the state is persisted.
   */
  onPersist?: (state: App) => void
  /**
   * (optional) A callback to run when the user undos.
   */
  onUndo?: (state: App) => void
  /**
   * (optional) A callback to run when the user redos.
   */
  onRedo?: (state: App) => void

  onChangePage?: (
    app: App,
    shapes: Record<string, TDShape | undefined>,
    bindings: Record<string, TDBinding | undefined>
  ) => void
}

export class App {
  settings = new Settings()

  document = new Document()

  room = new Room()

  status = TDStatus.Idle

  activeTool = 'select'

  hoveredId = undefined

  currentPageId = 'page'

  currentStyle = defaultStyle

  isToolLocked = false

  isStyleOpen = false

  isEmptyCanvas = false

  snapLines = []

  session?: TldrawSession

  readOnly = false

  isDirty = false

  isCreating = false

  originPoint = [0, 0]

  currentPoint = [0, 0]

  previousPoint = [0, 0]

  shiftKey = false

  altKey = false

  metaKey = false

  ctrlKey = false

  spaceKey = false

  editingStartTime = -1

  fileSystemHandle: FileSystemHandle | null = null

  viewport = Utils.getBoundsFromPoints([
    [0, 0],
    [100, 100],
  ])

  rendererBounds = Utils.getBoundsFromPoints([
    [0, 0],
    [100, 100],
  ])

  selectHistory = {
    stack: [[]] as string[][],
    pointer: 0,
  }

  clipboard?: {
    shapes: TDShape[]
    bindings: TDBinding[]
  }

  rotationInfo = {
    selectedIds: [] as string[],
    center: [0, 0],
  }

  pasteInfo = {
    center: [0, 0],
    offset: [0, 0],
  }

  callbacks: TDNuCallbacks = {}

  eventHandlers: TDEventHandler = {
    onPinchStart: () => {
      // noop
    },
    onPinchEnd: () => {
      // noop
    },
    onPinch: () => {
      // noop
    },
    onKeyDown: () => {
      // noop
    },
    onKeyUp: () => {
      // noop
    },
    onPointerMove: () => {
      // noop
    },
    onPointerUp: () => {
      // noop
    },
    onPan: () => {
      // noop
    },
    onZoom: () => {
      // noop
    },
    onPointerDown: () => {
      // noop
    },
    onPointCanvas: () => {
      // noop
    },
    onDoubleClickCanvas: () => {
      // noop
    },
    onRightPointCanvas: () => {
      // noop
    },
    onDragCanvas: () => {
      // noop
    },
    onReleaseCanvas: () => {
      // noop
    },
    onPointShape: () => {
      // noop
    },
    onDoubleClickShape: () => {
      // noop
    },
    onRightPointShape: () => {
      // noop
    },
    onDragShape: () => {
      // noop
    },
    onHoverShape: () => {
      // noop
    },
    onUnhoverShape: () => {
      // noop
    },
    onReleaseShape: () => {
      // noop
    },
    onPointBounds: () => {
      // noop
    },
    onDoubleClickBounds: () => {
      // noop
    },
    onRightPointBounds: () => {
      // noop
    },
    onDragBounds: () => {
      // noop
    },
    onHoverBounds: () => {
      // noop
    },
    onUnhoverBounds: () => {
      // noop
    },
    onReleaseBounds: () => {
      // noop
    },
    onPointBoundsHandle: () => {
      // noop
    },
    onDoubleClickBoundsHandle: () => {
      // noop
    },
    onRightPointBoundsHandle: () => {
      // noop
    },
    onDragBoundsHandle: () => {
      // noop
    },
    onHoverBoundsHandle: () => {
      // noop
    },
    onUnhoverBoundsHandle: () => {
      // noop
    },
    onReleaseBoundsHandle: () => {
      // noop
    },
    onPointHandle: () => {
      // noop
    },
    onDoubleClickHandle: () => {
      // noop
    },
    onRightPointHandle: () => {
      // noop
    },
    onDragHandle: () => {
      // noop
    },
    onHoverHandle: () => {
      // noop
    },
    onUnhoverHandle: () => {
      // noop
    },
    onReleaseHandle: () => {
      // noop
    },
    onShapeBlur: () => {
      // noop
    },
    onShapeClone: () => {
      // noop
    },
  }

  constructor(id?: string, callbacks = {} as TDNuCallbacks) {
    this.callbacks = callbacks
    this.callbacks.onMount?.(this)

    setTimeout(() => {
      // this.document.pages['page'].shapes['rect1'] = {
      //   ...this.document.pages['page'].shapes['rect1'],
      //   size: [200, 200],
      // }
      // this.document.pages['page'].shapes['rect1'].setSize([200, 200])
    }, 2000)
  }

  /**
   * Get a shape from a given page.
   * @param id The shape's id.
   * @param pageId (optional) The page's id.
   */
  getShape = <T extends TDShape = TDShape>(id: string, pageId = this.currentPageId): T => {
    return this.document.pages[pageId].shapes[id] as T
  }

  get pageState() {
    return this.document.pageStates[this.currentPageId]
  }

  get page() {
    return this.document.pages[this.currentPageId]
  }

  get shapes() {
    return Object.values(this.document.pages[this.currentPageId].shapes)
  }

  get bindings() {
    return Object.values(this.document.pages[this.currentPageId].bindings)
  }
}
