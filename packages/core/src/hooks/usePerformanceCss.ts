import * as React from 'react'
import { TLPerformanceMode } from '~types'

export function usePerformanceCss(
  performanceMode: TLPerformanceMode | undefined,
  rContainer: React.ForwardedRef<HTMLDivElement>
) {
  React.useLayoutEffect(() => {
    if (rContainer && 'current' in rContainer) {
      const container = rContainer?.current
      if (!container) return
      switch (performanceMode) {
        case TLPerformanceMode.TransformSelected: {
          container.style.setProperty('--tl-performance-all', 'auto')
          container.style.setProperty('--tl-performance-selected', 'transform, contents')
          break
        }
        case TLPerformanceMode.TransformAll: {
          container.style.setProperty('--tl-performance-all', 'transform, contents')
          container.style.setProperty('--tl-performance-selected', 'transform, contents')
          break
        }
        case TLPerformanceMode.TranslateSelected: {
          container.style.setProperty('--tl-performance-all', 'auto')
          container.style.setProperty('--tl-performance-selected', 'transform')
          break
        }
        case TLPerformanceMode.TranslateAll: {
          container.style.setProperty('--tl-performance-all', 'transform')
          container.style.setProperty('--tl-performance-selected', 'transform')
          break
        }
        default: {
          container.style.setProperty('--tl-performance-all', 'auto')
          container.style.setProperty('--tl-performance-selected', 'auto')
        }
      }
    }
  }, [performanceMode])
}
