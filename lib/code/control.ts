import {
  CodeControl,
  ControlType,
  NumberCodeControl,
  VectorCodeControl,
} from 'types'
import { v4 as uuid } from 'uuid'

export const controls: Record<string, any> = {}

export const codeControls = new Set<CodeControl>([])

export class Control<T extends CodeControl> {
  control: T

  constructor(control: Omit<T, 'id'>) {
    this.control = { ...control, id: uniqueId() } as T
    codeControls.add(this.control)

    // Could there be a better way to prevent this?
    // When updating, constructor should just bind to
    // the existing control rather than creating a new one?
    if (!(window as any).isUpdatingCode) {
      controls[this.control.label] = this.control.value
    }
  }

  destroy() {
    codeControls.delete(this.control)
    delete controls[this.control.label]
  }
}

export class NumberControl extends Control<NumberCodeControl> {
  constructor(options: Omit<NumberCodeControl, 'id' | 'type'>) {
    const { value = 0, step = 1 } = options
    super({
      type: ControlType.Number,
      ...options,
      value,
      step,
    })
  }
}

export class VectorControl extends Control<VectorCodeControl> {
  constructor(options: Omit<VectorCodeControl, 'id' | 'type'>) {
    const { value = [0, 0], isNormalized = false } = options
    super({
      type: ControlType.Vector,
      ...options,
      value,
      isNormalized,
    })
  }
}
