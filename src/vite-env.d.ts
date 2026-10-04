/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // Auditoria UX P4: opt-in explícito para o modo demo (localStorage).
  // Deve ser definido apenas em .env.local de desenvolvimento ("true").
  // Nunca definir em produção/Vercel.
  readonly VITE_DEMO_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
