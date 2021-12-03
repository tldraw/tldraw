/* eslint-disable @typescript-eslint/no-explicit-any */
import { observable, makeObservable, action } from 'mobx'

export interface TLNuSettingsProps {
  mode: 'light' | 'dark'
  showGrid: boolean
}

export class TLNuSettings implements TLNuSettingsProps {
  constructor() {
    makeObservable(this)
  }

  @observable mode: 'dark' | 'light' = 'light'
  @observable showGrid = false

  @action update(props: Partial<TLNuSettingsProps>): void {
    Object.assign(this, props)
  }
}
