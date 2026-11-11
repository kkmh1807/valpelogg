/** True when Turso env is missing — app uses local file DB for demo/dev. */
export const isDemoMode = !process.env.TURSO_DATABASE_URL;
