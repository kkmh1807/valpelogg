import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth";

async function logout() {
  "use server";
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

export function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit" className="btn btn-ghost text-sm">
        Logg ut
      </button>
    </form>
  );
}
