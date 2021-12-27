import * as React from 'react'
import { TLPerformance } from '~types'

export function usePerformanceCss(
  performanceMode: TLPerformance | undefined,
  rContainer: React.ForwardedRef<HTMLDivElement>
) {
  React.useLayoutEffect(() => {
    if (rContainer && 'current' in rContainer) {
      const container = rContainer?.current
      if (!container) return
      switch (performanceMode) {
        case TLPerformance.TransformSelected: {
          container.style.setProperty('--tl-performance-all', 'auto')
          container.style.setProperty('--tl-performance-selected', 'transform, contents')
          break
        }
        case TLPerformance.TransformAll: {
          container.style.setProperty('--tl-performance-all', 'transform, contents')
          container.style.setProperty('--tl-performance-selected', 'transform, contents')
          break
        }
        case TLPerformance.TranslateSelected: {
          container.style.setProperty('--tl-performance-all', 'auto')
          container.style.setProperty('--tl-performance-selected', 'transform')
          break
        }
        case TLPerformance.TranslateAll: {
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
  }, [performance])
}
