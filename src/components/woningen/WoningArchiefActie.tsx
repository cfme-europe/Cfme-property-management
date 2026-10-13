"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  woningStatusWijzigen,
  type WoningStatusActieResultaat,
} from "@/app/woningen/[id]/actions";
import type { WoningStatuswijziging } from "@/services/woningarchief-server";

const beginstatus: WoningStatusActieResultaat = {
  gelukt: false,
  fout: null,
  bestemming: null,
};

type Props = {
  woningId: number;
  wijziging: WoningStatuswijziging;
};

export default function WoningArchiefActie({
  woningId,
  wijziging,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const actie = woningStatusWijzigen.bind(
    null,
    woningId,
    wijziging,
  );
  const [status, formAction, bezig] = useActionState(
    actie,
    beginstatus,
  );
  const archiveren = wijziging === "archiveren";

  useEffect(() => {
    if (status.gelukt && status.bestemming) {
      router.push(status.bestemming);
      router.refresh();
    }
  }, [router, status]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-xl border px-5 py-3 font-medium ${
          archiveren
            ? "border-red-700 text-red-800"
            : "border-emerald-700 text-emerald-800"
        }`}
      >
        {archiveren
          ? "Woning archiveren"
          : "Woning heractiveren"}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="w-full rounded-2xl border border-slate-300 bg-white p-5 shadow-sm"
    >
      <h2 className="font-bold text-slate-950">
        {archiveren
          ? "Woning naar archief verplaatsen"
          : "Woning opnieuw activeren"}
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        {archiveren
          ? "Het volledige dossier blijft behouden. De woning verdwijnt uit de operationele overzichten. Open taken worden met deze reden geannuleerd."
          : "De woning komt terug in de normale woninglijst. Planning en eerder geannuleerde taken worden niet automatisch heropend."}
      </p>

      <label className="mt-4 block">
        <span className="mb-1 block text-sm font-medium">
          Reden *
        </span>
        <textarea
          name="reden"
          required
          minLength={5}
          maxLength={1000}
          rows={3}
          placeholder={
            archiveren
              ? "Bijvoorbeeld: eigenaar neemt de woning zelf weer in gebruik"
              : "Waarom wordt deze woning opnieuw actief?"
          }
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
        />
      </label>

      {status.fout && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-red-100 p-3 text-sm text-red-800"
        >
          {status.fout}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={bezig}
          className={`rounded-xl px-5 py-3 font-medium text-white disabled:opacity-50 ${
            archiveren ? "bg-red-700" : "bg-emerald-700"
          }`}
        >
          {bezig
            ? "Bezig..."
            : archiveren
              ? "Archivering bevestigen"
              : "Heractivering bevestigen"}
        </button>
        <button
          type="button"
          disabled={bezig}
          onClick={() => setOpen(false)}
          className="rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
