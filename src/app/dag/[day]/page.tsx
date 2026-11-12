import { notFound } from "next/navigation";
import { DayLog } from "@/components/DayLog";
import { SiteHeader } from "@/components/SiteHeader";
import { formatDayHeading, isValidDayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ day: string }>;
};

export default async function DayPage({ params }: Props) {
  const { day } = await params;
  if (!isValidDayKey(day)) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-0 sm:px-6">
      <SiteHeader title={formatDayHeading(day)} />
      <DayLog key={day} day={day} />
    </main>
  );
}
