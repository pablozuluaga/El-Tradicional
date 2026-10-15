import { useSyncExternalStore } from 'react'
import { printer } from './printer.ts'

export const usePrinter = () => useSyncExternalStore(printer.subscribe, printer.getState)
