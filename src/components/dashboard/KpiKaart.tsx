import Link from "next/link";

type Props = {
  titel: string;
  waarde: number | string;
  toelichting: string;
  href?: string;
  accent?: "groen" | "amber" | "rood" | "blauw";
};

const accenten = {
  groen: {
    kaart:
      "border-emerald-200 bg-emerald-50 text-emerald-950",
    icoon: "bg-emerald-200 text-emerald-900",
  },
  amber: {
    kaart:
      "border-amber-200 bg-amber-50 text-amber-950",
    icoon: "bg-amber-200 text-amber-900",
  },
  rood: {
    kaart:
      "border-red-200 bg-red-50 text-red-950",
    icoon: "bg-red-200 text-red-900",
  },
  blauw: {
    kaart:
      "border-blue-200 bg-blue-50 text-blue-950",
    icoon: "bg-blue-200 text-blue-900",
  },
};

function Inhoud({
  titel,
  waarde,
  toelichting,
  accent,
  heeftLink,
}: Omit<Props, "href"> & {
  accent: NonNullable<Props["accent"]>;
  heeftLink: boolean;
}) {
  return (
    <article
      className={`h-full rounded-2xl border p-5 shadow-sm transition ${
        accenten[accent].kaart
      } ${
        heeftLink
          ? "hover:-translate-y-0.5 hover:shadow-md"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">
            {titel}
          </p>

          <p className="mt-2 text-3xl font-bold">
            {waarde}
          </p>
        </div>

        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold ${accenten[accent].icoon}`}
          aria-hidden="true"
        >
          {heeftLink ? "→" : "•"}
        </span>
      </div>

      <p className="mt-3 text-sm opacity-75">
        {toelichting}
      </p>
    </article>
  );
}

export default function KpiKaart({
  titel,
  waarde,
  toelichting,
  href,
  accent = "groen",
}: Props) {
  if (href) {
    return (
      <Link
        href={href}
        className="block h-full rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
      >
        <Inhoud
          titel={titel}
          waarde={waarde}
          toelichting={toelichting}
          accent={accent}
          heeftLink
        />
      </Link>
    );
  }

  return (
    <Inhoud
      titel={titel}
      waarde={waarde}
      toelichting={toelichting}
      accent={accent}
      heeftLink={false}
    />
  );
}
