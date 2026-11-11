import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="font-[family-name:var(--font-fraunces)] text-4xl text-pine-deep">
        Fant ikke siden
      </h1>
      <p className="mt-3 text-muted">Sjekk datoen eller gå tilbake til forsiden.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Til Valpelogg
      </Link>
    </main>
  );
}
