import assert from "node:assert/strict";
import test from "node:test";
import { valideerNieuweWoning } from "../src/lib/woningen/validatie";

test(
  "woninginvoer wordt opgeschoond",
  () => {
    assert.deepEqual(
      valideerNieuweWoning({
        adres: "  Markt 1 ",
        postcode: " 6211AB ",
        plaats: " Maastricht ",
      }),
      {
        adres: "Markt 1",
        postcode: "6211AB",
        plaats: "Maastricht",
      }
    );
  }
);

test(
  "onvolledige woninginvoer wordt geweigerd",
  () => {
    assert.throws(
      () =>
        valideerNieuweWoning({
          adres: "",
          postcode: "",
          plaats: "",
        })
    );
  }
);
