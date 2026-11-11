import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  createSessionValue,
  getSitePassword,
  isAuthEnabled,
} from "@/lib/auth";

async function login(formData: FormData) {
  "use server";

  const expected = getSitePassword();
  if (!expected) redirect("/login");

  const password = String(formData.get("password") ?? "");
  if (password !== expected) {
    redirect("/login?feil=1");
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionValue(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/");
}

type Props = {
  searchParams: Promise<{ feil?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const enabled = isAuthEnabled();
  const { feil } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <h1 className="font-[family-name:var(--font-fraunces)] text-3xl text-pine-deep">
        🐶 Valpelogg
      </h1>
      <p className="mt-2 text-muted">Skriv passordet for å åpne loggen.</p>

      {!enabled ? (
        <p className="mt-6 text-sm text-muted">
          Sett <code className="text-xs">SITE_PASSWORD</code> i miljøvariabler
          for å låse appen.
        </p>
      ) : (
        <form action={login} className="mt-6 space-y-3">
          <input
            type="password"
            name="password"
            required
            autoFocus
            autoComplete="current-password"
            placeholder="Passord"
            className="w-full rounded-xl border border-pine/20 bg-white px-3 py-2.5 text-ink outline-none focus:ring-2 focus:ring-pine/30"
          />
          {feil ? (
            <p className="text-sm text-warn">Feil passord. Prøv igjen.</p>
          ) : null}
          <button type="submit" className="btn btn-primary w-full">
            Åpne
          </button>
        </form>
      )}
    </main>
  );
}
