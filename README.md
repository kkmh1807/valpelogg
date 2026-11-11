# Valpelogg

Enkel norsk webapp for daglig valpelogg: **lur**, **turer** (tisset/bæsjet) og **måltider**. Kalender dag-for-dag. Bygget med Next.js (App Router), TypeScript, Tailwind og Turso (libSQL).

## Features

- **Lur:** «Start lur» / «Avslutt lur» med enhetens klokke. Pågående lur vises tydelig (`end_at` = null).
- **Tur:** «Ny tur» logger tidspunkt. Tisset/bæsjet som toggles før logging og på hver rad.
- **Måltid:** «Måltid» logger kun `fed_at`.
- **Kalender:** hovednavigasjon med aktivitetsprikker (lur / tur / måltid).
- **Endre / slett:** «Slett» med bekreftelse, «Endre tid» som sekundær handling. Manuell tid for lur/tur under «Manuell tid».
- Dobbelttrykk-beskyttelse: klient-lås + same-second dedupe på server.
- **Passordbeskyttelse:** sett `SITE_PASSWORD` for å kreve innlogging (cookie-sesjon, 14 dager).

## Kom i gang lokalt

```bash
npm install
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000).

Uten Turso-hemmeligheter kjører appen i **demomodus** mot `data/local.db` (banner vises øverst).

### Scripts

| Script        | Beskrivelse              |
| ------------- | ------------------------ |
| `npm run dev` | Utviklingsserver         |
| `npm run build` | Produksjonsbygg        |
| `npm run start` | Kjør produksjonsbygg   |
| `npm run lint`  | ESLint                 |

## Environment variables

| Variabel             | Påkrevd i prod | Beskrivelse                                      |
| -------------------- | -------------- | ------------------------------------------------ |
| `TURSO_DATABASE_URL` | Ja             | Turso/libSQL database-URL (`libsql://…`)         |
| `TURSO_AUTH_TOKEN`   | Ja             | Auth-token fra Turso-dashboard                   |
| `SITE_PASSWORD`      | Ja (anbefalt)  | Felles passord for innlogging — del kun med ønskede besøkende |

Uten `SITE_PASSWORD` er appen åpen (praktisk lokalt). Med verdien satt låses alle sider og API-er bak `/login`.

Kopier `.env.example` til `.env.local` og fyll inn verdier:

```bash
cp .env.example .env.local
```

**Ikke** commit ekte hemmeligheter. Appen finner ikke opp token-verdier for deg.

### Schema

Schema ligger i `sql/schema.sql` og bootstrappes automatisk ved første databasekall:

- `sleep_sessions` — id, day, start_at, end_at (nullable), notes
- `walks` — id, day, started_at, peed, pooped, notes
- `meals` — id, day, fed_at

## Deploy til Vercel + Turso

### 1. Opprett Turso-database

1. Logg inn på [turso.tech](https://turso.tech) / installer Turso CLI.
2. Opprett database, f.eks. `turso db create valpelogg`.
3. Hent URL: `turso db show valpelogg --url`
4. Opprett token: `turso db tokens create valpelogg`

### 2. GitHub (hvis ikke allerede pushet)

```bash
git remote add origin https://github.com/<bruker>/valpelogg.git
git push -u origin master
```

### 3. Vercel

1. Importer repoet i [vercel.com](https://vercel.com).
2. Framework: Next.js (autodetekteres).
3. Under **Environment Variables**, legg inn:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `SITE_PASSWORD` (velg et sterkt passord du deler med de som skal logge)
4. Deploy.

Lokal fil-DB (`file:./data/local.db`) er **ikke** egnet på Vercel — bruk alltid Turso i produksjon.

## Tech

- Next.js App Router + TypeScript + Tailwind
- `@libsql/client` (Turso / lokal SQLite)
- Norsk UI (`nb`)
- Vercel-klar (ingen custom long-lived server)

## License

Privat prosjekt — bruk fritt til eget formål.
