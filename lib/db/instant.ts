// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { init } from '@instantdb/react'

export const APP_ID = 'b49bde92-c34b-445c-a956-3b8431e4eb25'

// Using untyped init to avoid schema version conflicts.
// The schema definition in schema.ts is the authoritative reference,
// but we don't pass it to init() to keep this version-agnostic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = init({ appId: APP_ID }) as any
