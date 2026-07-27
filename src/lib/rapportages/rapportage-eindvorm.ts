import {
  bouwZakelijkeRapportageModel,
  type JsonObject,
  zakelijkLabel,
} from "@/lib/rapportages/zakelijke-rapportage";
import type { JsonWaarde } from "@/types/maandrapportage";
import type {
  RapportageComplianceRegel,
  RapportageDuidingsregel,
  RapportageEindvorm,
} from "@/types/rapportage-eindvorm";

const PERSOONSVELDEN = new Set([
  "bewoner",
  "bewoners",
  "bewoner_id",
  "bewoner_naam",
  "naam",
  "voornaam",
  "tussenvoegsel",
  "achternaam",
  "email",
  "e_mail",
  "telefoon",
  "telefoonnummer",
  "geboortedatum",
  "nationaliteit",
  "documentnummer",
  "bsn",
]);

function alsObject(
  waarde: JsonWaarde | undefined,
): JsonObject | null {
  if (
    waarde === null ||
    typeof waarde !== "object" ||
    Array.isArray(waarde)
  ) {
    return null;
  }

  return waarde as JsonObject;
}

function alsObjecten(
  waarde: JsonWaarde | undefined,
): JsonObject[] {
  if (!Array.isArray(waarde)) {
    return [];
  }

  return waarde.filter(
    (item): item is JsonObject =>
      item !== null &&
      typeof item === "object" &&
      !Array.isArray(item),
  );
}

function tekstWaarde(
  waarde: JsonWaarde | undefined,
  standaard = "Niet beschikbaar",
): string {
  if (typeof waarde === "string") {
    return waarde.trim() || standaard;
  }

  if (typeof waarde === "number") {
    return new Intl.NumberFormat("nl-NL", {
      maximumFractionDigits: 2,
    }).format(waarde);
  }

  if (typeof waarde === "boolean") {
    return waarde ? "Ja" : "Nee";
  }

  return standaard;
}

function verschilTekst(
  absoluut: number,
  procentueel: number | null,
): string {
  const absoluutTekst = `${
    absoluut > 0 ? "+" : ""
  }${absoluut}`;

  if (procentueel === null) {
    return absoluutTekst;
  }

  return `${absoluutTekst} (${
    procentueel > 0 ? "+" : ""
  }${new Intl.NumberFormat("nl-NL", {
    maximumFractionDigits: 1,
  }).format(procentueel)}%)`;
}

function ontwikkeling(
  absoluut: number,
  positiefBijDaling: boolean,
): {
  resultaat: string;
  betekenis: string;
} {
  if (absoluut === 0) {
    return {
      resultaat: "Ongewijzigd ten opzichte van de vorige periode.",
      betekenis:
        "Geen aantoonbare operationele verschuiving; reguliere bewaking blijft nodig.",
    };
  }

  const gunstig = positiefBijDaling
    ? absoluut < 0
    : absoluut > 0;

  return gunstig
    ? {
        resultaat: "De ontwikkeling is gunstiger dan in de vorige periode.",
        betekenis:
          "De operationele beheersing is verbeterd of de geregistreerde activiteit is aantoonbaar toegenomen.",
      }
    : {
        resultaat: "De ontwikkeling vraagt aanvullende aandacht.",
        betekenis:
          "Zonder gerichte opvolging kan het operationele risico of de herstelbelasting toenemen.",
      };
}

function reinigTekst(waarde: string): string {
  return waarde
    .replace(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
      "[e-mailadres verwijderd]",
    )
    .replace(
      /(?:\+31|0031|0)[\s()-]*[1-9](?:[\s()-]*\d){7,8}/g,
      "[telefoonnummer verwijderd]",
    );
}

export function maakExternPrivacyveilig(
  waarde: JsonWaarde,
  sleutel = "",
): JsonWaarde {
  const genormaliseerdeSleutel = sleutel
    .trim()
    .toLowerCase();

  if (PERSOONSVELDEN.has(genormaliseerdeSleutel)) {
    return null;
  }

  if (typeof waarde === "string") {
    return reinigTekst(waarde);
  }

  if (Array.isArray(waarde)) {
    return waarde
      .map((item) =>
        maakExternPrivacyveilig(item),
      )
      .filter((item) => item !== null);
  }

  if (
    waarde !== null &&
    typeof waarde === "object"
  ) {
    return Object.fromEntries(
      Object.entries(waarde)
        .filter(
          ([veld]) =>
            !PERSOONSVELDEN.has(
              veld.toLowerCase(),
            ),
        )
        .map(([veld, item]) => [
          veld,
          maakExternPrivacyveilig(
            item,
            veld,
          ),
        ]),
    );
  }

  return waarde;
}

function complianceRegels(
  data: Record<string, JsonWaarde>,
): RapportageComplianceRegel[] {
  return alsObjecten(data.compliance).map(
    (item) => ({
      id:
        typeof item.id === "number"
          ? item.id
          : null,
      onderwerp: tekstWaarde(
        item.onderwerp ??
          item.naam ??
          item.type,
        "Certificering",
      ),
      status: tekstWaarde(
        item.status,
        "Onbekend",
      ),
      geldig_tot:
        typeof item.geldig_tot === "string"
          ? item.geldig_tot
          : null,
      verlopen:
        item.verlopen === true,
    }),
  );
}

export function bouwRapportageEindvorm(
  data: Record<string, JsonWaarde>,
): RapportageEindvorm {
  const model =
    bouwZakelijkeRapportageModel(data);

  const eersteActie =
    model.acties[0] ??
    "Reguliere opvolging voortzetten.";

  const duiding: RapportageDuidingsregel[] =
    model.vergelijking.map((item) => {
      const positiefBijDaling =
        [
          "meldingen",
          "open_meldingen",
          "afwijkingen",
          "open_afwijkingen",
        ].includes(item.sleutel);

      const beoordeling = ontwikkeling(
        item.absoluut,
        positiefBijDaling,
      );

      return {
        sleutel: item.sleutel,
        onderwerp: item.label,
        vorige_situatie: String(item.vorig),
        huidige_situatie: String(item.huidig),
        verschil: verschilTekst(
          item.absoluut,
          item.procentueel,
        ),
        actie: eersteActie,
        resultaat: beoordeling.resultaat,
        betekenis: beoordeling.betekenis,
      };
    });

  for (const energie of model.energie) {
    const afwijking =
      energie.afwijking_percentage;

    const actie =
      energie.signalering === "kritiek"
        ? `Onderzoek het afwijkende verbruik van ${energie.label.toLowerCase()} direct.`
        : energie.signalering === "waarschuwing"
          ? `Controleer de ontwikkeling van ${energie.label.toLowerCase()} bij de volgende meteropname.`
          : energie.signalering ===
              "onvoldoende_data"
            ? `Vul de ontbrekende meetgegevens voor ${energie.label.toLowerCase()} aan.`
            : `Blijf ${energie.label.toLowerCase()} regulier bewaken.`;

    duiding.push({
      sleutel: `energie_${energie.sleutel}`,
      onderwerp: energie.label,
      vorige_situatie:
        energie.vorige_per_persoon_per_week ===
        null
          ? "Geen betrouwbare referentie"
          : `${tekstWaarde(
              energie.vorige_per_persoon_per_week,
            )} ${energie.eenheid} p.p./week`,
      huidige_situatie:
        energie.per_persoon_per_week === null
          ? "Onvoldoende meetgegevens"
          : `${tekstWaarde(
              energie.per_persoon_per_week,
            )} ${energie.eenheid} p.p./week`,
      verschil:
        afwijking === null
          ? "Niet berekenbaar"
          : `${
              afwijking > 0 ? "+" : ""
            }${new Intl.NumberFormat(
              "nl-NL",
              {
                maximumFractionDigits: 1,
              },
            ).format(afwijking)}%`,
      actie,
      resultaat: `Signalering: ${zakelijkLabel(
        energie.signalering,
      )}.`,
      betekenis:
        energie.signalering === "kritiek"
          ? "De afwijking kan wijzen op verspilling, lekkage, technisch falen of afwijkend bewonersgedrag."
          : energie.signalering ===
              "waarschuwing"
            ? "De ontwikkeling verdient opvolging voordat structurele meerkosten ontstaan."
            : energie.signalering ===
                "onvoldoende_data"
              ? "Zonder complete meetgegevens is betrouwbare sturing op verbruik en kosten niet mogelijk."
              : "Het verbruik blijft binnen de ingestelde signaleringsgrenzen.",
    });
  }

  const kostenObject =
    alsObject(data.rapportagemotor);
  const kosten =
    alsObject(kostenObject?.kosten);

  duiding.push({
    sleutel: "kosten",
    onderwerp: "Kosten en facturatie",
    vorige_situatie:
      "Geen afzonderlijke historische kostenvergelijking beschikbaar.",
    huidige_situatie:
      new Intl.NumberFormat("nl-NL", {
        style: "currency",
        currency: "EUR",
      }).format(
        model.kosten.totaal_indicatie,
      ),
    verschil:
      model.kosten.definitief
        ? "Volledig gebaseerd op werkelijke kosten"
        : "Bevat nog geraamde kosten",
    actie:
      model.kosten.definitief
        ? "Controleer de factuurtoewijzing en verwerk de definitieve kosten."
        : "Vervang ramingen door werkelijke herstelkosten zodra deze beschikbaar zijn.",
    resultaat:
      model.kosten.definitief
        ? "De financiële impact is definitief vastgesteld."
        : "De financiële impact is nog gedeeltelijk indicatief.",
    betekenis:
      Object.keys(
        model.kosten.per_factuurontvanger,
      ).length > 0
        ? "De kosten zijn uitgesplitst naar verantwoordelijke factuurontvanger."
        : "De factuurverantwoordelijkheid moet nog expliciet worden toegewezen.",
  });

  const compliance =
    complianceRegels(data);

  const verlopen =
    compliance.filter(
      (item) => item.verlopen,
    ).length;

  duiding.push({
    sleutel: "compliance",
    onderwerp: "Compliance",
    vorige_situatie:
      "Historische compliancevergelijking is niet afzonderlijk vastgesteld.",
    huidige_situatie:
      compliance.length === 0
        ? "Geen compliancegegevens beschikbaar"
        : `${compliance.length} registratie(s), waarvan ${verlopen} verlopen`,
    verschil:
      verlopen > 0
        ? `${verlopen} verlopen registratie(s)`
        : "Geen verlopen registraties",
    actie:
      verlopen > 0
        ? "Plan directe verlenging of herstel van de verlopen certificeringen."
        : "Blijf geldigheid en vervaldata periodiek bewaken.",
    resultaat:
      verlopen > 0
        ? "De woning voldoet niet volledig aan de vastgelegde compliancevereisten."
        : "Er zijn geen verlopen complianceonderdelen vastgesteld.",
    betekenis:
      verlopen > 0
        ? "Verlopen certificeringen kunnen leiden tot veiligheids-, verhuur- en aansprakelijkheidsrisico."
        : "De bekende compliancepositie vormt momenteel geen directe blokkade.",
  });

  const kritiekeEnergie =
    model.energie.filter(
      (item) =>
        item.signalering === "kritiek",
    ).length;

  const managementconclusie =
    model.risico.classificatie ===
      "kritiek" ||
    verlopen > 0 ||
    kritiekeEnergie > 0
      ? "Directe bestuurlijke opvolging is noodzakelijk."
      : model.risico.classificatie ===
            "hoog" ||
          model.risico.classificatie ===
            "middel"
        ? "Gerichte opvolging is nodig om verdere risico-opbouw te voorkomen."
        : "De woning is bestuurlijk beheersbaar; reguliere opvolging kan worden voortgezet.";

  return {
    modelversie: 1,
    managementconclusie,
    duiding,
    compliance,
    privacy: {
      extern_geschikt: true,
      uitgesloten_velden:
        Array.from(PERSOONSVELDEN),
    },
    brondata: {
      gegenereerd_op:
        model.gegenereerd_op,
      rekenregels_versie:
        typeof kostenObject?.rekenregels_versie === "number"
          ? kostenObject.rekenregels_versie
          : null,
      kosten_definitief:
        kosten?.definitief === true,
    },
  };
}
