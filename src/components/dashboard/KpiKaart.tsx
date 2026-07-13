type Props = {
  titel: string;
  waarde: number | string;
  toelichting: string;
  href?: string;
  accent?: "groen" | "amber" | "rood" | "blauw";
};

const accenten = {
  groen:
    "border-emerald-200 bg-emerald-50 text-emerald-900",
  amber:
    "border-amber-200 bg-amber-50 text-amber-900",
  rood:
    "border-red-200 bg-red-50 text-red-900",
  blauw:
    "border-blue-200 bg-blue-50 text-blue-900",
};

export default function KpiKaart({
  titel,
  waarde,
  toelichting,
  accent = "groen",
}: Props) {
  return (
    <article
      className={`rounded-2xl border p-5 ${accenten[accent]}`}
    >
      <p className="text-sm font-semibold">
        {titel}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {waarde}
      </p>

      <p className="mt-2 text-sm opacity-75">
        {toelichting}
      </p>
    </article>
  );
}
