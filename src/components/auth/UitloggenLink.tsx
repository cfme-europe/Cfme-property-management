import Link from "next/link";

export default function UitloggenLink() {
  return (
    <Link
      href="/uitloggen"
      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
    >
      Uitloggen
    </Link>
  );
}
