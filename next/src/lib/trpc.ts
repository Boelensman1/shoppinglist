import { createTRPCClient, wsLink, createWSClient } from '@trpc/client'
import type { AppRouter } from 'server/router'

const sessionId = crypto.randomUUID()

export function createTrpcClient(
  url: string,
  opts?: { onOpen?: () => void; onClose?: () => void },
) {
  const wsClient = createWSClient({
    url,
    connectionParams: () => ({ sessionId }),
    onOpen: opts?.onOpen,
    onClose: opts?.onClose,
  })
  return {
    client: createTRPCClient<AppRouter>({
      links: [wsLink({ client: wsClient })],
    }),
    wsClient,
  }
}

export type TrpcClient = ReturnType<typeof createTrpcClient>
