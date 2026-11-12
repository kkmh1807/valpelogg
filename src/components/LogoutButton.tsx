import { logoutAction } from "@/lib/logout-action";

type Props = {
  className?: string;
  label?: string;
};

export function LogoutButton({
  className = "btn btn-ghost text-sm",
  label = "Logg ut",
}: Props) {
  return (
    <form action={logoutAction}>
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
