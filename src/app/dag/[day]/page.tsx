import Link from "next/link";
import { notFound } from "next/navigation";
import { DayLog } from "@/components/DayLog";
import { SiteHeader } from "@/components/SiteHeader";
import { isValidDayKey, toDayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ day: string }>;
};

export default async function DayPage({ params }: Props) {
  const { day } = await params;
  if (!isValidDayKey(day)) notFound();

  const today = toDayKey();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6 sm:px-6">
      <SiteHeader
        backHref="/"
        rightSlot={
          day !== today ? (
            <Link
              href={`/dag/${today}`}
              className="text-muted underline-offset-2 hover:text-pine hover:underline"
            >
              Gå til i dag
            </Link>
          ) : null
        }
      />
      <DayLog day={day} />
    </main>
  );
}
