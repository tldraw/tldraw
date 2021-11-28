import { action, makeAutoObservable } from 'mobx'

interface TDSettings {
  isDarkMode: boolean
  isDebugMode: boolean
  isPenMode: boolean
  isReadonlyMode: boolean
  isZoomSnap: boolean
  nudgeDistanceSmall: number
  nudgeDistanceLarge: number
  isFocusMode: boolean
  isSnapping: boolean
  showRotateHandles: boolean
  showBindingHandles: boolean
  showCloneHandles: boolean
  showGrid: boolean
}

export class Settings implements TDSettings {
  isPenMode
  isDarkMode
  isZoomSnap
  isFocusMode
  isSnapping
  isDebugMode
  isReadonlyMode
  nudgeDistanceLarge
  nudgeDistanceSmall
  showRotateHandles
  showBindingHandles
  showCloneHandles
  showGrid

  constructor(opts = {} as Partial<TDSettings>) {
    const {
      isPenMode,
      isDarkMode,
      isZoomSnap,
      isFocusMode,
      isSnapping,
      isDebugMode,
      isReadonlyMode,
      nudgeDistanceLarge,
      nudgeDistanceSmall,
      showRotateHandles,
      showBindingHandles,
      showCloneHandles,
      showGrid,
    } = { ...opts, ...Settings.defaultProps }

    this.isPenMode = isPenMode
    this.isDarkMode = isDarkMode
    this.isZoomSnap = isZoomSnap
    this.isFocusMode = isFocusMode
    this.isSnapping = isSnapping
    this.isDebugMode = isDebugMode
    this.isReadonlyMode = isReadonlyMode
    this.nudgeDistanceLarge = nudgeDistanceLarge
    this.nudgeDistanceSmall = nudgeDistanceSmall
    this.showRotateHandles = showRotateHandles
    this.showBindingHandles = showBindingHandles
    this.showCloneHandles = showCloneHandles
    this.showGrid = showGrid

    makeAutoObservable(this)
  }

  @action update = (change: Partial<TDSettings>) => {
    Object.assign(this, change)
  }

  static defaultProps: TDSettings = {
    isPenMode: false,
    isDarkMode: false,
    isZoomSnap: false,
    isFocusMode: false,
    isSnapping: false,
    isDebugMode: process.env.NODE_ENV === 'development',
    isReadonlyMode: false,
    nudgeDistanceLarge: 16,
    nudgeDistanceSmall: 1,
    showRotateHandles: true,
    showBindingHandles: true,
    showCloneHandles: false,
    showGrid: false,
  }
}
