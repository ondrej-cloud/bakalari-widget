// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: user-cog;

// Prihlaseni / odhlaseni uctu Bakalari.
// Copyright (c) 2026 Ondrej Novotny — vsechna prava vyhrazena.

const HLAVNI = "Rozvrh";

const rozvrh = importModule(HLAVNI);
if (!rozvrh || !rozvrh.nastavUcet) throw new Error("Chybí nebo je zastaralý skript " + HLAVNI);

await rozvrh.nastavUcet();
Script.complete();
