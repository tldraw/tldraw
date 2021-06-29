import { createSelectorHook, createState } from '@state-designer/react'
import { updateFromCode } from './code/generate'
import { createShape, getShapeUtils } from './shape-utils'
import vec from 'utils/vec'
import inputs from './inputs'
import history from './history'
import storage from './storage'
import clipboard from './clipboard'
import * as Sessions from './sessions'
import pusher from './pusher/client-supa'
import commands from './commands'
import {
  getCommonBounds,
  rotateBounds,
  getBoundsCenter,
  setToArray,
  deepClone,
  pointInBounds,
  uniqueId,
} from 'utils'
import tld from 'utils/tld'
import {
  Data,
  PointerInfo,
  Shape,
  ShapeType,
  Corner,
  Edge,
  CodeControl,
  MoveType,
  ShapeStyles,
  DistributeType,
  AlignType,
  StretchType,
  DashStyle,
  SizeStyle,
  ColorStyle,
} from 'types'

import session from './session'

const initialData: Data = {
  isReadOnly: false,
  settings: {
    fontSize: 13,
    isDarkMode: false,
    isCodeOpen: false,
    isStyleOpen: false,
    isToolLocked: false,
    isPenLocked: false,
    nudgeDistanceLarge: 10,
    nudgeDistanceSmall: 1,
  },
  currentStyle: {
    size: SizeStyle.Medium,
    color: ColorStyle.Black,
    dash: DashStyle.Solid,
    isFilled: false,
  },
  activeTool: 'select',
  brush: undefined,
  boundsRotation: 0,
  pointedId: null,
  hoveredId: null,
  editingId: null,
  currentPageId: 'page1',
  currentParentId: 'page1',
  currentCodeFileId: 'file0',
  codeControls: {},
  document: {
    id: '0001',
    name: 'My Document',
    pages: {
      page1: {
        id: 'page1',
        type: 'page',
        name: 'Page 1',
        childIndex: 0,
        shapes: {},
      },
    },
    code: {
      file0: {
        id: 'file0',
        name: 'index.ts',
        code: `
const draw = new Draw({
  points: [
    ...Utils.getPointsBetween([0, 0], [20, 50]),
    ...Utils.getPointsBetween([20, 50], [100, 20], 3),
    ...Utils.getPointsBetween([100, 20], [100, 100], 10),
    [100, 100],
  ],
})

const rectangle = new Rectangle({
  point: [200, 0],
  style: {
    color: ColorStyle.Blue,
  },
})

const ellipse = new Ellipse({
  point: [400, 0],
})

const arrow = new Arrow({
  start: [600, 0],
  end: [700, 100],
})

const radius = 1000
const count = 100
const center = [350, 50]

for (let i = 0; i < count; i++) {
  const point = Vec.rotWith(
    Vec.add(center, [radius, 0]),
    center,
    (Math.PI * 2 * i) / count
  )

  const dot = new Dot({
    point,
  })
}
        `,
      },
    },
  },
  pageStates: {
    page1: {
      id: 'page1',
      selectedIds: new Set([]),
      camera: {
        point: [0, 0],
        zoom: 1,
      },
    },
  },
}

const state = createState({
  data: initialData,
  on: {
    UNMOUNTED: { to: 'loading' },
  },
  initial: 'loading',
  states: {
    loading: {
      on: {
        MOUNTED: {
          do: 'restoreSavedData',
          to: 'ready',
        },
      },
    },
    ready: {
      onEnter: {
        wait: 0.01,
        if: 'hasSelection',
        do: 'zoomCameraToSelectionActual',
        else: ['zoomCameraToActual'],
      },
      on: {
        // Network-Related
        RT_LOADED_ROOM: [
          'clearRoom',
          { if: 'hasRoom', do: ['clearDocument', 'connectToRoom'] },
        ],
        RT_UNLOADED_ROOM: ['clearRoom', 'clearDocument'],
        RT_DISCONNECTED_ROOM: ['clearRoom', 'clearDocument'],
        RT_CREATED_SHAPE: 'addRtShape',
        RT_CHANGED_STATUS: 'setRtStatus',
        RT_DELETED_SHAPE: 'deleteRtShape',
        RT_EDITED_SHAPE: 'editRtShape',
        RT_MOVED_CURSOR: 'moveRtCursor',
        // Client
        MOVED_POINTER: { secretlyDo: 'sendRtCursorMove' },
        RESIZED_WINDOW: 'resetPageState',
        RESET_PAGE: 'resetPage',
        TOGGLED_READ_ONLY: 'toggleReadOnly',
        LOADED_FONTS: 'resetShapes',
        USED_PEN_DEVICE: 'enablePenLock',
        DISABLED_PEN_LOCK: 'disablePenLock',
        TOGGLED_CODE_PANEL_OPEN: ['toggleCodePanel', 'saveAppState'],
        TOGGLED_STYLE_PANEL_OPEN: 'toggleStylePanel',
        PANNED_CAMERA: 'panCamera',
        POINTED_CANVAS: ['closeStylePanel', 'clearCurrentParentId'],
        COPIED_STATE_TO_CLIPBOARD: 'copyStateToClipboard',
        COPIED: { if: 'hasSelection', do: 'copyToClipboard' },
        PASTED: {
          unlessAny: ['isReadOnly', 'isInSession'],
          do: 'pasteFromClipboard',
        },
        PASTED_SHAPES_FROM_CLIPBOARD: {
          unlessAny: ['isReadOnly', 'isInSession'],
          do: 'pasteShapesFromClipboard',
        },
        TOGGLED_SHAPE_LOCK: {
          unlessAny: ['isReadOnly', 'isInSession'],
          if: 'hasSelection',
          do: 'lockSelection',
        },
        TOGGLED_SHAPE_HIDE: {
          unlessAny: ['isReadOnly', 'isInSession'],
          if: 'hasSelection',
          do: 'hideSelection',
        },
        TOGGLED_SHAPE_ASPECT_LOCK: {
          unlessAny: ['isReadOnly', 'isInSession'],
          if: 'hasSelection',
          do: 'aspectLockSelection',
        },
        CHANGED_STYLE: {
          unlessAny: ['isReadOnly', 'isInSession'],
          do: ['updateStyles', 'applyStylesToSelection'],
        },
        CLEARED_PAGE: {
          unlessAny: ['isReadOnly', 'isInSession'],
          if: 'hasSelection',
          do: 'deleteSelection',
          else: ['selectAll', 'deleteSelection'],
        },
        CREATED_PAGE: {
          unless: ['isReadOnly', 'isInSession'],
          do: ['clearSelectedIds', 'createPage'],
        },
        DELETED_PAGE: {
          unlessAny: ['isReadOnly', 'isInSession', 'hasOnlyOnePage'],
          do: 'deletePage',
        },
        SELECTED_SELECT_TOOL: {
          unless: 'isInSession',
          to: 'selecting',
        },
        SELECTED_DRAW_TOOL: {
          unlessAny: ['isReadOnly', 'isInSession'],
          to: 'draw',
        },
        SELECTED_ARROW_TOOL: {
          unless: ['isReadOnly', 'isInSession'],
          to: 'arrow',
        },
        SELECTED_DOT_TOOL: {
          unless: ['isReadOnly', 'isInSession'],
          to: 'dot',
        },
        SELECTED_ELLIPSE_TOOL: {
          unless: ['isReadOnly', 'isInSession'],
          to: 'ellipse',
        },
        SELECTED_RAY_TOOL: {
          unless: ['isReadOnly', 'isInSession'],
          to: 'ray',
        },
        SELECTED_LINE_TOOL: {
          unless: ['isReadOnly', 'isInSession'],
          to: 'line',
        },
        SELECTED_POLYLINE_TOOL: {
          unless: ['isReadOnly', 'isInSession'],
          to: 'polyline',
        },
        SELECTED_RECTANGLE_TOOL: {
          unless: ['isReadOnly', 'isInSession'],
          to: 'rectangle',
        },
        SELECTED_TEXT_TOOL: {
          unless: ['isReadOnly', 'isInSession'],
          to: 'text',
        },
        GENERATED_FROM_CODE: {
          unless: ['isReadOnly', 'isInSession'],
          do: ['setCodeControls', 'setGeneratedShapes'],
        },
        UNDO: {
          unless: ['isReadOnly', 'isInSession'],
          do: 'undo',
        },
        REDO: {
          unless: ['isReadOnly', 'isInSession'],
          do: 'redo',
        },
        SAVED: {
          unlessAny: ['isInSession', 'isReadOnly'],
          do: 'forceSave',
        },
        LOADED_FROM_FILE: {
          unless: 'isInSession',
          do: ['loadDocumentFromJson', 'resetHistory'],
        },
        SELECTED_ALL: {
          unless: 'isInSession',
          to: 'selecting',
          do: 'selectAll',
        },
        CHANGED_PAGE: {
          unless: 'isInSession',
          do: 'changePage',
        },
        ZOOMED_TO_ACTUAL: {
          if: 'hasSelection',
          do: 'zoomCameraToSelectionActual',
          else: 'zoomCameraToActual',
        },
        ZOOMED_CAMERA: 'zoomCamera',
        INCREASED_CODE_FONT_SIZE: 'increaseCodeFontSize',
        DECREASED_CODE_FONT_SIZE: 'decreaseCodeFontSize',
        CHANGED_CODE_CONTROL: { to: 'updatingControls' },
        TOGGLED_TOOL_LOCK: 'toggleToolLock',
        ZOOMED_TO_SELECTION: {
          if: 'hasSelection',
          do: 'zoomCameraToSelection',
        },
        STARTED_PINCHING: {
          unless: 'isInSession',
          to: 'pinching',
        },
        ZOOMED_TO_FIT: ['zoomCameraToFit', 'zoomCameraToActual'],
        ZOOMED_IN: 'zoomIn',
        ZOOMED_OUT: 'zoomOut',
        RESET_CAMERA: 'resetCamera',
        COPIED_TO_SVG: 'copyToSvg',
        LOADED_FROM_FILE_STSTEM: 'loadFromFileSystem',
        SAVED_AS_TO_FILESYSTEM: 'saveAsToFileSystem',
        SAVED_TO_FILESYSTEM: {
          unless: 'isReadOnly',
          then: {
            if: 'isReadOnly',
            do: 'saveAsToFileSystem',
            else: 'saveToFileSystem',
          },
        },
      },
      initial: 'selecting',
      states: {
        selecting: {
          onEnter: ['setActiveToolSelect', 'clearInputs'],
          on: {
            SAVED: 'forceSave',
            DELETED: {
              unless: 'isReadOnly',
              do: 'deleteSelection',
            },
            SAVED_CODE: {
              unless: 'isReadOnly',
              do: 'saveCode',
            },
            MOVED_TO_PAGE: {
              unless: 'isReadOnly',
              if: 'hasSelection',
              do: ['moveSelectionToPage', 'zoomCameraToSelectionActual'],
            },
            MOVED: {
              unless: 'isReadOnly',
              if: 'hasSelection',
              do: 'moveSelection',
            },
            DUPLICATED: {
              unless: 'isReadOnly',
              if: 'hasSelection',
              do: 'duplicateSelection',
            },
            ROTATED_CCW: {
              unless: 'isReadOnly',
              if: 'hasSelection',
              do: 'rotateSelectionCcw',
            },
            ALIGNED: {
              unless: 'isReadOnly',
              if: 'hasMultipleSelection',
              do: 'alignSelection',
            },
            STRETCHED: {
              unless: 'isReadOnly',
              if: 'hasMultipleSelection',
              do: 'stretchSelection',
            },
            DISTRIBUTED: {
              unless: 'isReadOnly',
              if: 'hasMultipleSelection',
              do: 'distributeSelection',
            },
            GROUPED: {
              unless: 'isReadOnly',
              if: 'hasMultipleSelection',
              do: 'groupSelection',
            },
            UNGROUPED: {
              unless: 'isReadOnly',
              if: ['hasSelection', 'selectionIncludesGroups'],
              do: 'ungroupSelection',
            },
            NUDGED: { do: 'nudgeSelection' },
          },
          initial: 'notPointing',
          states: {
            notPointing: {
              onEnter: 'clearPointedId',
              on: {
                CANCELLED: 'clearSelectedIds',
                POINTED_CANVAS: { to: 'brushSelecting' },
                POINTED_BOUNDS: [
                  {
                    if: 'isPressingMetaKey',
                    to: 'brushSelecting',
                  },
                  { to: 'pointingBounds' },
                ],
                POINTED_BOUNDS_HANDLE: {
                  unless: 'isReadOnly',
                  if: 'isPointingRotationHandle',
                  to: 'rotatingSelection',
                  else: { to: 'transformingSelection' },
                },
                STARTED_EDITING_SHAPE: {
                  unless: 'isReadOnly',
                  get: 'firstSelectedShape',
                  if: ['hasSingleSelection', 'canEditSelectedShape'],
                  do: 'setEditingId',
                  to: 'editingShape',
                },
                DOUBLE_POINTED_BOUNDS_HANDLE: {
                  unless: 'isReadOnly',
                  if: 'hasSingleSelection',
                  do: 'resetShapeBounds',
                },
                POINTED_HANDLE: {
                  unless: 'isReadOnly',
                  to: 'translatingHandles',
                },
                MOVED_OVER_SHAPE: {
                  if: 'pointHitsShape',
                  then: {
                    unless: 'shapeIsHovered',
                    do: 'setHoveredId',
                  },
                  else: {
                    if: 'shapeIsHovered',
                    do: 'clearHoveredId',
                  },
                },
                UNHOVERED_SHAPE: 'clearHoveredId',
                POINTED_SHAPE: [
                  {
                    if: 'isPressingMetaKey',
                    to: 'brushSelecting',
                  },
                  'setPointedId',
                  {
                    if: 'pointInSelectionBounds',
                    to: 'pointingBounds',
                  },
                  {
                    unless: 'isPointedShapeSelected',
                    then: {
                      if: 'isPressingShiftKey',
                      do: ['pushPointedIdToSelectedIds', 'clearPointedId'],
                      else: ['clearSelectedIds', 'pushPointedIdToSelectedIds'],
                    },
                  },
                  {
                    to: 'pointingBounds',
                  },
                ],
                DOUBLE_POINTED_SHAPE: [
                  'setPointedId',
                  {
                    if: 'isPointedShapeSelected',
                    then: {
                      get: 'firstSelectedShape',
                      if: 'canEditSelectedShape',
                      do: 'setEditingId',
                      to: 'editingShape',
                    },
                  },
                  {
                    unless: 'isPressingShiftKey',
                    do: [
                      'setDrilledPointedId',
                      'clearSelectedIds',
                      'pushPointedIdToSelectedIds',
                    ],
                    to: 'pointingBounds',
                  },
                ],
                RIGHT_POINTED: [
                  {
                    if: 'isPointingCanvas',
                    do: 'clearSelectedIds',
                    else: {
                      if: 'isPointingShape',
                      then: [
                        'setPointedId',
                        {
                          unless: 'isPointedShapeSelected',
                          do: [
                            'clearSelectedIds',
                            'pushPointedIdToSelectedIds',
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
            },
            pointingBounds: {
              on: {
                CANCELLED: { to: 'notPointing' },
                STOPPED_POINTING_BOUNDS: [],
                STOPPED_POINTING: [
                  {
                    if: 'isPointingBounds',
                    do: 'clearSelectedIds',
                  },
                  {
                    if: 'isPressingShiftKey',
                    then: {
                      if: 'isPointedShapeSelected',
                      do: 'pullPointedIdFromSelectedIds',
                    },
                    else: {
                      if: 'isPointingShape',
                      do: [
                        'clearSelectedIds',
                        'setPointedId',
                        'pushPointedIdToSelectedIds',
                      ],
                    },
                  },
                  { to: 'notPointing' },
                ],
                MOVED_POINTER: {
                  unless: ['isReadOnly', 'isInSession'],
                  if: 'distanceImpliesDrag',
                  to: 'translatingSelection',
                },
              },
            },
            rotatingSelection: {
              onEnter: 'startRotateSession',
              onExit: ['completeSession', 'clearBoundsRotation'],
              on: {
                MOVED_POINTER: 'updateRotateSession',
                PANNED_CAMERA: 'updateRotateSession',
                PRESSED_SHIFT_KEY: 'keyUpdateRotateSession',
                RELEASED_SHIFT_KEY: 'keyUpdateRotateSession',
                STOPPED_POINTING: { to: 'selecting' },
                CANCELLED: { do: 'cancelSession', to: 'selecting' },
              },
            },
            transformingSelection: {
              onEnter: 'startTransformSession',
              onExit: 'completeSession',
              on: {
                // MOVED_POINTER: 'updateTransformSession', using hacks.fastTransform
                PANNED_CAMERA: 'updateTransformSession',
                PRESSED_SHIFT_KEY: 'keyUpdateTransformSession',
                RELEASED_SHIFT_KEY: 'keyUpdateTransformSession',
                STOPPED_POINTING: { to: 'selecting' },
                CANCELLED: { do: 'cancelSession', to: 'selecting' },
              },
            },
            translatingSelection: {
              onEnter: 'startTranslateSession',
              onExit: 'completeSession',
              on: {
                STARTED_PINCHING: { to: 'pinching' },
                MOVED_POINTER: 'updateTranslateSession',
                PANNED_CAMERA: 'updateTranslateSession',
                PRESSED_SHIFT_KEY: 'keyUpdateTranslateSession',
                RELEASED_SHIFT_KEY: 'keyUpdateTranslateSession',
                PRESSED_ALT_KEY: 'keyUpdateTranslateSession',
                RELEASED_ALT_KEY: 'keyUpdateTranslateSession',
                STOPPED_POINTING: { to: 'selecting' },
                CANCELLED: { do: 'cancelSession', to: 'selecting' },
              },
            },
            translatingHandles: {
              onEnter: 'startHandleSession',
              onExit: 'completeSession',
              on: {
                MOVED_POINTER: 'updateHandleSession',
                PANNED_CAMERA: 'updateHandleSession',
                PRESSED_SHIFT_KEY: 'keyUpdateHandleSession',
                RELEASED_SHIFT_KEY: 'keyUpdateHandleSession',
                STOPPED_POINTING: { to: 'selecting' },
                DOUBLE_POINTED_HANDLE: {
                  do: ['cancelSession', 'doublePointHandle'],
                  to: 'selecting',
                },
                CANCELLED: { do: 'cancelSession', to: 'selecting' },
              },
            },
            brushSelecting: {
              onExit: 'completeSession',
              onEnter: [
                {
                  unless: ['isPressingMetaKey', 'isPressingShiftKey'],
                  do: 'clearSelectedIds',
                },
                'clearBoundsRotation',
                'startBrushSession',
              ],
              on: {
                // MOVED_POINTER: 'updateBrushSession', using hacks.fastBrushSelect
                PANNED_CAMERA: 'updateBrushSession',
                STOPPED_POINTING: { to: 'selecting' },
                STARTED_PINCHING: { to: 'pinching' },
                CANCELLED: { do: 'cancelSession', to: 'selecting' },
              },
            },
            updatingControls: {
              onEnter: 'updateControls',
              async: {
                await: 'getUpdatedShapes',
                onResolve: { do: 'updateGeneratedShapes', to: 'selecting' },
              },
            },
          },
        },
        editingShape: {
          onEnter: 'startEditSession',
          onExit: ['completeSession', 'clearEditingId'],
          on: {
            EDITED_SHAPE: { do: 'updateEditSession' },

            BLURRED_EDITING_SHAPE: { to: 'selecting' },
            CANCELLED: [
              {
                get: 'editingShape',
                if: 'shouldDeleteShape',
                do: 'breakSession',
                else: 'cancelSession',
              },
              { to: 'selecting' },
            ],
          },
        },
        pinching: {
          on: {
            // PINCHED: { do: 'pinchCamera' }, using hacks.fastPinchCamera
          },
          initial: 'selectPinching',
          onExit: { secretlyDo: 'updateZoomCSS' },
          states: {
            selectPinching: {
              on: {
                STOPPED_PINCHING: { to: 'selecting' },
              },
            },
            toolPinching: {
              on: {
                STOPPED_PINCHING: { to: 'usingTool.previous' },
              },
            },
          },
        },
        usingTool: {
          initial: 'draw',
          onEnter: 'clearSelectedIds',
          on: {
            STARTED_PINCHING: {
              do: 'breakSession',
              to: 'pinching.toolPinching',
            },
            TOGGLED_TOOL_LOCK: 'toggleToolLock',
          },
          states: {
            draw: {
              onEnter: 'setActiveToolDraw',
              initial: 'creating',
              states: {
                creating: {
                  on: {
                    CANCELLED: { to: 'selecting' },
                    POINTED_SHAPE: {
                      get: 'newDraw',
                      do: 'createShape',
                      to: 'draw.editing',
                    },
                    POINTED_CANVAS: {
                      get: 'newDraw',
                      do: 'createShape',
                      to: 'draw.editing',
                    },
                  },
                },
                editing: {
                  onEnter: 'startDrawSession',
                  onExit: 'completeSession',
                  on: {
                    CANCELLED: {
                      do: 'breakSession',
                      to: 'selecting',
                    },
                    STOPPED_POINTING: {
                      do: 'completeSession',
                      to: 'draw.creating',
                    },
                    PRESSED_SHIFT: 'keyUpdateDrawSession',
                    RELEASED_SHIFT: 'keyUpdateDrawSession',
                    // MOVED_POINTER: 'updateDrawSession',
                    PANNED_CAMERA: 'updateDrawSession',
                  },
                },
              },
            },
            dot: {
              onEnter: 'setActiveToolDot',
              initial: 'creating',
              states: {
                creating: {
                  on: {
                    CANCELLED: { to: 'selecting' },
                    POINTED_SHAPE: {
                      get: 'newDot',
                      do: 'createShape',
                      to: 'dot.editing',
                    },
                    POINTED_CANVAS: {
                      get: 'newDot',
                      do: 'createShape',
                      to: 'dot.editing',
                    },
                  },
                },
                editing: {
                  on: {
                    STOPPED_POINTING: [
                      'completeSession',
                      {
                        if: 'isToolLocked',
                        to: 'dot.creating',
                        else: { to: 'selecting' },
                      },
                    ],
                    CANCELLED: {
                      do: 'breakSession',
                      to: 'selecting',
                    },
                  },
                  initial: 'inactive',
                  states: {
                    inactive: {
                      on: {
                        MOVED_POINTER: {
                          if: 'distanceImpliesDrag',
                          to: 'dot.editing.active',
                        },
                      },
                    },
                    active: {
                      onExit: 'completeSession',
                      onEnter: 'startTranslateSession',
                      on: {
                        MOVED_POINTER: 'updateTranslateSession',
                        PANNED_CAMERA: 'updateTranslateSession',
                      },
                    },
                  },
                },
              },
            },
            arrow: {
              onEnter: 'setActiveToolArrow',
              initial: 'creating',
              states: {
                creating: {
                  on: {
                    CANCELLED: { to: 'selecting' },
                    POINTED_SHAPE: {
                      get: 'newArrow',
                      do: 'createShape',
                      to: 'arrow.editing',
                    },
                    POINTED_CANVAS: {
                      get: 'newArrow',
                      do: 'createShape',
                      to: 'arrow.editing',
                    },
                  },
                },
                editing: {
                  onExit: 'completeSession',
                  onEnter: 'startArrowSession',
                  on: {
                    STOPPED_POINTING: [
                      'completeSession',
                      {
                        if: 'isToolLocked',
                        to: 'arrow.creating',
                        else: { to: 'selecting' },
                      },
                    ],
                    CANCELLED: {
                      do: 'breakSession',
                      if: 'isToolLocked',
                      to: 'arrow.creating',
                      else: { to: 'selecting' },
                    },
                    PRESSED_SHIFT: 'keyUpdateArrowSession',
                    RELEASED_SHIFT: 'keyUpdateArrowSession',
                    MOVED_POINTER: 'updateArrowSession',
                    PANNED_CAMERA: 'updateArrowSession',
                  },
                },
              },
            },
            ellipse: {
              onEnter: 'setActiveToolEllipse',
              initial: 'creating',
              states: {
                creating: {
                  on: {
                    CANCELLED: { to: 'selecting' },
                    POINTED_CANVAS: {
                      to: 'ellipse.editing',
                    },
                  },
                },
                editing: {
                  on: {
                    STOPPED_POINTING: { to: 'selecting' },
                    CANCELLED: { to: 'selecting' },
                    MOVED_POINTER: {
                      if: 'distanceImpliesDrag',
                      then: {
                        get: 'newEllipse',
                        do: 'createShape',
                        to: 'drawingShape.bounds',
                      },
                    },
                  },
                },
              },
            },
            rectangle: {
              onEnter: 'setActiveToolRectangle',
              initial: 'creating',
              states: {
                creating: {
                  on: {
                    CANCELLED: { to: 'selecting' },
                    POINTED_SHAPE: {
                      to: 'rectangle.editing',
                    },
                    POINTED_CANVAS: {
                      to: 'rectangle.editing',
                    },
                  },
                },
                editing: {
                  on: {
                    STOPPED_POINTING: { to: 'selecting' },
                    CANCELLED: { to: 'selecting' },
                    MOVED_POINTER: {
                      if: 'distanceImpliesDrag',
                      then: {
                        get: 'newRectangle',
                        do: 'createShape',
                        to: 'drawingShape.bounds',
                      },
                    },
                  },
                },
              },
            },
            text: {
              onEnter: 'setActiveToolText',
              initial: 'creating',
              states: {
                creating: {
                  on: {
                    CANCELLED: { to: 'selecting' },
                    POINTED_SHAPE: [
                      {
                        get: 'newText',
                        do: 'createShape',
                      },
                      {
                        get: 'firstSelectedShape',
                        if: 'canEditSelectedShape',
                        do: 'setEditingId',
                        to: 'editingShape',
                      },
                    ],
                    POINTED_CANVAS: [
                      {
                        get: 'newText',
                        do: 'createShape',
                        to: 'editingShape',
                      },
                    ],
                  },
                },
              },
            },
            ray: {
              onEnter: 'setActiveToolRay',
              initial: 'creating',
              states: {
                creating: {
                  on: {
                    CANCELLED: { to: 'selecting' },
                    POINTED_SHAPE: {
                      get: 'newRay',
                      do: 'createShape',
                      to: 'ray.editing',
                    },
                    POINTED_CANVAS: {
                      get: 'newRay',
                      do: 'createShape',
                      to: 'ray.editing',
                    },
                  },
                },
                editing: {
                  on: {
                    STOPPED_POINTING: { to: 'selecting' },
                    CANCELLED: { to: 'selecting' },
                    MOVED_POINTER: {
                      if: 'distanceImpliesDrag',
                      to: 'drawingShape.direction',
                    },
                  },
                },
              },
            },
            line: {
              onEnter: 'setActiveToolLine',
              initial: 'creating',
              states: {
                creating: {
                  on: {
                    CANCELLED: { to: 'selecting' },
                    POINTED_SHAPE: {
                      get: 'newLine',
                      do: 'createShape',
                      to: 'line.editing',
                    },
                    POINTED_CANVAS: {
                      get: 'newLine',
                      do: 'createShape',
                      to: 'line.editing',
                    },
                  },
                },
                editing: {
                  on: {
                    STOPPED_POINTING: { to: 'selecting' },
                    CANCELLED: { to: 'selecting' },
                    MOVED_POINTER: {
                      if: 'distanceImpliesDrag',
                      to: 'drawingShape.direction',
                    },
                  },
                },
              },
            },
            polyline: {
              onEnter: 'setActiveToolPolyline',
            },
          },
        },
        drawingShape: {
          onExit: 'completeSession',
          on: {
            STOPPED_POINTING: [
              'completeSession',
              {
                if: 'isToolLocked',
                to: 'usingTool.previous',
                else: { to: 'selecting' },
              },
            ],
            CANCELLED: {
              do: 'breakSession',
              to: 'selecting',
            },
          },
          initial: 'drawingShapeBounds',
          states: {
            bounds: {
              onEnter: 'startDrawTransformSession',
              on: {
                MOVED_POINTER: 'updateTransformSession',
                PANNED_CAMERA: 'updateTransformSession',
              },
            },
            direction: {
              onEnter: 'startDirectionSession',
              onExit: 'completeSession',
              on: {
                MOVED_POINTER: 'updateDirectionSession',
                PANNED_CAMERA: 'updateDirectionSession',
              },
            },
          },
        },
      },
    },
  },
  results: {
    newDot() {
      return ShapeType.Dot
    },
    newRay() {
      return ShapeType.Ray
    },
    newLine() {
      return ShapeType.Line
    },
    newText() {
      return ShapeType.Text
    },
    newDraw() {
      return ShapeType.Draw
    },
    newArrow() {
      return ShapeType.Arrow
    },
    newEllipse() {
      return ShapeType.Ellipse
    },
    newRectangle() {
      return ShapeType.Rectangle
    },
    firstSelectedShape(data) {
      return tld.getSelectedShapes(data)[0]
    },
    editingShape(data) {
      return tld.getShape(data, data.editingId)
    },
  },
  conditions: {
    hasRoom(_, payload: { id?: string }) {
      return payload.id !== undefined
    },
    shouldDeleteShape(data, payload, shape: Shape) {
      return getShapeUtils(shape).shouldDelete(shape)
    },
    isPointingCanvas(data, payload: PointerInfo) {
      return payload.target === 'canvas'
    },
    isPointingBounds(data, payload: PointerInfo) {
      return tld.getSelectedIds(data).size > 0 && payload.target === 'bounds'
    },
    isPointingShape(data, payload: PointerInfo) {
      return (
        payload.target &&
        payload.target !== 'canvas' &&
        payload.target !== 'bounds'
      )
    },
    isReadOnly(data) {
      return data.isReadOnly
    },
    isInSession() {
      return session.isInSession
    },
    canEditSelectedShape(data, payload, result: Shape) {
      return getShapeUtils(result).canEdit && !result.isLocked
    },
    distanceImpliesDrag(data, payload: PointerInfo) {
      return vec.dist2(payload.origin, payload.point) > 8
    },
    hasPointedTarget(data, payload: PointerInfo) {
      return payload.target !== undefined
    },
    isPointedShapeSelected(data) {
      return tld.getSelectedIds(data).has(data.pointedId)
    },
    isPressingShiftKey(data, payload: PointerInfo) {
      return payload.shiftKey
    },
    isPressingMetaKey(data, payload: PointerInfo) {
      return payload.metaKey
    },
    shapeIsHovered(data, payload: { target: string }) {
      return data.hoveredId === payload.target
    },
    pointInSelectionBounds(data, payload: PointerInfo) {
      const bounds = getSelectionBounds(data)

      if (!bounds) return false

      return pointInBounds(tld.screenToWorld(payload.point, data), bounds)
    },
    pointHitsShape(data, payload: PointerInfo) {
      const shape = tld.getShape(data, payload.target)

      return getShapeUtils(shape).hitTest(
        shape,
        tld.screenToWorld(payload.point, data)
      )
    },
    hasPointedId(data, payload: PointerInfo) {
      return tld.getShape(data, payload.target) !== undefined
    },
    isPointingRotationHandle(
      data,
      payload: { target: Edge | Corner | 'rotate' }
    ) {
      return payload.target === 'rotate'
    },
    hasSelection(data) {
      return tld.getSelectedIds(data).size > 0
    },
    hasSingleSelection(data) {
      return tld.getSelectedIds(data).size === 1
    },
    hasMultipleSelection(data) {
      return tld.getSelectedIds(data).size > 1
    },
    isToolLocked(data) {
      return data.settings.isToolLocked
    },
    isPenLocked(data) {
      return data.settings.isPenLocked
    },
    hasOnlyOnePage(data) {
      return Object.keys(data.document.pages).length === 1
    },
    selectionIncludesGroups(data) {
      return tld
        .getSelectedShapes(data)
        .some((shape) => shape.type === ShapeType.Group)
    },
  },
  actions: {
    // Networked Room
    setRtStatus(data, payload: { id: string; status: string }) {
      const { status } = payload

      if (!data.room) {
        data.room = {
          id: null,
          status: '',
          peers: {},
        }
      }

      data.room.peers = {}
      data.room.status = status
    },
    addRtShape(data, payload: { pageId: string; shape: Shape }) {
      const { pageId, shape } = payload
      // What if the page is in storage?
      data.document.pages[pageId].shapes[shape.id] = shape
    },
    deleteRtShape(data, payload: { pageId: string; shapeId: string }) {
      const { pageId, shapeId } = payload
      // What if the page is in storage?
      delete data.document[pageId].shapes[shapeId]
    },
    editRtShape(data, payload: { pageId: string; shape: Shape }) {
      const { pageId, shape } = payload
      // What if the page is in storage?
      Object.assign(data.document[pageId].shapes[shape.id], shape)
    },
    sendRtCursorMove(data, payload: PointerInfo) {
      const point = tld.screenToWorld(payload.point, data)
      pusher.moveCursor(data.currentPageId, point)
    },
    moveRtCursor(
      data,
      payload: { id: string; pageId: string; point: number[] }
    ) {
      const { room } = data

      if (room.peers[payload.id] === undefined) {
        room.peers[payload.id] = {
          id: payload.id,
          cursor: {
            point: payload.point,
          },
        }
      }

      room.peers[payload.id].cursor.point = payload.point
    },
    clearRoom(data) {
      data.room = undefined
    },
    clearDocument(data) {
      data.document.id = uniqueId()

      const newId = 'page1'

      data.currentPageId = newId

      data.document.pages = {
        [newId]: {
          id: newId,
          name: 'Page 1',
          type: 'page',
          shapes: {},
          childIndex: 1,
        },
      }

      data.pageStates = {
        [newId]: {
          id: newId,
          selectedIds: new Set(),
          camera: {
            point: [0, 0],
            zoom: 1,
          },
        },
      }
    },
    connectToRoom(data, payload: { id: string }) {
      data.room = { id: payload.id, status: 'connecting', peers: {} }
      pusher.connect(payload.id)
    },

    resetPageState(data) {
      const pageState = data.pageStates[data.currentPageId]
      data.pageStates[data.currentPageId] = { ...pageState }
    },

    toggleReadOnly(data) {
      data.isReadOnly = !data.isReadOnly
    },
    /* ---------------------- Pages --------------------- */
    changePage(data, payload: { id: string }) {
      commands.changePage(data, payload.id)
    },
    createPage(data) {
      commands.createPage(data, true)
    },
    deletePage(data, payload: { id: string }) {
      commands.deletePage(data, payload.id)
    },
    /* --------------------- Shapes --------------------- */
    resetShapes(data) {
      const page = tld.getPage(data)
      Object.values(page.shapes).forEach((shape) => {
        page.shapes[shape.id] = { ...shape }
      })
    },

    createShape(data, payload, type: ShapeType) {
      const shape = createShape(type, {
        parentId: data.currentPageId,
        point: vec.round(tld.screenToWorld(payload.point, data)),
        style: deepClone(data.currentStyle),
      })

      const siblings = tld.getChildren(data, shape.parentId)
      const childIndex = siblings.length
        ? siblings[siblings.length - 1].childIndex + 1
        : 1

      data.editingId = shape.id

      getShapeUtils(shape).setProperty(shape, 'childIndex', childIndex)

      tld.getPage(data).shapes[shape.id] = shape

      tld.setSelectedIds(data, [shape.id])
    },
    /* -------------------- Sessions -------------------- */

    // Shared
    breakSession(data) {
      session.cancel(data)
      history.disable()
      commands.deleteSelected(data)
      history.enable()
    },
    cancelSession(data) {
      session.cancel(data)
    },
    completeSession(data) {
      session.complete(data)
    },

    // Editing
    startEditSession(data) {
      session.begin(new Sessions.EditSession(data))
    },
    updateEditSession(data, payload: { change: Partial<Shape> }) {
      session.update<Sessions.EditSession>(data, payload.change)
    },

    // Brushing
    startBrushSession(data, payload: PointerInfo) {
      session.begin(
        new Sessions.BrushSession(data, tld.screenToWorld(payload.point, data))
      )
    },
    updateBrushSession(data, payload: PointerInfo) {
      session.update<Sessions.BrushSession>(
        data,
        tld.screenToWorld(payload.point, data)
      )
    },

    // Rotating
    startRotateSession(data, payload: PointerInfo) {
      session.begin(
        new Sessions.RotateSession(data, tld.screenToWorld(payload.point, data))
      )
    },
    keyUpdateRotateSession(data, payload: PointerInfo) {
      session.update<Sessions.RotateSession>(
        data,
        tld.screenToWorld(inputs.pointer.point, data),
        payload.shiftKey
      )
    },
    updateRotateSession(data, payload: PointerInfo) {
      session.update<Sessions.RotateSession>(
        data,
        tld.screenToWorld(payload.point, data),
        payload.shiftKey
      )
    },

    // Dragging / Translating
    startTranslateSession(data) {
      session.begin(
        new Sessions.TranslateSession(
          data,
          tld.screenToWorld(inputs.pointer.origin, data)
        )
      )
    },
    keyUpdateTranslateSession(
      data,
      payload: { shiftKey: boolean; altKey: boolean }
    ) {
      session.update<Sessions.TranslateSession>(
        data,
        tld.screenToWorld(inputs.pointer.point, data),
        payload.shiftKey,
        payload.altKey
      )
    },
    updateTranslateSession(data, payload: PointerInfo) {
      session.update<Sessions.TranslateSession>(
        data,
        tld.screenToWorld(payload.point, data),
        payload.shiftKey,
        payload.altKey
      )
    },

    // Handles
    doublePointHandle(data, payload: PointerInfo) {
      const id = setToArray(tld.getSelectedIds(data))[0]
      commands.doublePointHandle(data, id, payload)
    },

    // Dragging Handle
    startHandleSession(data, payload: PointerInfo) {
      const shapeId = Array.from(tld.getSelectedIds(data).values())[0]
      const handleId = payload.target

      session.begin(
        new Sessions.HandleSession(
          data,
          shapeId,
          handleId,
          tld.screenToWorld(inputs.pointer.origin, data)
        )
      )
    },
    keyUpdateHandleSession(
      data,
      payload: { shiftKey: boolean; altKey: boolean }
    ) {
      session.update<Sessions.HandleSession>(
        data,
        tld.screenToWorld(inputs.pointer.point, data),
        payload.shiftKey
      )
    },
    updateHandleSession(data, payload: PointerInfo) {
      session.update<Sessions.HandleSession>(
        data,
        tld.screenToWorld(payload.point, data),
        payload.shiftKey
      )
    },

    // Transforming
    startTransformSession(
      data,
      payload: PointerInfo & { target: Corner | Edge }
    ) {
      const point = tld.screenToWorld(inputs.pointer.origin, data)
      session.begin(
        tld.getSelectedIds(data).size === 1
          ? new Sessions.TransformSingleSession(data, payload.target, point)
          : new Sessions.TransformSession(data, payload.target, point)
      )
    },
    startDrawTransformSession(data, payload: PointerInfo) {
      session.begin(
        new Sessions.TransformSingleSession(
          data,
          Corner.BottomRight,
          tld.screenToWorld(payload.point, data),
          true
        )
      )
    },
    keyUpdateTransformSession(data, payload: PointerInfo) {
      session.update<Sessions.TransformSession>(
        data,
        tld.screenToWorld(inputs.pointer.point, data),
        payload.shiftKey
      )
    },
    updateTransformSession(data, payload: PointerInfo) {
      session.update<Sessions.TransformSession>(
        data,
        tld.screenToWorld(payload.point, data),
        payload.shiftKey
      )
    },

    // Direction
    startDirectionSession(data) {
      session.begin(
        new Sessions.DirectionSession(
          data,
          tld.screenToWorld(inputs.pointer.origin, data)
        )
      )
    },
    updateDirectionSession(data, payload: PointerInfo) {
      session.update<Sessions.DirectionSession>(
        data,
        tld.screenToWorld(payload.point, data)
      )
    },

    // Drawing
    startDrawSession(data) {
      const id = Array.from(tld.getSelectedIds(data).values())[0]
      session.begin(
        new Sessions.DrawSession(
          data,
          id,
          tld.screenToWorld(inputs.pointer.origin, data)
        )
      )
    },
    keyUpdateDrawSession(data, payload: PointerInfo) {
      session.update<Sessions.DrawSession>(
        data,
        tld.screenToWorld(inputs.pointer.point, data),
        payload.pressure,
        payload.shiftKey
      )
    },
    updateDrawSession(data, payload: PointerInfo) {
      session.update<Sessions.DrawSession>(
        data,
        tld.screenToWorld(payload.point, data),
        payload.pressure,
        payload.shiftKey
      )
    },

    // Arrow
    startArrowSession(data, payload: PointerInfo) {
      const id = Array.from(tld.getSelectedIds(data).values())[0]

      session.begin(
        new Sessions.ArrowSession(
          data,
          id,
          tld.screenToWorld(inputs.pointer.origin, data),
          payload.shiftKey
        )
      )
    },
    keyUpdateArrowSession(data, payload: PointerInfo) {
      session.update<Sessions.ArrowSession>(
        data,
        tld.screenToWorld(inputs.pointer.point, data),
        payload.shiftKey
      )
    },
    updateArrowSession(data, payload: PointerInfo) {
      session.update<Sessions.ArrowSession>(
        data,
        tld.screenToWorld(payload.point, data),
        payload.shiftKey
      )
    },

    /* -------------------- Selection ------------------- */

    // Nudges
    nudgeSelection(data, payload: { delta: number[]; shiftKey: boolean }) {
      commands.nudge(
        data,
        vec.mul(
          payload.delta,
          payload.shiftKey
            ? data.settings.nudgeDistanceLarge
            : data.settings.nudgeDistanceSmall
        )
      )
    },

    clearInputs() {
      inputs.clear()
    },

    selectAll(data) {
      const selectedIds = tld.getSelectedIds(data)
      const page = tld.getPage(data)
      selectedIds.clear()
      for (const id in page.shapes) {
        if (page.shapes[id].parentId === data.currentPageId) {
          selectedIds.add(id)
        }
      }
    },
    setHoveredId(data, payload: PointerInfo) {
      data.hoveredId = payload.target
    },
    clearHoveredId(data) {
      data.hoveredId = undefined
    },
    setPointedId(data, payload: PointerInfo) {
      data.pointedId = getPointedId(data, payload.target)
      data.currentParentId = getParentId(data, data.pointedId)
    },
    setDrilledPointedId(data, payload: PointerInfo) {
      data.pointedId = getDrilledPointedId(data, payload.target)
      data.currentParentId = getParentId(data, data.pointedId)
    },
    clearCurrentParentId(data) {
      data.currentParentId = data.currentPageId
      data.pointedId = undefined
    },
    clearPointedId(data) {
      data.pointedId = undefined
    },
    clearSelectedIds(data) {
      tld.setSelectedIds(data, [])
    },
    pullPointedIdFromSelectedIds(data) {
      const { pointedId } = data
      const selectedIds = tld.getSelectedIds(data)
      selectedIds.delete(pointedId)
    },
    pushPointedIdToSelectedIds(data) {
      tld.getSelectedIds(data).add(data.pointedId)
    },
    moveSelection(data, payload: { type: MoveType }) {
      commands.move(data, payload.type)
    },
    moveSelectionToPage(data, payload: { id: string }) {
      commands.moveToPage(data, payload.id)
    },
    alignSelection(data, payload: { type: AlignType }) {
      commands.align(data, payload.type)
    },
    stretchSelection(data, payload: { type: StretchType }) {
      commands.stretch(data, payload.type)
    },
    distributeSelection(data, payload: { type: DistributeType }) {
      commands.distribute(data, payload.type)
    },
    duplicateSelection(data) {
      commands.duplicate(data)
    },
    lockSelection(data) {
      commands.toggle(data, 'isLocked')
    },
    hideSelection(data) {
      commands.toggle(data, 'isHidden')
    },
    aspectLockSelection(data) {
      commands.toggle(data, 'isAspectRatioLocked')
    },
    deleteSelection(data) {
      commands.deleteSelected(data)
    },
    rotateSelectionCcw(data) {
      commands.rotateCcw(data)
    },
    groupSelection(data) {
      commands.group(data)
    },
    ungroupSelection(data) {
      commands.ungroup(data)
    },
    resetShapeBounds(data) {
      commands.resetBounds(data)
    },
    resetPage(data) {
      data.document.pages[data.currentPageId].shapes = {}
    },

    /* --------------------- Editing -------------------- */

    setEditingId(data) {
      const selectedShape = tld.getSelectedShapes(data)[0]
      if (getShapeUtils(selectedShape).canEdit) {
        data.editingId = selectedShape.id
      }

      tld.getPageState(data).selectedIds = new Set([selectedShape.id])
    },
    clearEditingId(data) {
      data.editingId = null
    },

    /* ---------------------- Tool ---------------------- */

    setActiveTool(data, payload: { tool: ShapeType | 'select' }) {
      data.activeTool = payload.tool
    },
    setActiveToolSelect(data) {
      data.activeTool = 'select'
    },
    setActiveToolDraw(data) {
      data.activeTool = ShapeType.Draw
    },
    setActiveToolRectangle(data) {
      data.activeTool = ShapeType.Rectangle
    },
    setActiveToolEllipse(data) {
      data.activeTool = ShapeType.Ellipse
    },
    setActiveToolArrow(data) {
      data.activeTool = ShapeType.Arrow
    },
    setActiveToolDot(data) {
      data.activeTool = ShapeType.Dot
    },
    setActiveToolPolyline(data) {
      data.activeTool = ShapeType.Polyline
    },
    setActiveToolRay(data) {
      data.activeTool = ShapeType.Ray
    },
    setActiveToolLine(data) {
      data.activeTool = ShapeType.Line
    },
    setActiveToolText(data) {
      data.activeTool = ShapeType.Text
    },

    /* --------------------- Camera --------------------- */

    zoomIn(data) {
      const camera = tld.getCurrentCamera(data)
      const i = Math.round((camera.zoom * 100) / 25)
      const center = [window.innerWidth / 2, window.innerHeight / 2]

      const p0 = tld.screenToWorld(center, data)
      camera.zoom = tld.getCameraZoom((i + 1) * 0.25)
      const p1 = tld.screenToWorld(center, data)
      camera.point = vec.add(camera.point, vec.sub(p1, p0))

      tld.setZoomCSS(camera.zoom)
    },
    zoomOut(data) {
      const camera = tld.getCurrentCamera(data)
      const i = Math.round((camera.zoom * 100) / 25)
      const center = [window.innerWidth / 2, window.innerHeight / 2]

      const p0 = tld.screenToWorld(center, data)
      camera.zoom = tld.getCameraZoom((i - 1) * 0.25)
      const p1 = tld.screenToWorld(center, data)
      camera.point = vec.add(camera.point, vec.sub(p1, p0))

      tld.setZoomCSS(camera.zoom)
    },
    zoomCameraToActual(data) {
      const camera = tld.getCurrentCamera(data)
      const center = [window.innerWidth / 2, window.innerHeight / 2]

      const p0 = tld.screenToWorld(center, data)
      camera.zoom = 1
      const p1 = tld.screenToWorld(center, data)
      camera.point = vec.add(camera.point, vec.sub(p1, p0))

      tld.setZoomCSS(camera.zoom)
    },
    zoomCameraToSelectionActual(data) {
      const camera = tld.getCurrentCamera(data)
      const bounds = tld.getSelectedBounds(data)

      const mx = (window.innerWidth - bounds.width) / 2
      const my = (window.innerHeight - bounds.height) / 2

      camera.zoom = 1
      camera.point = vec.add([-bounds.minX, -bounds.minY], [mx, my])

      tld.setZoomCSS(camera.zoom)
    },
    zoomCameraToSelection(data) {
      const camera = tld.getCurrentCamera(data)
      const bounds = tld.getSelectedBounds(data)

      const zoom = tld.getCameraZoom(
        bounds.width > bounds.height
          ? (window.innerWidth - 128) / bounds.width
          : (window.innerHeight - 128) / bounds.height
      )

      const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
      const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

      camera.zoom = zoom
      camera.point = vec.add([-bounds.minX, -bounds.minY], [mx, my])

      tld.setZoomCSS(camera.zoom)
    },
    zoomCameraToFit(data) {
      const camera = tld.getCurrentCamera(data)
      const page = tld.getPage(data)

      const shapes = Object.values(page.shapes)

      if (shapes.length === 0) {
        return
      }

      const bounds = getCommonBounds(
        ...Object.values(shapes).map((shape) =>
          getShapeUtils(shape).getBounds(shape)
        )
      )

      const zoom = tld.getCameraZoom(
        bounds.width > bounds.height
          ? (window.innerWidth - 128) / bounds.width
          : (window.innerHeight - 128) / bounds.height
      )

      const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom
      const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom

      camera.zoom = zoom
      camera.point = vec.add([-bounds.minX, -bounds.minY], [mx, my])

      tld.setZoomCSS(camera.zoom)
    },
    zoomCamera(data, payload: { delta: number; point: number[] }) {
      const camera = tld.getCurrentCamera(data)
      const next = camera.zoom - (payload.delta / 100) * camera.zoom

      const p0 = tld.screenToWorld(payload.point, data)
      camera.zoom = tld.getCameraZoom(next)
      const p1 = tld.screenToWorld(payload.point, data)
      camera.point = vec.add(camera.point, vec.sub(p1, p0))

      tld.setZoomCSS(camera.zoom)
    },
    panCamera(data, payload: { delta: number[] }) {
      const camera = tld.getCurrentCamera(data)
      camera.point = vec.sub(camera.point, vec.div(payload.delta, camera.zoom))
    },
    updateZoomCSS(data) {
      const camera = tld.getCurrentCamera(data)
      tld.setZoomCSS(camera.zoom)
    },
    pinchCamera(
      data,
      payload: {
        delta: number[]
        distanceDelta: number
        angleDelta: number
        point: number[]
      }
    ) {
      // This is usually replaced with hacks.fastPinchCamera!

      const camera = tld.getCurrentCamera(data)
      camera.point = vec.sub(camera.point, vec.div(payload.delta, camera.zoom))

      const next = camera.zoom - (payload.distanceDelta / 300) * camera.zoom

      const p0 = tld.screenToWorld(payload.point, data)
      camera.zoom = tld.getCameraZoom(next)
      const p1 = tld.screenToWorld(payload.point, data)
      camera.point = vec.add(camera.point, vec.sub(p1, p0))

      tld.setZoomCSS(camera.zoom)
    },
    resetCamera(data) {
      const camera = tld.getCurrentCamera(data)
      camera.zoom = 1
      camera.point = [window.innerWidth / 2, window.innerHeight / 2]
      document.documentElement.style.setProperty('--camera-zoom', '1')
    },

    /* ---------------------- History ---------------------- */

    // History
    popHistory() {
      history.pop()
    },
    enableHistory() {
      history.enable()
    },
    disableHistory() {
      history.disable()
    },
    undo(data) {
      history.undo(data)
    },
    redo(data) {
      history.redo(data)
    },
    resetHistory() {
      history.reset()
    },

    /* --------------------- Styles --------------------- */

    toggleStylePanel(data) {
      data.settings.isStyleOpen = !data.settings.isStyleOpen
    },
    closeStylePanel(data) {
      data.settings.isStyleOpen = false
    },
    updateStyles(data, payload: Partial<ShapeStyles>) {
      Object.assign(data.currentStyle, payload)
    },
    applyStylesToSelection(data, payload: Partial<ShapeStyles>) {
      commands.style(data, payload)
    },

    /* ---------------------- Code ---------------------- */

    closeCodePanel(data) {
      data.settings.isCodeOpen = false
    },
    openCodePanel(data) {
      data.settings.isCodeOpen = true
    },
    toggleCodePanel(data) {
      data.settings.isCodeOpen = !data.settings.isCodeOpen
    },
    setGeneratedShapes(
      data,
      payload: { shapes: Shape[]; controls: CodeControl[] }
    ) {
      commands.generate(data, payload.shapes)
    },
    updateGeneratedShapes(data, payload, result: { shapes: Shape[] }) {
      tld.setSelectedIds(data, [])

      history.disable()

      commands.generate(data, result.shapes)

      history.enable()
    },
    setCodeControls(data, payload: { controls: CodeControl[] }) {
      data.codeControls = Object.fromEntries(
        payload.controls.map((control) => [control.id, control])
      )
    },
    increaseCodeFontSize(data) {
      data.settings.fontSize++
    },
    decreaseCodeFontSize(data) {
      data.settings.fontSize--
    },
    updateControls(data, payload: { [key: string]: any }) {
      for (const key in payload) {
        data.codeControls[key].value = payload[key]
      }
    },

    /* -------------------- Settings -------------------- */

    enablePenLock(data) {
      data.settings.isPenLocked = true
    },
    disablePenLock(data) {
      data.settings.isPenLocked = false
    },
    toggleToolLock(data) {
      data.settings.isToolLocked = !data.settings.isToolLocked
    },

    /* ------------------- Clipboard -------------------- */

    copyToSvg(data) {
      clipboard.copySelectionToSvg(data)
    },

    copyToClipboard(data) {
      clipboard.copy(tld.getSelectedShapes(data))
    },

    copyStateToClipboard(data) {
      clipboard.copyStringToClipboard(JSON.stringify(data))
    },

    pasteFromClipboard() {
      clipboard.paste()
    },

    pasteShapesFromClipboard(data, payload: { shapes: Shape[] }) {
      commands.paste(data, payload.shapes)
    },

    /* ---------------------- Data ---------------------- */

    restoreSavedData(data) {
      storage.firstLoad(data)
    },

    saveToFileSystem(data) {
      storage.saveToFileSystem(data)
    },

    saveAsToFileSystem(data) {
      storage.saveAsToFileSystem(data)
    },

    loadFromFileSystem() {
      storage.loadDocumentFromFilesystem()
    },

    loadDocumentFromJson(data, payload: { json: any }) {
      storage.loadDocumentFromJson(data, payload.json)
    },

    saveAppState(data) {
      storage.saveAppStateToLocalStorage(data)
    },

    forceSave(data) {
      storage.saveToFileSystem(data)
    },

    savePage(data) {
      storage.savePage(data)
    },

    loadPage(data) {
      storage.loadPage(data)
    },

    saveCode(data, payload: { code: string }) {
      data.document.code[data.currentCodeFileId].code = payload.code
      storage.saveDocumentToLocalStorage(data)
      storage.saveAppStateToLocalStorage(data)
    },

    clearBoundsRotation(data) {
      data.boundsRotation = 0
    },
  },
  asyncs: {
    async getUpdatedShapes(data) {
      return updateFromCode(
        data,
        data.document.code[data.currentCodeFileId].code
      )
    },
  },
  values: {
    selectedIds(data) {
      return setToArray(tld.getSelectedIds(data))
    },
    selectedBounds(data) {
      return getSelectionBounds(data)
    },
    currentShapes(data) {
      const page = tld.getPage(data)

      return Object.values(page.shapes)
        .filter((shape) => shape.parentId === page.id)
        .sort((a, b) => a.childIndex - b.childIndex)
    },
    selectedStyle(data) {
      const selectedIds = setToArray(tld.getSelectedIds(data))
      const { currentStyle } = data

      if (selectedIds.length === 0) {
        return currentStyle
      }
      const page = tld.getPage(data)

      const shapeStyles = selectedIds.map((id) => page.shapes[id].style)

      const commonStyle: ShapeStyles = {} as ShapeStyles

      const overrides = new Set<string>([])

      for (const shapeStyle of shapeStyles) {
        for (const key in currentStyle) {
          if (overrides.has(key)) continue
          if (commonStyle[key] === undefined) {
            commonStyle[key] = shapeStyle[key]
          } else {
            if (commonStyle[key] === shapeStyle[key]) continue
            commonStyle[key] = currentStyle[key]
            overrides.add(key)
          }
        }
      }

      return commonStyle
    },
  },
})

export default state

export const useSelector = createSelectorHook(state)

function getParentId(data: Data, id: string) {
  const shape = tld.getPage(data).shapes[id]
  return shape.parentId
}

function getPointedId(data: Data, id: string) {
  const shape = tld.getPage(data).shapes[id]
  if (!shape) return id

  return shape.parentId === data.currentParentId ||
    shape.parentId === data.currentPageId
    ? id
    : getPointedId(data, shape.parentId)
}

function getDrilledPointedId(data: Data, id: string) {
  const shape = tld.getPage(data).shapes[id]
  return shape.parentId === data.currentPageId ||
    shape.parentId === data.pointedId ||
    shape.parentId === data.currentParentId
    ? id
    : getDrilledPointedId(data, shape.parentId)
}

// function hasPointedIdInChildren(data: Data, id: string, pointedId: string) {
//   const shape = getPage(data).shapes[id]

//   if (shape.type !== ShapeType.Group) {
//     return false
//   }

//   if (shape.children.includes(pointedId)) {
//     return true
//   }

//   return shape.children.some((childId) =>
//     hasPointedIdInChildren(data, childId, pointedId)
//   )
// }

function getSelectionBounds(data: Data) {
  const selectedIds = tld.getSelectedIds(data)

  const page = tld.getPage(data)

  const shapes = tld.getSelectedShapes(data)

  if (selectedIds.size === 0) return null

  if (selectedIds.size === 1) {
    if (!shapes[0]) {
      console.warn('Could not find that shape! Clearing selected IDs.')
      tld.setSelectedIds(data, [])
      return null
    }

    const shape = shapes[0]
    const shapeUtils = getShapeUtils(shape)

    if (!shapeUtils.canTransform) return null

    let bounds = shapeUtils.getBounds(shape)

    let parentId = shape.parentId

    while (parentId !== data.currentPageId) {
      const parent = page.shapes[parentId]

      bounds = rotateBounds(
        bounds,
        getBoundsCenter(getShapeUtils(parent).getBounds(parent)),
        parent.rotation
      )

      bounds.rotation = parent.rotation

      parentId = parent.parentId
    }

    return bounds
  }

  const uniqueSelectedShapeIds: string[] = Array.from(
    new Set(
      Array.from(selectedIds.values()).flatMap((id) =>
        tld.getDocumentBranch(data, id)
      )
    ).values()
  )

  const commonBounds = getCommonBounds(
    ...uniqueSelectedShapeIds
      .map((id) => page.shapes[id])
      .filter((shape) => shape.type !== ShapeType.Group)
      .map((shape) => getShapeUtils(shape).getRotatedBounds(shape))
  )

  return commonBounds
}

// state.enableLog(true)
// state.onUpdate((s) => console.log(s.log.filter((l) => l !== 'MOVED_POINTER')))
