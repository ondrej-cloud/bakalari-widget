// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: table;

/*
 * Bakalári – widget rozvrhu pro Scriptable
 *
 * Copyright (c) 2026 Ondřej Novotný
 * Všechna práva vyhrazena. / All rights reserved.
 *
 * Tento software a jeho zdrojový kód jsou vlastnictvím Ondřeje Novotného.
 * Bez předchozího písemného souhlasu autora není dovoleno kód kopírovat,
 * upravovat, šířit, publikovat ani používat pro komerční účely.
 *
 * This software and its source code are the property of Ondřej Novotný.
 * No part of it may be copied, modified, distributed, published or used
 * commercially without the author's prior written permission.
 *
 * Software je poskytován "tak, jak je", bez jakékoliv záruky.
 */

//rozvrh, hlavni skript

const CONFIG = {
  // Nic z toho vyplnovat nemusis. Pri prvnim spusteni v aplikaci se skript
  // zepta na skolu, jmeno a heslo a ulozi si je do Keychainu.
  skola: "",
  jmeno: "",
  heslo: "",
  ukazovatOdpadle: true,
  maleHodin: 6,
  obnovitPoMin: 10,
  // "auto" = podle systemoveho vzhledu iOS, jinak "tmavy" / "svetly"
  vzhled: "auto"
};

const CACHE = "bakalari-rozvrh-cache.json";
const TOKENY = "bakalari-tokeny";
const UCET = "bakalari-ucet";

function zaklad() {
  const u = String(CONFIG.skola || "").trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(u) ? u : "https://" + u;
}

function maUcet() {
  return !!(CONFIG.skola && CONFIG.jmeno && CONFIG.heslo);
}

const VZHLED = "bakalari-vzhled";

// Device.isUsingDarkAppearance() funguje jen v aplikaci, ve widgetu ne
// (Scriptable: "This API is not supported in widgets"). Zaroven se pozadi
// widgetu kresli jako obrazek, ktery uz dynamickou barvu obsahovat nemuze.
// Reseni: v aplikaci se vzhled zjisti a ulozi, widget si precte ulozeny.
// Kdyz tedy prepnes Light/Dark, staci jednou otevrit skript (nebo ťuknout
// na widget, ktery ma "When Interacting: Run Script") a widget se srovna.
function jeTma() {
  if (CONFIG.vzhled === "tmavy") return true;
  if (CONFIG.vzhled === "svetly") return false;

  if (config.runsInApp === true) {
    try {
      const tma = Device.isUsingDarkAppearance();
      try { Keychain.set(VZHLED, tma ? "tmavy" : "svetly"); } catch (e) {}
      return tma;
    } catch (e) {}
  }

  try {
    if (Keychain.contains(VZHLED)) return Keychain.get(VZHLED) !== "svetly";
  } catch (e) {}

  return true;
}

function lzeSePtat() {
  return config.runsInApp === true;
}

function nactiUcet() {
  try {
    if (Keychain.contains(UCET)) {
      const u = JSON.parse(Keychain.get(UCET)) || {};
      if (u.skola) CONFIG.skola = u.skola;
      if (u.jmeno) CONFIG.jmeno = u.jmeno;
      if (u.heslo) CONFIG.heslo = u.heslo;
    }
  } catch (e) {}

  // starsi verze skriptu ukladala do Keychainu jen heslo
  if (!CONFIG.heslo) {
    try {
      if (Keychain.contains("bakalari-heslo")) CONFIG.heslo = Keychain.get("bakalari-heslo");
    } catch (e) {}
  }
}

function ulozUcet() {
  try {
    Keychain.set(UCET, JSON.stringify({
      skola: CONFIG.skola,
      jmeno: CONFIG.jmeno,
      heslo: CONFIG.heslo
    }));
  } catch (e) {}
}

function zapomenUcet() {
  ["bakalari-ucet", "bakalari-heslo", TOKENY].forEach((k) => {
    try { if (Keychain.contains(k)) Keychain.remove(k); } catch (e) {}
  });
  CONFIG.jmeno = "";
  CONFIG.heslo = "";
}

nactiUcet();

const dd = (n) => String(n).padStart(2, "0");
const isoDatum = (d) => `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
const kratkeDatum = (d) => `${d.getDate()}. ${d.getMonth() + 1}.`;
const minutDne = (d) => d.getHours() * 60 + d.getMinutes();

const DNY_CZ = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

function minuty(s) {
  if (!s) return null;
  const a = String(s).split(":");
  const h = Number(a[0]);
  if (isNaN(h)) return null;
  return h * 60 + (Number(a[1]) || 0);
}

function parseDatum(s) {
  return new Date(String(s).slice(0, 10) + "T00:00:00");
}

function popisDne(date, ted) {
  const rozdil = Math.round((new Date(date).setHours(0,0,0,0) - new Date(ted).setHours(0,0,0,0)) / 86400000);
  if (rozdil === 0) return "Dnes";
  if (rozdil === 1) return "Zítra";
  return DNY_CZ[date.getDay()];
}

function tokeny() {
  try {
    if (!Keychain.contains(TOKENY)) return null;
    return JSON.parse(Keychain.get(TOKENY));
  } catch (e) {
    return null;
  }
}

function zapisTokeny(r) {
  const t = {
    access: r.access_token,
    refresh: r.refresh_token,
    plati: Date.now() + ((Number(r.expires_in) || 3600) - 60) * 1000
  };
  try { Keychain.set(TOKENY, JSON.stringify(t)); } catch (e) {}
  return t.access;
}

async function formPost(telo) {
  const req = new Request(`${zaklad()}/api/login`);
  req.method = "POST";
  req.headers = { "Content-Type": "application/x-www-form-urlencoded" };
  req.body = Object.keys(telo)
    .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(telo[k]))
    .join("&");
  return req.loadJSON();
}

function popisChyby(r) {
  const kod = String((r && (r.error_description || r.error)) || "");
  if (/invalid_grant|invalid_client|password|credentials/i.test(kod)) return "Špatné jméno nebo heslo";
  return kod || "Přihlášení selhalo";
}

async function heslemNaToken() {
  let r;
  try {
    r = await formPost({
      client_id: "ANDR",
      grant_type: "password",
      username: CONFIG.jmeno,
      password: CONFIG.heslo
    });
  } catch (e) {
    throw new Error("Server školy neodpověděl — zkontroluj adresu a připojení");
  }
  if (!r || !r.access_token) throw new Error(popisChyby(r));
  return zapisTokeny(r);
}

async function dialogUdaju(zprava) {
  const a = new Alert();
  a.title = "Přihlášení do Bakalářů";
  a.message = zprava || "Údaje se uloží do Keychainu, příště už je zadávat nebudeš.";
  a.addTextField("Adresa školy", CONFIG.skola || "https://");
  a.addTextField("Uživatelské jméno", CONFIG.jmeno || "");
  a.addSecureTextField("Heslo", "");
  a.addAction("Přihlásit");
  a.addCancelAction("Zrušit");

  if ((await a.presentAlert()) !== 0) return null;
  return {
    skola: a.textFieldValue(0).trim(),
    jmeno: a.textFieldValue(1).trim(),
    heslo: a.textFieldValue(2)
  };
}

// Zeptá se na údaje, ověří je proti serveru a teprve pak uloží.
// Při chybě se ptá znovu s předvyplněnými poli.
async function prihlasDialogem(uvodniZprava) {
  let zprava = uvodniZprava;

  for (;;) {
    const u = await dialogUdaju(zprava);
    if (!u) throw new Error("Přihlášení zrušeno");

    if (!u.skola || !u.jmeno || !u.heslo) {
      zprava = "Vyplň prosím všechna tři pole.";
      continue;
    }

    CONFIG.skola = u.skola;
    CONFIG.jmeno = u.jmeno;
    CONFIG.heslo = u.heslo;

    try {
      const token = await heslemNaToken();
      CONFIG.skola = zaklad();
      ulozUcet();
      return token;
    } catch (e) {
      CONFIG.heslo = "";
      zprava = (e.message || String(e)) + " — zkus to prosím znovu.";
    }
  }
}

async function prihlas() {
  const ulozene = tokeny();
  if (ulozene && ulozene.access && ulozene.plati > Date.now()) return ulozene.access;

  if (ulozene && ulozene.refresh) {
    try {
      const r = await formPost({ client_id: "ANDR", grant_type: "refresh_token", refresh_token: ulozene.refresh });
      if (r.access_token) return zapisTokeny(r);
    } catch (e) {}
  }

  if (maUcet()) {
    try {
      return await heslemNaToken();
    } catch (e) {
      if (!lzeSePtat()) throw e;
      return await prihlasDialogem("Uložené přihlášení už neplatí: " + (e.message || e));
    }
  }

  if (!lzeSePtat()) throw new Error("Otevři skript Rozvrh v aplikaci Scriptable a přihlas se");
  return await prihlasDialogem();
}

// Menu pro změnu nebo smazání uloženého účtu.
async function nastavUcet() {
  nactiUcet();

  if (!maUcet()) {
    await prihlasDialogem("Zatím tu není uložený žádný účet.");
    return;
  }

  const a = new Alert();
  a.title = "Účet Bakaláři";
  a.message = CONFIG.jmeno + "\n" + zaklad();
  a.addAction("Přihlásit jiný účet");
  a.addDestructiveAction("Odhlásit a smazat údaje");
  a.addCancelAction("Zavřít");

  const volba = await a.presentAlert();
  if (volba === 0) {
    await prihlasDialogem("Zadej údaje nového účtu.");
  } else if (volba === 1) {
    zapomenUcet();
    const h = new Alert();
    h.title = "Odhlášeno";
    h.message = "Uložené jméno, heslo i tokeny jsou smazané.";
    h.addAction("OK");
    await h.presentAlert();
  }
}

async function tyden(token, datum) {
  const req = new Request(`${zaklad()}/api/3/timetable/actual?date=${isoDatum(datum)}`);
  req.headers = { Authorization: "Bearer " + token };
  return req.loadJSON();
}

function slovnik(pole) {
  const m = {};
  (pole || []).forEach((x) => (m[x.Id] = x));
  return m;
}

function dnyZOdpovedi(data) {
  const hodiny = slovnik(data.Hours);
  const predmety = slovnik(data.Subjects);
  const ucebny = slovnik(data.Rooms);
  const ucitele = slovnik(data.Teachers);

  return (data.Days || []).map((den) => {
    const date = parseDatum(den.Date);

    const radky = (den.Atoms || []).map((a) => {
      const h = hodiny[a.HourId] || {};
      const zm = a.Change;
      const p = predmety[a.SubjectId];
      const u = ucebny[a.RoomId];
      const t = ucitele[a.TeacherId];
      const typ = zm ? zm.ChangeType : "";

      return {
        cislo: h.Caption != null ? String(h.Caption) : "",
        od: h.BeginTime || "",
        do: h.EndTime || "",
        zacatek: minuty(h.BeginTime),
        konec: minuty(h.EndTime),
        zkratka: p ? p.Abbrev : (zm && zm.TypeAbbrev) || "",
        predmet: p ? p.Name : (zm ? zm.Description || zm.TypeName || "" : ""),
        ucebna: u ? u.Abbrev || u.Name || "" : "",
        ucitel: t ? t.Abbrev || "" : "",
        tema: (a.Theme || "").trim(),
        zmena: zm ? zm.Description || zm.TypeName || "" : "",
        typZmeny: typ,
        odpada: typ === "Canceled" || typ === "Removed"
      };
    })
    .filter((r) => r.zacatek != null)
    .sort((a, b) => a.zacatek - b.zacatek);

    return {
      datum: isoDatum(date),
      date,
      typ: den.DayType || "WorkDay",
      popis: (den.DayDescription || "").trim(),
      hodiny: CONFIG.ukazovatOdpadle ? radky : radky.filter((r) => !r.odpada)
    };
  });
}

async function nactiZeSite() {
  const token = await prihlas();
  const ted = new Date();

  const prvni = await tyden(token, ted);
  const dny = dnyZOdpovedi(prvni);

  try {
    const druhy = await tyden(token, new Date(ted.getTime() + 7 * 86400000));
    const mam = {};
    dny.forEach((d) => (mam[d.datum] = true));
    dnyZOdpovedi(druhy).forEach((d) => {
      if (!mam[d.datum]) dny.push(d);
    });
  } catch (e) {}

  dny.sort((a, b) => a.date - b.date);

  const trida = (prvni.Classes || [])[0];
  return {
    dny,
    trida: trida ? (trida.Abbrev || trida.Name || "").trim() : "",
    stazeno: Date.now()
  };
}

function cestaKCache() {
  const fm = FileManager.local();
  return fm.joinPath(fm.cacheDirectory(), CACHE);
}

function nactiCache() {
  try {
    const fm = FileManager.local();
    const p = cestaKCache();
    if (!fm.fileExists(p)) return null;
    const data = JSON.parse(fm.readString(p));
    data.dny.forEach((d) => (d.date = parseDatum(d.datum)));
    return data;
  } catch (e) {
    return null;
  }
}

async function nactiData() {
  try {
    const data = await nactiZeSite();
    try {
      FileManager.local().writeString(cestaKCache(), JSON.stringify(data));
    } catch (e) {}
    return data;
  } catch (e) {
    const cache = nactiCache();
    if (cache) return cache;
    throw e;
  }
}

function zbyvajici(den, ted) {
  if (den.datum !== isoDatum(ted)) return den.hodiny;
  const m = minutDne(ted);
  return den.hodiny.filter((h) => h.konec > m);
}

function vyberIndex(dny, ted, posun) {
  if (!dny.length) return -1;

  const dnesIdx = dny.findIndex((d) => d.datum === isoDatum(ted));
  let i = dnesIdx;
  if (i !== -1 && !zbyvajici(dny[i], ted).some((h) => !h.odpada)) i = -1;
  if (i === -1) i = dny.findIndex((d) => d.date > ted && d.hodiny.length);
  if (i === -1) i = dnesIdx;
  if (i === -1) {
    for (let k = dny.length - 1; k >= 0; k--) {
      if (dny[k].hodiny.length) { i = k; break; }
    }
  }
  if (i === -1) i = dny.length - 1;

  let zbyva = posun || 0;
  while (zbyva > 0 && i < dny.length - 1) {
    i++;
    if (dny[i].hodiny.length) zbyva--;
  }
  return i;
}

function stavDne(den, ted, kratky) {
  const jeDnes = den.datum === isoDatum(ted);
  const vyuka = den.hodiny.filter((h) => !h.odpada);

  if (!vyuka.length) return { text: den.popis || "volno", ok: false };

  if (!jeDnes) {
    const prvni = vyuka[0];
    const posledni = vyuka[vyuka.length - 1];
    if (kratky) return { text: `${prvni.od}–${posledni.do}`, ok: true };
    return { text: `${vyuka.length} hodin · ${prvni.od}–${posledni.do}`, ok: true };
  }

  const m = minutDne(ted);
  const prave = vyuka.find((h) => h.zacatek <= m && h.konec > m);
  if (prave) {
    const zbyloMin = prave.konec - m;
    if (kratky) return { text: `teď ${prave.zkratka} · ${zbyloMin} min`, ok: true };
    return { text: `teď ${prave.zkratka}${prave.ucebna ? " " + prave.ucebna : ""} · ještě ${zbyloMin} min`, ok: true };
  }

  const dalsi = vyuka.find((h) => h.zacatek > m);
  if (dalsi) {
    const za = dalsi.zacatek - m;
    const kde = dalsi.zkratka + (dalsi.ucebna ? " " + dalsi.ucebna : "");
    if (kratky) return { text: za <= 60 ? `za ${za} min · ${dalsi.zkratka}` : `${dalsi.od} · ${dalsi.zkratka}`, ok: true };
    if (za <= 60) return { text: `za ${za} min · ${kde}`, ok: true };
    return { text: `${dalsi.od} · ${kde}`, ok: true };
  }

  return { text: kratky ? "hotovo" : "dnes už nic", ok: false };
}

// Color.dynamic(svetla, tmava) ve widgetu FUNGUJE — vybere si samo iOS pri
// vykreslovani. Jedine, co dynamicke byt nemuze, je nakresleny obrazek pozadi;
// ten je proto jen pruhledna vrstva z bile a cerne (viz prekryv()).
function barva(svetla, tmava) {
  const s = new Color(svetla[0], svetla.length > 1 ? svetla[1] : 1);
  const t = new Color(tmava[0], tmava.length > 1 ? tmava[1] : 1);
  if (CONFIG.vzhled === "svetly") return s;
  if (CONFIG.vzhled === "tmavy") return t;
  try {
    if (typeof Color.dynamic === "function") return Color.dynamic(s, t);
  } catch (e) {}
  return jeTma() ? t : s;
}

const pismo = barva(["#16222e"], ["#eaf1f8"]);
const pismoSlabe = barva(["#16222e", 0.62], ["#eaf1f8", 0.6]);
const pismoMdle = barva(["#16222e", 0.42], ["#eaf1f8", 0.42]);
const modry = barva(["#1c6fa8"], ["#5cb0ee"]);
const modryFond = barva(["#1c6fa8", 0.12], ["#5cb0ee", 0.16]);
const panel = barva(["#16222e", 0.05], ["#ffffff", 0.06]);
const zluty = barva(["#9a6512"], ["#f2c46b"]);
const cerveny = barva(["#b8321f"], ["#ff9d92"]);

function mezibod(od, k, podil) {
  return new Point(od.x + (k.x - od.x) * podil, od.y + (k.y - od.y) * podil);
}

// Hexagon se zaoblenymi rohy. DrawContext nema nastaveni spoje car (nic jako
// lineJoin), takze zaobleni musi byt primo v ceste: u kazdeho vrcholu se
// zastavi kousek pred nim, a misto hrotu se udela kvadraticka krivka, ktera
// ma vrchol jako ridici bod. `zaobleni` je podil delky strany, 0 = ostry roh.
function hexagon(cx, cy, r, zaobleni) {
  const podil = zaobleni == null ? 0.25 : zaobleni;

  const vrcholy = [];
  for (let i = 0; i < 6; i++) {
    const uhel = (Math.PI / 3) * i - Math.PI / 2;
    vrcholy.push(new Point(cx + r * Math.cos(uhel), cy + r * Math.sin(uhel)));
  }

  const p = new Path();
  if (podil <= 0) {
    vrcholy.forEach((b, i) => (i === 0 ? p.move(b) : p.addLine(b)));
    p.closeSubpath();
    return p;
  }

  for (let i = 0; i < 6; i++) {
    const vrchol = vrcholy[i];
    const pred = mezibod(vrchol, vrcholy[(i + 5) % 6], podil);
    const po = mezibod(vrchol, vrcholy[(i + 1) % 6], podil);

    if (i === 0) p.move(pred);
    else p.addLine(pred);
    p.addQuadCurve(po, vrchol);
  }

  p.closeSubpath();
  return p;
}


// Barevny podklad. Dynamicke barvy => prepnuti Light/Dark resi iOS samo.
function pozadiPrechod() {
  const g = new LinearGradient();
  g.colors = [
    barva(["#ffffff"], ["#243343"]),
    barva(["#e9f1fa"], ["#121a23"]),
    barva(["#cadcef"], ["#030405"])
  ];
  g.locations = [0, 0.48, 1];
  g.startPoint = new Point(0, 0);
  g.endPoint = new Point(0.25, 1);
  return g;
}

// Jeden hexagon z loga Bakalaru v rohu, jinak nic — zadne fasety, ty delaly
// pozadi nespokojene. Kresli se akcentni modrou s nizkym krytim, takze jeden
// obrazek sedi na tmavy i svetly podklad a barvu si bere zespodu.
function prekryv(sirka, vyska) {
  const dc = new DrawContext();
  dc.size = new Size(sirka, vyska);
  dc.opaque = false;
  dc.respectScreenScale = true;

  // Ctvercove velikosti (1x1, large) maji znak blizko rohu, siroka 2x1 ho ma
  // kousek dovnitr — jinak by z nej u nizkeho widgetu zbyl jen prouzek.
  const ctverec = sirka / vyska < 1.4;
  const r = Math.min(vyska * 0.44, sirka * (ctverec ? 0.3 : 0.28));
  const cx = sirka * (ctverec ? 0.86 : 0.84);
  const cy = vyska * (ctverec ? 0.76 : 0.68);

  // mekka zare: sedm sirokych tahu s nizkym krytim, od nejsirsiho k nejuzsimu.
  // DrawContext neumi stin ani rozostreni, tohle je nejblizsi nahrada.
  // Tahu musi byt hodne: pri trech jsou na prechodu videt soustredne stupne.
  for (let i = 7; i >= 1; i--) {
    dc.setLineWidth(r * 0.075 * i * 1.7);
    dc.setStrokeColor(new Color("#4aa0d9", 0.022));
    dc.addPath(hexagon(cx, cy, r));
    dc.strokePath();
  }

  // jemna vypln, aby mel tvar telo a nebyl to jen dratovy obrys
  dc.setFillColor(new Color("#4aa0d9", 0.05));
  dc.addPath(hexagon(cx, cy, r * 0.96));
  dc.fillPath();

  // vnejsi prstenec
  dc.setLineWidth(r * 0.12);
  dc.setStrokeColor(new Color("#4aa0d9", 0.34));
  dc.addPath(hexagon(cx, cy, r));
  dc.strokePath();

  // vnitrni hexagon — motiv z ikony Bakalaru
  dc.setLineWidth(r * 0.07);
  dc.setStrokeColor(new Color("#4aa0d9", 0.2));
  dc.addPath(hexagon(cx, cy, r * 0.6));
  dc.strokePath();

  return dc.getImage();
}

// ListWidget kresli bud backgroundGradient, NEBO backgroundImage — ne obojí
// pres sebe (to byla ta chyba, kdy hexagon zmizel). Vnoreny stack uz ale ma
// vlastni vrstvu, takze jeho backgroundImage lezi nad prechodem widgetu.
// Vraci stack, do ktereho patri veskery obsah widgetu.
function vrstvaPozadi(w, sirka, vyska) {
  w.backgroundGradient = pozadiPrechod();
  w.setPadding(0, 0, 0, 0);

  const k = w.addStack();
  k.layoutVertically();
  k.backgroundImage = prekryv(sirka, vyska);
  return k;
}

function napis(stack, text, font, barva) {
  const t = stack.addText(text);
  t.font = font;
  t.textColor = barva;
  return t;
}

function radekHodiny(seznam, h, ted, jeDnes, velikosti) {
  const m = minutDne(ted);
  const prave = jeDnes && h.zacatek <= m && h.konec > m && !h.odpada;

  const row = seznam.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.setPadding(velikosti.pad, velikosti.zkratky ? 6 : 8, velikosti.pad, velikosti.zkratky ? 6 : 8);
  row.cornerRadius = 8;
  row.spacing = 6;
  row.backgroundColor = prave ? modryFond : panel;

  const casBox = row.addStack();
  casBox.size = new Size(velikosti.sirkaCas, 0);
  napis(casBox, h.od, Font.mediumSystemFont(velikosti.fCas),
    prave ? modry : pismoSlabe).lineLimit = 1;

  const popisek = velikosti.zkratky
    ? h.zkratka || h.predmet || "—"
    : h.predmet || h.zkratka || "—";

  const nazev = napis(row, popisek,
    prave || velikosti.zkratky
      ? Font.semiboldSystemFont(velikosti.fNazev)
      : Font.systemFont(velikosti.fNazev),
    h.odpada ? pismoMdle : pismo);
  nazev.lineLimit = 1;

  row.addSpacer();

  const ucebnaBox = row.addStack();
  ucebnaBox.size = new Size(velikosti.sirkaUcebna, 0);

  if (h.odpada) {
    napis(ucebnaBox, velikosti.zkratky ? "odp." : "odpadá",
      Font.semiboldSystemFont(velikosti.fUcebna), zluty).lineLimit = 1;
  } else {
    const zvyraznit = h.typZmeny === "RoomChanged" || h.typZmeny === "Substitution";
    napis(ucebnaBox, h.ucebna || "–", Font.boldSystemFont(velikosti.fUcebna),
      zvyraznit ? zluty : prave ? modry : pismo).lineLimit = 1;
  }
}

function blokDne(w, den, ted, kolikRadku) {
  const jeDnes = den.datum === isoDatum(ted);

  const hlava = w.addStack();
  hlava.layoutHorizontally();
  hlava.centerAlignContent();
  napis(hlava, popisDne(den.date, ted), Font.boldSystemFont(12.5), pismo);
  hlava.addSpacer(5);
  napis(hlava, kratkeDatum(den.date), Font.systemFont(11), pismoSlabe);
  hlava.addSpacer();

  const s = stavDne(den, ted, true);
  napis(hlava, s.text, Font.systemFont(9.5), s.ok ? modry : pismoSlabe).lineLimit = 1;

  w.addSpacer(3);
  const seznam = w.addStack();
  seznam.layoutVertically();
  seznam.spacing = 1;

  const hodiny = zbyvajici(den, ted).slice(0, kolikRadku);
  if (!hodiny.length) {
    napis(seznam, den.popis || "volno", Font.systemFont(11), pismoSlabe);
    return;
  }

  hodiny.forEach((h) => radekHodiny(seznam, h, ted, jeDnes,
    { pad: 1.5, sirkaCas: 34, sirkaUcebna: 48, fCas: 9.5, fNazev: 11.5, fUcebna: 10.5 }));
}

function postavWidget(data, ted, rodina, posun) {
  const male = rodina === "small";
  const viceDnu = rodina === "large";

  const w = new ListWidget();
  const k = vrstvaPozadi(w, male ? 170 : 360, viceDnu ? 380 : 170);
  k.setPadding(11, 13, 10, 13);
  w.url = "scriptable:///run/" + encodeURIComponent(Script.name());

  const start = vyberIndex(data.dny, ted, posun);
  if (start === -1) {
    napis(k, "Žádná data", Font.systemFont(12), pismoSlabe);
    k.addSpacer();
    w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
    return w;
  }

  const den = data.dny[start];
  const jeDnes = den.datum === isoDatum(ted);

  w.refreshAfterDate = kdyObnovit(den, ted, jeDnes);

  const hlavicka = k.addStack();
  hlavicka.layoutHorizontally();
  hlavicka.centerAlignContent();

  if (viceDnu) {
    napis(hlavicka, "Rozvrh", Font.boldSystemFont(14), pismo);
  } else {
    napis(hlavicka, popisDne(den.date, ted), Font.boldSystemFont(male ? 13 : 15), pismo);
    hlavicka.addSpacer(5);
    napis(hlavicka, kratkeDatum(den.date), Font.systemFont(male ? 11 : 12), pismoSlabe);
  }

  hlavicka.addSpacer();

  const vyuka = den.hodiny.filter((h) => !h.odpada);
  const zbyle = zbyvajici(den, ted).filter((h) => !h.odpada);
  if (vyuka.length) {
    const konec = (zbyle.length ? zbyle : vyuka)[(zbyle.length ? zbyle : vyuka).length - 1].do;
    napis(hlavicka, `do ${konec}`, Font.mediumSystemFont(male ? 10 : 11), pismoSlabe);
  } else if (data.trida) {
    napis(hlavicka, data.trida, Font.mediumSystemFont(male ? 10 : 11), pismoSlabe);
  }

  if (viceDnu) {
    let dalsi = data.dny.slice(start).filter((d) => d.hodiny.length).slice(0, 2);
    if (!dalsi.length) dalsi = [den];
    dalsi.forEach((d, i) => {
      k.addSpacer(i === 0 ? 7 : 10);
      blokDne(k, d, ted, 6);
    });
    k.addSpacer();
    return w;
  }

  k.addSpacer(male ? 5 : 6);

  const seznam = k.addStack();
  seznam.layoutVertically();
  seznam.spacing = 1;

  const radku = male ? CONFIG.maleHodin : 5;
  const hodiny = zbyvajici(den, ted).slice(0, radku);

  if (!hodiny.length) {
    napis(seznam, den.popis || "volno", Font.systemFont(male ? 11 : 12.5), pismoSlabe);
  } else {
    const velikosti = male
      ? { pad: 0.5, sirkaCas: 26, sirkaUcebna: 38, fCas: 8.5, fNazev: 10.5, fUcebna: 9.5, zkratky: true }
      : { pad: 2, sirkaCas: 34, sirkaUcebna: 48, fCas: 9.5, fNazev: 12, fUcebna: 10.5 };
    hodiny.forEach((h) => radekHodiny(seznam, h, ted, jeDnes, velikosti));
  }

  k.addSpacer();

  const patka = k.addStack();
  patka.layoutHorizontally();
  patka.centerAlignContent();

  const stav = stavDne(den, ted, male);
  const sBarva = stav.ok ? modry : pismoSlabe;
  const v = male ? 9 : 10;
  napis(patka, stav.ok ? "●" : "○", Font.systemFont(v - 1), sBarva);
  patka.addSpacer(4);
  napis(patka, stav.text, Font.systemFont(v), sBarva).lineLimit = 1;

  const skryte = zbyvajici(den, ted).length - radku;
  patka.addSpacer();
  if (skryte > 0) napis(patka, `+${skryte}`, Font.systemFont(v), pismoSlabe);

  return w;
}

function kdyObnovit(den, ted, jeDnes) {
  const zaMin = CONFIG.obnovitPoMin;
  if (!jeDnes) return new Date(Date.now() + zaMin * 60 * 1000);

  const m = minutDne(ted);
  const hranice = den.hodiny
    .map((h) => h.konec)
    .filter((k) => k > m)
    .sort((a, b) => a - b)[0];

  if (!hranice) return new Date(Date.now() + zaMin * 60 * 1000);
  return new Date(Date.now() + Math.max(1, Math.min(zaMin, hranice - m + 1)) * 60 * 1000);
}

function widgetChyby(zprava) {
  const w = new ListWidget();
  const k = vrstvaPozadi(w, 360, 170);
  k.setPadding(11, 13, 10, 13);
  napis(k, "Rozvrh", Font.boldSystemFont(14), pismo);
  k.addSpacer(6);
  napis(k, zprava, Font.systemFont(11), cerveny).lineLimit = 3;
  k.addSpacer();
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  return w;
}

const HTML_SABLONA = `
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<script>
/* Prazdne = necháme rozhodnout prefers-color-scheme, tj. systemovy vzhled iOS.
   Vyplnene jen kdyz si v CONFIG.vzhled vynutis konkretni tema. */
var vynucene = "__TEMA__";
if (vynucene) document.documentElement.setAttribute("data-tema", vynucene);
</script>
<style>
:root{
  color-scheme:dark light;
  /* tmave (vychozi) — neutralni podklad, jedina barva navic je akcentni modra */
  --bg:#0c0f14;
  --plocha:radial-gradient(circle at 88% 82%, rgba(92,176,238,.1) 0 22%, transparent 55%),
           linear-gradient(#222932, #0c0f14);
  --text:#eaf1f8; --dim:#93a6ba; --accent:#5cb0ee;
  --panel:rgba(255,255,255,.06);
  --panel2:rgba(255,255,255,.1);
  --okraj:rgba(255,255,255,.14);
  --fond:rgba(92,176,238,.16);
  --naAkcent:#0c0f14;
  --warn:#f2c46b; --err:#ff9d92;
  --pole:rgba(255,255,255,.08);
  --zmena-pole:rgba(242,196,107,.18);
}

@media (prefers-color-scheme: light){
  :root:not([data-tema="tmavy"]){
    --bg:#f7fafd;
    --plocha:radial-gradient(circle at 88% 82%, rgba(28,111,168,.09) 0 22%, transparent 55%),
             linear-gradient(#fdfeff, #e6eef7);
    --text:#16222e; --dim:#5f7285; --accent:#1c6fa8;
    --panel:rgba(22,34,46,.05);
    --panel2:rgba(22,34,46,.09);
    --okraj:rgba(22,34,46,.14);
    --fond:rgba(28,111,168,.12);
    --naAkcent:#ffffff;
    --warn:#9a6512; --err:#b8321f;
    --pole:rgba(22,34,46,.08);
    --zmena-pole:rgba(154,101,18,.12);
  }
}

:root[data-tema="svetly"]{
  --bg:#f7fafd;
  --plocha:radial-gradient(circle at 88% 82%, rgba(28,111,168,.09) 0 22%, transparent 55%),
           linear-gradient(#fdfeff, #e6eef7);
  --text:#16222e; --dim:#5f7285; --accent:#1c6fa8;
  --panel:rgba(22,34,46,.05);
  --panel2:rgba(22,34,46,.09);
  --okraj:rgba(22,34,46,.14);
  --fond:rgba(28,111,168,.12);
  --naAkcent:#ffffff;
  --warn:#9a6512; --err:#b8321f;
  --pole:rgba(22,34,46,.08);
  --zmena-pole:rgba(154,101,18,.12);
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;margin:0;padding:0}
html,body{height:100%}
body{
  background:var(--plocha);
  background-color:var(--bg);color:var(--text);
  font:400 15px/1.35 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;
  display:flex;flex-direction:column;overflow:hidden;
  padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
}
header{
  padding:18px 18px 12px;display:flex;align-items:center;gap:12px;
}
header .hex{flex:0 0 30px;height:34px;color:var(--accent)}
header .t{flex:1;min-width:0}
header h1{font-size:20px;font-weight:700;letter-spacing:-.02em}
header p{font-size:12px;color:var(--dim);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.trida{font-size:13px;font-weight:600;background:var(--panel);
  border:1px solid var(--okraj);
  padding:6px 12px;border-radius:999px;white-space:nowrap}
nav{display:flex;gap:6px;padding:12px 18px 10px;overflow-x:auto;scrollbar-width:none}
nav::-webkit-scrollbar{display:none}
nav button{
  flex:0 0 auto;background:var(--panel);color:var(--dim);border:1px solid var(--okraj);
  border-radius:999px;padding:7px 13px;font-size:12.5px;font-weight:600;font-family:inherit;
  display:flex;align-items:center;gap:6px;transition:.15s;
}
nav button.on{background:var(--accent);color:var(--naAkcent);border-color:var(--accent)}
nav button .d{width:6px;height:6px;border-radius:50%;background:var(--warn);opacity:0}
nav button.zmeny .d{opacity:1}
nav button.on .d{background:var(--naAkcent)}
.days{flex:1;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;
  scrollbar-width:none;overscroll-behavior-x:contain}
.days::-webkit-scrollbar{display:none}
.day{flex:0 0 100%;scroll-snap-align:center;overflow-y:auto;padding:2px 18px 18px}
.day h2{font-size:14px;font-weight:600;color:var(--dim);margin-bottom:10px}
.hod{
  background:var(--panel);
  border:1.5px solid var(--okraj);
  border-radius:14px;
  padding:11px 13px;
  margin-bottom:8px;
  display:flex;
  gap:11px;
  align-items:flex-start;
}
.hod.ted{background:var(--fond);border-color:var(--accent)}
.hod.pryc{opacity:.4}
.hod.odpada{opacity:.52}
.hod.odpada .n{text-decoration:line-through}
.hod.zmena{border-color:var(--warn)}
.hod .cas{flex:0 0 42px;text-align:center;padding-top:1px}
.hod .cas b{display:block;font-size:15px;font-weight:700;line-height:1.1}
.hod .cas span{display:block;font-size:10.5px;color:var(--dim);margin-top:2px}
.hod.ted .cas b{color:var(--accent)}
.hod.ted .cas span{color:var(--dim)}
.hod .b{flex:1;min-width:0}
.hod .k{display:flex;align-items:center;gap:7px;margin-bottom:2px}
.hod .zk{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--dim)}
.hod .uc{font-size:11px;color:var(--dim)}
.hod.ted .zk{color:var(--accent)}
.hod.ted .uc{color:var(--dim)}
.hod .n{font-size:14.5px;line-height:1.3}
.hod.ted .n{font-weight:600}
.hod .tema{font-size:11.5px;color:var(--dim);margin-top:3px}
.hod.ted .tema{color:var(--dim)}
.hod .zm{font-size:11.5px;color:var(--warn);margin-top:3px}
.hod.zmena .zm{color:var(--warn)}
.hod.ted .zm{color:var(--warn)}
.hod .ucebna{
  flex:0 0 auto;font-size:14px;font-weight:700;background:var(--pole);
  border-radius:9px;padding:6px 9px;min-width:42px;text-align:center;
}
.hod.ted .ucebna{background:var(--accent);color:var(--naAkcent)}
.hod.zmena .ucebna{background:var(--zmena-pole);color:var(--warn)}
.note{font-size:12px;color:var(--dim);padding:2px 2px 14px}
.volno{color:var(--dim);font-size:14px;padding:20px 2px}
.spin{flex:1;display:flex;align-items:center;justify-content:center;color:var(--dim);font-size:14px}
</style>

<header>
  <svg class="hex" viewBox="0 0 34 38" fill="none" aria-hidden="true">
    <path d="M17 2.5 30.5 10.25v15.5L17 33.5 3.5 25.75v-15.5z" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/>
  </svg>
  <div class="t"><h1 id="nadpis">Rozvrh</h1><p id="podnadpis"></p></div>
  <div class="trida" id="trida">–</div>
</header>
<nav id="nav"></nav>
<div class="days" id="days"><div class="spin">načítám…</div></div>

<script>
const D = __DATA__;
const DNY = ["Ne","Po","Út","St","Čt","Pá","So"];
const PLNE = ["Neděle","Pondělí","Úterý","Středa","Čtvrtek","Pátek","Sobota"];
let idx = 0;

function el(tag, cls, text){
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function p2(n){ return String(n).padStart(2,"0"); }

function dnesIso(){
  const d = new Date();
  return d.getFullYear() + "-" + p2(d.getMonth()+1) + "-" + p2(d.getDate());
}

function minTed(){
  const d = new Date();
  return d.getHours()*60 + d.getMinutes();
}

function dat(iso){ return new Date(iso + "T00:00:00"); }

function labelDne(iso){
  const r = Math.round((dat(iso).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
  if (r === 0) return "Dnes";
  if (r === 1) return "Zítra";
  return DNY[dat(iso).getDay()];
}

function celeDne(iso){
  const r = Math.round((dat(iso).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
  if (r === 0) return "Dnes";
  if (r === 1) return "Zítra";
  return PLNE[dat(iso).getDay()];
}

function vykresli(){
  document.getElementById("trida").textContent = D.trida || "–";

  const nav = document.getElementById("nav");
  nav.innerHTML = "";

  D.dny.forEach(function(d, i){
    const zmeny = d.hodiny.some(function(h){ return h.typZmeny; });
    const b = el("button", (i === idx ? "on " : "") + (zmeny ? "zmeny" : ""));
    b.appendChild(el("span", "d"));
    b.appendChild(el("span", null, labelDne(d.datum) + " " + dat(d.datum).getDate() + "."));
    b.onclick = function(){ skoc(i); };
    nav.appendChild(b);
  });

  const wrap = document.getElementById("days");
  wrap.innerHTML = "";

  const dnes = dnesIso();
  const m = minTed();

  D.dny.forEach(function(d){
    const page = el("div", "day");
    const dt = dat(d.datum);
    page.appendChild(el("h2", null, dt.getDate() + ". " + (dt.getMonth()+1) + ". " + dt.getFullYear()));

    if (!d.hodiny.length) {
      page.appendChild(el("div", "volno", d.popis || "Žádná výuka"));
      wrap.appendChild(page);
      return;
    }

    const jeDnes = d.datum === dnes;

    d.hodiny.forEach(function(h){
      let cls = "hod";
      if (jeDnes && h.zacatek <= m && h.konec > m && !h.odpada) cls += " ted";
      else if (jeDnes && h.konec <= m) cls += " pryc";
      if (h.odpada) cls += " odpada";
      else if (h.typZmeny) cls += " zmena";

      const c = el("div", cls);

      const cas = el("div", "cas");
      cas.appendChild(el("b", null, h.cislo));
      cas.appendChild(el("span", null, h.od));
      c.appendChild(cas);

      const b = el("div", "b");
      const head = el("div", "k");
      head.appendChild(el("span", "zk", h.zkratka || "?"));
      if (h.ucitel) head.appendChild(el("span", "uc", h.ucitel));
      b.appendChild(head);
      b.appendChild(el("div", "n", h.predmet || h.zkratka || "—"));
      if (h.tema) b.appendChild(el("div", "tema", h.tema));
      if (h.zmena) b.appendChild(el("div", "zm", h.zmena));
      c.appendChild(b);

      c.appendChild(el("div", "ucebna", h.odpada ? "—" : (h.ucebna || "?")));
      page.appendChild(c);
    });

    const vyuka = d.hodiny.filter(function(h){ return !h.odpada; });
    if (vyuka.length) {
      const prvni = vyuka[0], posledni = vyuka[vyuka.length-1];
      page.appendChild(el("div", "note", vyuka.length + " hodin · " + prvni.od + "–" + posledni.do));
    }

    wrap.appendChild(page);
  });

  wrap.scrollLeft = idx * wrap.clientWidth;
  nadpisDne();
}

function nadpisDne(){
  const d = D.dny[idx];
  document.getElementById("nadpis").textContent = d ? celeDne(d.datum) : "Rozvrh";
  const p = document.getElementById("podnadpis");
  if (!d) { p.textContent = ""; return; }
  const dt = dat(d.datum);
  p.textContent = DNY[dt.getDay()] + " " + dt.getDate() + ". " + (dt.getMonth()+1) + ".";
}

function oznac(i){
  const nav = document.getElementById("nav");
  for (let j = 0; j < nav.children.length; j++) {
    nav.children[j].classList.toggle("on", j === i);
  }
  const akt = nav.children[i];
  if (akt) akt.scrollIntoView({inline: "center", block: "nearest", behavior: "smooth"});
  nadpisDne();
}

function skoc(i){
  idx = i;
  const wrap = document.getElementById("days");
  const cil = i * wrap.clientWidth;
  wrap.scrollTo({ left: cil, behavior: "smooth" });
  setTimeout(function(){
    if (Math.abs(wrap.scrollLeft - cil) > 4) wrap.scrollLeft = cil;
  }, 350);
  oznac(i);
}

document.getElementById("days").addEventListener("scroll", function(){
  const i = Math.round(this.scrollLeft / this.clientWidth);
  if (i !== idx && D.dny[i]) {
    idx = i;
    oznac(i);
  }
}, {passive: true});

(function(){
  const dnes = dnesIso();
  let i = D.dny.findIndex(function(d){ return d.datum === dnes; });
  if (i < 0) {
    i = D.dny.findIndex(function(d){ return d.datum > dnes && d.hodiny.length; });
    if (i < 0) i = 0;
  }
  idx = i;
  vykresli();
  window.addEventListener("resize", function(){
    document.getElementById("days").scrollLeft = idx * document.getElementById("days").clientWidth;
  });
})();
</script>
`;

function proApp(data) {
  return {
    trida: data.trida || "",
    dny: data.dny.map((d) => ({
      datum: d.datum,
      popis: d.popis,
      hodiny: d.hodiny
    }))
  };
}

async function spust(posun) {
  nactiUcet();

  if (config.runsInWidget) {
    let widget;
    try {
      const data = await nactiData();
      widget = postavWidget(data, new Date(), config.widgetFamily || "medium", posun);
    } catch (e) {
      widget = widgetChyby(String(e.message || e));
    }
    Script.setWidget(widget);
  } else {
    // prvni spusteni: zeptat se na prihlaseni driv, nez se zacne cokoli stahovat
    if (!maUcet() && lzeSePtat()) {
      await prihlasDialogem("Vítej! Přihlas se do Bakalářů — údaje se uloží a příště už je zadávat nebudeš.");
    }
    const data = await nactiData();
    const wv = new WebView();
    const html = HTML_SABLONA
      .replace("__TEMA__", CONFIG.vzhled === "tmavy" || CONFIG.vzhled === "svetly" ? CONFIG.vzhled : "")
      .replace("__DATA__", JSON.stringify(proApp(data)));
    await wv.loadHTML(html);
    await wv.present(true);
  }
  Script.complete();
}

module.exports = { spust, nastavUcet, zapomenUcet };

const jeHlavni = module.filename.includes(Script.name());
if (jeHlavni) {
  const param = String(args.widgetParameter == null ? "" : args.widgetParameter).trim().toLowerCase();
  if (param === "ucet" || param === "účet" || param === "odhlasit" || param === "prihlasit") {
    nastavUcet().then(() => Script.complete());
  } else {
    spust(Number(param) || 0);
  }
}
