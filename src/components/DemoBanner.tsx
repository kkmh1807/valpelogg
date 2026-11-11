export function DemoBanner() {
  return (
    <div className="bg-honey/15 text-ink border-b border-honey/25 px-4 py-2 text-center text-sm">
      Demomodus — lokal database (<code className="text-xs">data/local.db</code>
      ). Sett <code className="text-xs">TURSO_DATABASE_URL</code> og{" "}
      <code className="text-xs">TURSO_AUTH_TOKEN</code> for produksjon.
    </div>
  );
}
