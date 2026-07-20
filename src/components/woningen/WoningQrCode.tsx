"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

type Props = {
  woningId: number;
  adres: string;
  postcode: string;
  plaats: string;
};

export default function WoningQrCode({
  woningId,
  adres,
  postcode,
  plaats,
}: Props) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [doelUrl, setDoelUrl] = useState("");
  const [fout, setFout] = useState("");

  const bestandsnaam = useMemo(
    () =>
      `cfme-woning-${woningId}-${adres}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") + ".png",
    [woningId, adres]
  );

  useEffect(() => {
    let actief = true;

    async function genereren() {
      try {
        const url = new URL(
          `/woningen/${woningId}`,
          window.location.origin
        ).toString();

        const dataUrl = await QRCode.toDataURL(url, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 720,
        });

        if (!actief) {
          return;
        }

        setDoelUrl(url);
        setQrDataUrl(dataUrl);
        setFout("");
      } catch (error) {
        if (!actief) {
          return;
        }

        setFout(
          error instanceof Error
            ? error.message
            : "QR-code genereren mislukt."
        );
      }
    }

    void genereren();

    return () => {
      actief = false;
    };
  }, [woningId]);

  function afdrukken() {
    if (!qrDataUrl) {
      return;
    }

    const venster = window.open("", "_blank");

    if (!venster) {
      setFout(
        "Afdrukvenster kon niet worden geopend. Sta pop-ups toe en probeer opnieuw."
      );
      return;
    }

    const veiligeAdres = adres
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

    const veiligePlaats = `${postcode} ${plaats}`
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

    venster.document.write(`<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <title>CFME woning QR-code</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 32px;
      color: #0f172a;
      text-align: center;
    }
    .kaart {
      max-width: 520px;
      margin: 0 auto;
      border: 1px solid #cbd5e1;
      border-radius: 24px;
      padding: 32px;
    }
    img {
      width: 100%;
      max-width: 360px;
      height: auto;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 28px;
    }
    p {
      margin: 4px 0;
      font-size: 18px;
    }
    .uitleg {
      margin-top: 20px;
      color: #475569;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <section class="kaart">
    <h1>CFME Control</h1>
    <p>${veiligeAdres}</p>
    <p>${veiligePlaats}</p>
    <img src="${qrDataUrl}" alt="QR-code woning">
    <p class="uitleg">
      Scan om na beveiligd inloggen het woningdossier te openen.
    </p>
  </section>
  <script>
    window.addEventListener("load", () => {
      window.print();
    });
  </script>
</body>
</html>`);

    venster.document.close();
  }

  return (
    <section className="mb-8 rounded-2xl bg-white p-6 shadow print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">QR-code woning</h2>
          <p className="mt-1 text-slate-600">
            Scan deze code om na beveiligd inloggen direct
            het woningdossier te openen.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
          Intern beveiligd
        </span>
      </div>

      {fout && (
        <div className="mt-5 rounded-xl bg-red-100 p-4 text-red-800">
          {fout}
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[280px_1fr] md:items-center">
        <div className="flex h-[252px] w-[252px] max-w-full items-center justify-center justify-self-start rounded-2xl border border-slate-200 bg-white p-4">
          {qrDataUrl ? (
            <Image
              src={qrDataUrl}
              alt={`QR-code voor ${adres}`}
              width={220}
              height={220}
              unoptimized
              style={{
                width: "220px",
                height: "220px",
                maxWidth: "100%",
                objectFit: "contain",
              }}
            />
          ) : (
            <p className="text-sm text-slate-500">
              QR-code wordt gegenereerd…
            </p>
          )}
        </div>

        <div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">
                Woning
              </dt>
              <dd className="font-medium">{adres}</dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Plaats
              </dt>
              <dd className="font-medium">
                {postcode} {plaats}
              </dd>
            </div>
          </dl>

          <p className="mt-5 break-all rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
            {doelUrl || "Bestemming wordt opgebouwd…"}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={qrDataUrl || undefined}
              download={bestandsnaam}
              aria-disabled={!qrDataUrl}
              className={`rounded-xl px-5 py-3 font-medium text-white ${
                qrDataUrl
                  ? "bg-emerald-700"
                  : "pointer-events-none bg-slate-400"
              }`}
            >
              PNG downloaden
            </a>

            <button
              type="button"
              onClick={afdrukken}
              disabled={!qrDataUrl}
              className="rounded-xl border border-slate-300 px-5 py-3 font-medium disabled:opacity-50"
            >
              Afdrukken
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
