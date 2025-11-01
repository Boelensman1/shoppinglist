'use client'

import { useSyncExternalStore } from 'react'

export const useMediaQuery = (query: string, defaultVal = true): boolean => {
  return useSyncExternalStore(
    // subscribe function
    (callback) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', callback)
      return () => media.removeEventListener('change', callback)
    },
    // getSnapshot function (client-side)
    () => window.matchMedia(query).matches,
    // getServerSnapshot function (SSR)
    () => defaultVal,
  )
}
