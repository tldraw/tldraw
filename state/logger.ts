import { Data } from 'types'
import clipboard from './clipboard'
import state from './state'
import { isDraft, current } from 'immer'
import { setToArray } from 'utils'
import tld from 'utils/tld'
import inputs from './inputs'

interface LogEntry {
  eventName: string
  payload: any
  time: number
  didCauseUpdate: boolean
}

class Logger {
  filters = new Set([
    // 'MOVED_OVER_SHAPE',
    // 'RESIZED_WINDOW',
    // 'HOVERED_SHAPE',
    // 'UNHOVERED_SHAPE',
    // 'PANNED_CAMERA',
    'STARTED_LOGGING',
    'STOPPED_LOGGING',
  ])

  snapshotStart: Data
  snapshotEnd: Data

  log: LogEntry[] = []

  isSimulating = false

  isRunning = false

  speed = 0

  startTime = 0

  /**
   * Start the logger.
   *
   * ### Example
   *
   *```ts
   * logger.start()
   *```
   */
  start = (data: Data): Logger => {
    if (this.isRunning) return

    this.isRunning = true

    this.snapshotStart = isDraft(data) ? current(data) : data

    this.log = []

    this.startTime = Date.now()

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.snapshotStart.pageStates[data.currentPageId].selectedIds = setToArray(
      tld.getSelectedIds(data)
    )

    return this
  }

  /**
   * Stop the logger.
   *
   * ### Example
   *
   *```ts
   * logger.stop()
   *```
   */
  stop = (data: Data): Logger => {
    if (!this.isRunning) return

    this.isRunning = false

    this.snapshotEnd = isDraft(data) ? current(data) : data

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.snapshotEnd.pageStates[data.currentPageId].selectedIds = setToArray(
      tld.getSelectedIds(data)
    )

    // if (window.confirm('Stopped logging. Copy to clipboard?')) {
    //   this.copyToJson()
    // }

    return this
  }

  /**
   * Add an event and payload to the log.
   *
   * ### Example
   *
   *```ts
   * logger.addToLog(eventName, payload)
   *```
   */
  addToLog(event: string, payload: any, didCauseUpdate = false) {
    if (!this.isRunning) return

    if (this.filters.has(event)) return

    didCauseUpdate
    // if (!didCauseUpdate) return

    this.log.push({
      eventName: event,
      payload: payload,
      time: Date.now() - this.startTime,
      didCauseUpdate: true,
    })
  }

  /**
   * Play back a log entry.
   *
   * ### Example
   *
   *```ts
   * logger.playback(log)
   *```
   */
  playback = (data: Data, log: string): Logger => {
    const parsed: { start: Data; end: Data; events: LogEntry[] } =
      JSON.parse(log)

    const { start, events } = parsed

    this.isSimulating = true

    try {
      data.pageStates[data.currentPageId].selectedIds = new Set(
        start.pageStates[start.currentPageId].selectedIds
      )

      state.send('RESET_DOCUMENT_STATE').forceData(start)

      const pointerDowns = [
        'POINTED_CANVAS',
        'POINTED_SHAPE',
        'POINTED_BOUNDS',
        'DOUBLE_POINTED_SHAPE',
        'POINTED_HANDLE',
        'RIGHT_POINTED',
      ]

      const pointerChanges = [
        ...pointerDowns,
        'MOVED_POINTER',
        'MOVED_OVER_SHAPE',
        'STOPPED_POINTING',
        'DOUBLE_POINTED_CANVAS',
      ]

      const pointerUps = ['STOPPED_POINTING']

      for (const event of events) {
        if (pointerDowns.includes(event.eventName)) {
          inputs.pointer.origin = event.payload.point
        }

        if (pointerChanges.includes(event.eventName)) {
          inputs.activePointerId = event.payload.pointerId
          inputs.pointer = { ...inputs.pointer, ...event.payload }
          inputs.points[event.payload.pointerId] = inputs.pointer
        }

        if (pointerUps.includes(event.eventName)) {
          delete inputs.points[event.payload.pointerId]
          delete inputs.activePointerId

          // TODO: Double pointing
        }

        state.send(event.eventName, event.payload)
      }

      setTimeout(
        () => (this.isSimulating = false),
        events[events.length - 1].time + 1
      )
    } catch (e) {
      console.warn('Could not play back that state.')
    }

    return this
  }

  /**
   * Export the log as JSON.
   *
   * ### Example
   *
   *```ts
   * logger.toJson()
   *```
   */
  copyToJson = () => {
    const logAsString = JSON.stringify({
      start: this.snapshotStart,
      end: this.snapshotEnd,
      events: this.log,
    })

    clipboard.copyStringToClipboard(logAsString)

    return logAsString
  }

  /**
   * Add a new event filter. Filtered events will not be logged.
   *
   * ### Example
   *
   *```ts
   * logger.addFilter("SOME_EVENT")
   *```
   */
  addFilter(eventName: string) {
    this.filters.add(eventName)
  }

  /**
   * Remove an event from the filters. Filtered events will not be logged.
   *
   * ### Example
   *
   *```ts
   * logger.removeFilter("SOME_EVENT")
   *```
   */
  removeFilter(eventName: string) {
    this.filters.delete(eventName)
  }

  /**
   * Replace all of the filtered events.
   *
   * ### Example
   *
   *```ts
   * logger.setFilters(["SOME_EVENT", "SOME_OTHER_EVENT"])
   *```
   */
  setFilters(eventNames: string[]) {
    this.filters = new Set(eventNames)
  }

  /**
   * Clear the current set of event filters.
   *
   * ### Example
   *
   *```ts
   * logger.clear()
   *```
   */
  clearFilters() {
    this.filters.clear()
  }
}

export default new Logger()
