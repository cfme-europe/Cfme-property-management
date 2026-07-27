import type { JsonWaarde } from "@/types/maandrapportage";

export type RapportageDuidingsregel = {
  sleutel: string;
  onderwerp: string;
  vorige_situatie: string;
  huidige_situatie: string;
  verschil: string;
  actie: string;
  resultaat: string;
  betekenis: string;
};

export type RapportageComplianceRegel = {
  id: number | null;
  onderwerp: string;
  status: string;
  geldig_tot: string | null;
  verlopen: boolean;
};

export type RapportageEindvorm = {
  modelversie: 1;
  managementconclusie: string;
  duiding: RapportageDuidingsregel[];
  compliance: RapportageComplianceRegel[];
  privacy: {
    extern_geschikt: boolean;
    uitgesloten_velden: string[];
  };
  brondata: Record<string, JsonWaarde>;
};
