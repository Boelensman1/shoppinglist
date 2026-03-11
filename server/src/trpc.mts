import { initTRPC } from '@trpc/server'
import type { CreateWSSContextFnOptions } from '@trpc/server/adapters/ws'

export interface Context {
  sessionId: string
}

export const createContext = (opts: CreateWSSContextFnOptions): Context => ({
  sessionId: (opts.info.connectionParams?.sessionId as string) ?? 'unknown',
})

const t = initTRPC.context<Context>().create()
export const router = t.router
const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  console.log(`[${type}] ${path}`)
  return next()
})

export const publicProcedure =
  process.env.NODE_ENV === 'development'
    ? t.procedure.use(loggerMiddleware)
    : t.procedure
