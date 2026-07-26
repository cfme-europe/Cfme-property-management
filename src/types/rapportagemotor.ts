export type RapportageVerschil = {
  huidig: number;
  vorig: number;
  absoluut: number;
  procentueel: number | null;
};

export type EnergieKengetal = {
  totaal: number | null;
  persoonsweken: number;
  per_persoon_per_week: number | null;
  vorige_per_persoon_per_week: number | null;
  afwijking_percentage: number | null;
  signalering: "onvoldoende_data" | "normaal" | "waarschuwing" | "kritiek";
};

export type RapportageRisico = {
  score: number;
  classificatie: "laag" | "middel" | "hoog" | "kritiek";
  factoren: string[];
};

export type RapportageKosten = {
  werkelijk: number;
  geschat: number;
  totaal_indicatie: number;
  definitief: boolean;
  per_factuurontvanger: Record<string, number>;
};

export type RapportagemotorUitkomst = {
  rekenregels_versie: 1;
  huidige_periode: {
    vanaf: string;
    tot_en_met: string;
  };
  vorige_periode: {
    vanaf: string;
    tot_en_met: string;
  };
  vergelijking: {
    inspecties: RapportageVerschil;
    meldingen: RapportageVerschil;
    open_meldingen: RapportageVerschil;
    afwijkingen: RapportageVerschil;
    open_afwijkingen: RapportageVerschil;
  };
  energie: {
    dagstroom: EnergieKengetal;
    nachtstroom: EnergieKengetal;
    elektriciteit: EnergieKengetal;
    gas: EnergieKengetal;
    water: EnergieKengetal;
    ongeldige_of_onvolledige_meetperioden: number;
    kostenschatting_beschikbaar: boolean;
    kostenschatting_toelichting: string;
  };
  kosten: RapportageKosten;
  risico: RapportageRisico;
  acties: string[];
  toelichting_rekenregels: string[];
};

export type RapportagemotorInvoer = {
  periode: {
    vanaf: string;
    tot_en_met: string;
  };
  vorige_periode: {
    vanaf: string;
    tot_en_met: string;
  };
  inspecties: Array<{
    inspectiedatum: string;
  }>;
  meldingen: Array<{
    melddatum: string;
    oplosdatum: string | null;
    status: string;
  }>;
  meterstanden: Array<{
    id: number;
    created_at: string;
    updated_at: string;
    woning_id: number;
    opnamedatum: string;
    bewoners_aantal: number;
    dagstroom_kwh: number | null;
    nachtstroom_kwh: number | null;
    elektriciteit_kwh: number | null;
    gas_m3: number | null;
    water_m3: number | null;
    opgenomen_door: string | null;
    opmerkingen: string | null;
  }>;
  bewoners: Array<{
    incheckdatum: string;
    uitcheckdatum: string | null;
  }>;
  afwijkingen: Array<{
    created_at: string;
    status: string;
    urgentie: string;
    gebrek_type: string;
    geschatte_kosten: number | null;
    werkelijke_kosten: number | null;
    factuur_naar: string | null;
  }>;
  taken: Array<{
    created_at: string;
    status: string;
    deadline: string | null;
  }>;
};
