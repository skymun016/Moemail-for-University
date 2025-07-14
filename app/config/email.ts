export const EMAIL_CONFIG = {
  MAX_ACTIVE_EMAILS: 0, // Maximum number of active emails (0 = no emails allowed by default)
  POLL_INTERVAL: 10_000, // Polling interval in milliseconds
} as const

export type EmailConfig = typeof EMAIL_CONFIG 