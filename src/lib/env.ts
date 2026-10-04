// Which deployment is this? One answer for server and browser code alike.
//
//   production  → the `main` branch on tapaway.today
//   preview     → any other branch on Vercel (the `dev` branch on dev.tapaway.today)
//   development → your machine (`pnpm dev`), where Vercel's vars aren't set
//
// Vercel sets VERCEL_ENV for the server and, because "Enable access to System
// Environment Variables" is on, NEXT_PUBLIC_VERCEL_ENV for the browser. The
// NEXT_PUBLIC_ names must be written out literally so Next can inline them at
// build time — don't refactor these into a lookup by key.

export type AppEnv = 'production' | 'preview' | 'development';

function toAppEnv(value: string | undefined): AppEnv {
  return value === 'production' || value === 'preview' ? value : 'development';
}

export const appEnv: AppEnv = toAppEnv(process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV);

export const isProduction = appEnv === 'production';
export const isPreview = appEnv === 'preview';
export const isDevelopment = appEnv === 'development';

/** The Git branch this deployment was built from; undefined locally. */
export const gitBranch: string | undefined =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ?? process.env.VERCEL_GIT_COMMIT_REF;

/** True on the long-lived `dev` branch (dev.tapaway.today), not other previews. */
export const isDevBranch = isPreview && gitBranch === 'dev';

/** Short label for logs, badges and alerts: "production", "preview (dev)", "development". */
export const envLabel = isPreview && gitBranch ? `preview (${gitBranch})` : appEnv;
