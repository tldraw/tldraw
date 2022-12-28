import React, { forwardRef } from 'react'
import { IconProps } from '../types'

export const StarIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = 'currentColor', ...props }, forwardedRef) => {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M11.579 4.435a1.08 1.08 0 0 0-.289.209c-.071.075-.615.847-1.21 1.716S8.935 8.006 8.858 8.086c-.078.08-.199.174-.269.207-.071.034-.966.308-1.989.609-1.023.301-1.936.584-2.029.627-.487.228-.705.872-.456 1.35.047.09.627.866 1.288 1.725.662.858 1.241 1.645 1.287 1.748.083.188.083.191.031 2.297-.058 2.362-.059 2.348.203 2.647.204.231.45.344.75.344.203 0 .495-.093 2.15-.686 1.733-.621 1.941-.686 2.176-.687.236 0 .437.064 2.174.687 1.663.596 1.945.686 2.151.686a.998.998 0 0 0 .766-.36c.245-.287.245-.286.188-2.63l-.052-2.11.084-.19c.047-.105.626-.892 1.287-1.75.661-.857 1.241-1.632 1.287-1.721.249-.478.031-1.123-.456-1.35-.093-.043-1.006-.325-2.029-.627-1.023-.301-1.918-.575-1.989-.609a1.164 1.164 0 0 1-.269-.207c-.077-.08-.627-.857-1.222-1.726s-1.14-1.641-1.21-1.716c-.184-.196-.402-.282-.71-.282-.167 0-.318.026-.421.073m1.385 3.171c.534.779 1.033 1.463 1.162 1.593.413.414.505.449 3.767 1.406.149.044.266.094.26.112-.007.017-.445.592-.973 1.278-1.037 1.346-1.21 1.6-1.316 1.937-.124.394-.134.666-.089 2.342.025.909.036 1.658.025 1.664-.011.006-.668-.222-1.46-.506-1.587-.57-1.929-.672-2.246-.672-.118 0-.214-.018-.214-.04 0-.022-.024-.04-.053-.04-.029 0-.853.285-1.83.634-.977.349-1.787.624-1.799.61-.012-.013-.001-.762.025-1.664.047-1.661.037-1.932-.087-2.328-.106-.338-.279-.592-1.329-1.955-.535-.695-.965-1.273-.954-1.283.01-.01.687-.216 1.503-.457a63.227 63.227 0 0 0 1.7-.519c.289-.108.664-.355.877-.578.096-.1.594-.793 1.106-1.541.512-.747.944-1.359.96-1.359.016 0 .45.615.965 1.366"
          fillRule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)
