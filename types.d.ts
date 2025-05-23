/// <reference types="@cloudflare/workers-types" />


declare global {
  interface CloudflareEnv {
    DB: D1Database;
    SITE_CONFIG: KVNamespace;
    BREVO_API_KEY: string;
  }

  type Env = CloudflareEnv
}

declare module "next-auth" {
  interface User {
    roles?: { name: string }[]
    username?: string | null
  }
  
  interface Session {
    user: User
  }
}

export type { Env }