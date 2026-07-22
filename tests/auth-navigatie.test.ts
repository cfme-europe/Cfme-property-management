import assert from "node:assert/strict";
import test from "node:test";
import {
  isPubliekeRoute,
  loginVolgendeRoute,
  veiligeVolgendeRoute,
} from "../src/lib/auth/navigatie";

test(
  "alleen login is publiek",
  () => {
    assert.equal(
      isPubliekeRoute("/login"),
      true
    );
    assert.equal(
      isPubliekeRoute("/login/herstel"),
      true
    );
    assert.equal(
      isPubliekeRoute("/"),
      false
    );
    assert.equal(
      isPubliekeRoute("/woningen"),
      false
    );
  }
);

test(
  "interne routes blijven behouden",
  () => {
    assert.equal(
      veiligeVolgendeRoute(
        "/woningen/12?tab=inspecties"
      ),
      "/woningen/12?tab=inspecties"
    );
  }
);

test(
  "externe en ongeldige routes worden geblokkeerd",
  () => {
    const onveilig = [
      "https://example.com",
      "//example.com",
      "\\\\example.com",
      "javascript:alert(1)",
      "",
      null,
      undefined,
    ];

    for (const waarde of onveilig) {
      assert.equal(
        veiligeVolgendeRoute(waarde),
        "/"
      );
    }
  }
);

test(
  "deep link wordt voor login bewaard",
  () => {
    assert.equal(
      loginVolgendeRoute(
        "/woningen/7",
        "?tab=meldingen"
      ),
      "/woningen/7?tab=meldingen"
    );

    assert.equal(
      loginVolgendeRoute("/", ""),
      "/"
    );
  }
);
