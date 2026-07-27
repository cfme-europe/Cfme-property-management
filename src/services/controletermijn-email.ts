
import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type Escalatieniveau =
  | "waarschuwing"
  | "herinnering"
  | "escalatie";

type VerlopenControle = {
  woning_id: number;
  woning_rayon_toewijzing_id: number;
  dossiernummer: string;
  adres: string | null;
  postcode: string | null;
  plaats: string | null;
  rayon_naam: string;
  rayon_code: string;
  controleur_id: string;
  controleur_naam: string | null;
  controleur_email: string;
  controlefrequentie_dagen: number;
  laatste_controle_datum: string | null;
  uiterste_controle_datum: string;
  dagen_te_laat: number;
  escalatieniveau: Escalatieniveau;
};

type ResendAntwoord = {
  id?: string;
  message?: string;
};

export type ControletermijnEmailResultaat = {
  gevonden: number;
  verzonden: number;
  overgeslagen: number;
  mislukt: number;
};

function vereisteOmgevingswaarde(
  naam: string,
): string {
  const waarde = process.env[naam]?.trim();

  if (!waarde) {
    throw new Error(
      `Vereiste omgevingsvariabele ${naam} ontbreekt.`,
    );
  }

  return waarde;
}

function uniekEmails(
  waarden: Array<string | null | undefined>,
): string[] {
  return Array.from(
    new Set(
      waarden
        .map((waarde) => waarde?.trim().toLowerCase())
        .filter(
          (waarde): waarde is string =>
            Boolean(
              waarde &&
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                  waarde,
                ),
            ),
        ),
    ),
  );
}

function onderwerp(
  controle: VerlopenControle,
): string {
  const prefix =
    controle.escalatieniveau === "escalatie"
      ? "Escalatie"
      : controle.escalatieniveau === "herinnering"
        ? "Herinnering"
        : "Waarschuwing";

  return `${prefix}: woningcontrole ${controle.dagen_te_laat} dagen te laat`;
}

function html(
  controle: VerlopenControle,
  appUrl: string,
): string {
  const woning =
    [
      controle.adres,
      controle.postcode,
      controle.plaats,
    ]
      .filter(Boolean)
      .join(", ") || `Woning ${controle.woning_id}`;

  const controleur =
    controle.controleur_naam ||
    controle.controleur_email;

  const laatsteControle =
    controle.laatste_controle_datum ??
    "Nog geen afgeronde controle";

  const link =
    `${appUrl.replace(/\/$/, "")}/controleur`;

  return `
    <h1>Controletermijn verlopen</h1>
    <p>
      De periodieke controle voor <strong>${woning}</strong>
      is <strong>${controle.dagen_te_laat} dagen</strong>
      over de ingestelde termijn.
    </p>
    <table>
      <tbody>
        <tr>
          <td><strong>Dossiernummer</strong></td>
          <td>${controle.dossiernummer}</td>
        </tr>
        <tr>
          <td><strong>Rayon</strong></td>
          <td>${controle.rayon_naam} (${controle.rayon_code})</td>
        </tr>
        <tr>
          <td><strong>Controleur</strong></td>
          <td>${controleur}</td>
        </tr>
        <tr>
          <td><strong>Laatste controle</strong></td>
          <td>${laatsteControle}</td>
        </tr>
        <tr>
          <td><strong>Uiterste controledatum</strong></td>
          <td>${controle.uiterste_controle_datum}</td>
        </tr>
        <tr>
          <td><strong>Controlefrequentie</strong></td>
          <td>${controle.controlefrequentie_dagen} dagen</td>
        </tr>
      </tbody>
    </table>
    <p>
      De controleur behoudt toegang en kan de controle
      alsnog uitvoeren.
    </p>
    <p>
      <a href="${link}">Open CFME Control</a>
    </p>
  `;
}

async function verzendViaResend(
  ontvangers: string[],
  controle: VerlopenControle,
): Promise<string | null> {
  const apiKey =
    vereisteOmgevingswaarde("RESEND_API_KEY");
  const from =
    vereisteOmgevingswaarde("RESEND_FROM_EMAIL");
  const appUrl =
    vereisteOmgevingswaarde("NEXT_PUBLIC_APP_URL");

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: ontvangers,
        subject: onderwerp(controle),
        html: html(controle, appUrl),
      }),
    },
  );

  const antwoord =
    (await response.json()) as ResendAntwoord;

  if (!response.ok) {
    throw new Error(
      antwoord.message ||
        `Resend gaf status ${response.status}.`,
    );
  }

  return antwoord.id ?? null;
}

export async function verwerkControletermijnEmails(
  peildatum = new Date().toISOString().slice(0, 10),
): Promise<ControletermijnEmailResultaat> {
  const supabase = createAdminClient();

  const { data: verlopenData, error: verlopenFout } =
    await supabase.rpc(
      "geef_verlopen_controletermijnen",
      {
        p_peildatum: peildatum,
      },
    );

  if (verlopenFout) {
    throw new Error(
      `Verlopen controles ophalen mislukt: ${verlopenFout.message}`,
    );
  }

  const verlopen =
    (verlopenData ?? []) as VerlopenControle[];

  const { data: escalatieProfielen, error: profielenFout } =
    await supabase
      .from("profiles")
      .select("email")
      .eq("actief", true)
      .in("rol", ["admin", "management"]);

  if (profielenFout) {
    throw new Error(
      `Escalatieontvangers ophalen mislukt: ${profielenFout.message}`,
    );
  }

  const escalatieEmails = uniekEmails(
    (escalatieProfielen ?? []).map(
      (profiel) => profiel.email,
    ),
  );

  const resultaat: ControletermijnEmailResultaat = {
    gevonden: verlopen.length,
    verzonden: 0,
    overgeslagen: 0,
    mislukt: 0,
  };

  for (const controle of verlopen) {
    const { data: bestaand, error: bestaandFout } =
      await supabase
        .from("controletermijn_email_log")
        .select("id")
        .eq("woning_id", controle.woning_id)
        .eq(
          "uiterste_controle_datum",
          controle.uiterste_controle_datum,
        )
        .eq(
          "escalatieniveau",
          controle.escalatieniveau,
        )
        .maybeSingle();

    if (bestaandFout) {
      resultaat.mislukt += 1;
      continue;
    }

    if (bestaand) {
      resultaat.overgeslagen += 1;
      continue;
    }

    const ontvangers = uniekEmails([
      controle.controleur_email,
      ...escalatieEmails,
    ]);

    if (ontvangers.length === 0) {
      resultaat.mislukt += 1;
      continue;
    }

    try {
      const providerBerichtId =
        await verzendViaResend(
          ontvangers,
          controle,
        );

      const { error: logFout } = await supabase
        .from("controletermijn_email_log")
        .insert({
          woning_id: controle.woning_id,
          woning_rayon_toewijzing_id:
            controle.woning_rayon_toewijzing_id,
          controleur_id: controle.controleur_id,
          uiterste_controle_datum:
            controle.uiterste_controle_datum,
          escalatieniveau:
            controle.escalatieniveau,
          dagen_te_laat: controle.dagen_te_laat,
          ontvangers,
          provider_bericht_id:
            providerBerichtId,
        });

      if (logFout) {
        throw new Error(logFout.message);
      }

      resultaat.verzonden += 1;
    } catch (error) {
      resultaat.mislukt += 1;

      console.error(
        "[CFME Controletermijnmail] Verzending mislukt",
        {
          woningId: controle.woning_id,
          fout:
            error instanceof Error
              ? error.message
              : "Onbekende fout",
        },
      );
    }
  }

  return resultaat;
}
