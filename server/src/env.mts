import { z } from 'zod'

const envSchema = z.object({
  PORT: z.string().optional().default('1222').transform(Number),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_VAPID_PUBLIC_KEY is required'),
  VAPID_PRIVATE_KEY: z.string().min(1, 'VAPID_PRIVATE_KEY is required'),
})

function validateEnv() {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    console.error(result.error.format())
    process.exit(1)
  }

  return result.data
}

export const env = validateEnv()
