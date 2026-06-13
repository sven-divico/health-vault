/**
 * Central German strings for the whole product (web UI + Telegram bot).
 * Single language, compile-time — no i18n framework (YAGNI). Components import `t`
 * and use `t.area.key`; parameterized strings are functions.
 *
 * This module is pure data (no server-only imports) so it is safe in client and
 * server components and in the bot.
 */
export const t = {
  brand: 'Health Vault',

  nav: {
    dashboard: 'Übersicht',
    activity: 'Aktivität',
    nutrition: 'Ernährung',
    food: 'Essen',
    drinks: 'Getränke',
    body: 'Körper',
    weight: 'Gewicht',
    mood: 'Stimmung',
    measurements: 'Messwerte',
    insights: 'Auswertung',
    media: 'Medien',
    people: 'Personen',
    settings: 'Einstellungen',
  },

  common: {
    openMenu: 'Menü öffnen',
    closeMenu: 'Menü schließen',
    all: 'Alle',
    noData: 'Keine Daten',
    pageSize: 'Pro Seite',
  },

  range: {
    today: 'Heute',
    '24h': '24 Std',
    '7d': '7 Tage',
    month: 'Monat',
    all: 'Alle',
    label: 'Zeitraum',
  },

  dashboard: {
    greeting: (name: string) => `Hallo, ${name}`,
    subtitle: 'Die letzten 7 Tage im Überblick.',
    latestWeight: 'Aktuelles Gewicht',
    foodEntries7d: 'Mahlzeiten (7 T.)',
    moodTrend: 'Stimmungsverlauf',
    recentFood: 'Letzte Mahlzeiten',
    noFood: 'Noch keine Einträge. Sende dem Bot eine Nachricht oder ein Foto.',
    noLabel: '(ohne Bezeichnung)',
    kcalSuffix: (kcal: number) => ` · ~${kcal} kcal`,
  },

  measures: {
    title: 'Messwerte',
    activity: 'Aktivität',
    noActivity: 'Keine Aktivitätseinträge.',
    weightTitle: 'Gewicht (kg)',
    moodTitle: 'Stimmung (1–5)',
    minSuffix: (min: number) => ` · ${min} Min`,
    noData: 'Noch keine Daten.',
    activityFallback: 'Aktivität',
  },

  insights: {
    title: 'Auswertung',
    subtitle: 'Wähle Messgrößen zum Vergleichen. Zoome mit dem Regler oder per Scrollen im Diagramm.',
    selectAtLeastOne: 'Wähle mindestens eine Messgröße.',
    stacked: 'Gestapelt',
    overlay: 'Überlagert',
    noDataSuffix: ' (keine Daten)',
  },

  metrics: {
    weight: 'Gewicht',
    mood: 'Stimmung',
    activity: 'Aktivität',
    kcal: 'Essen',
    drinkVolume: 'Getränke',
    alcohol: 'Alkohol',
  },

  media: {
    title: 'Medien',
    noImages: 'Noch keine Bilder. Sende dem Bot ein Foto.',
  },

  food: {
    title: 'Essensprotokoll',
    noEntries: 'Noch keine Einträge.',
    noLabel: '(ohne Bezeichnung)',
    kcalSuffix: (kcal: number) => ` · ~${kcal} kcal`,
    visionSuffix: (pct: number) => ` · Bild ${pct}%`,
    // Table
    colTime: 'Zeit',
    colImage: 'Bild',
    colDish: 'Gericht',
    colPortion: 'Portion (g)',
    colActions: 'Aktionen',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    confirmDelete: 'Diesen Eintrag wirklich löschen?',
    dishPlaceholder: 'Gericht',
    portionPlaceholder: 'Portion (g)',
    dishRequired: 'Gericht darf nicht leer sein.',
    portionInvalid: 'Portion muss größer als 0 sein.',
    estimateFailed: 'Nährwertschätzung fehlgeschlagen — Gericht aktualisiert, Werte bleiben leer.',
    // Summary band
    summaryTitle: 'Zusammenfassung',
    periodCol: 'Zeitraum',
    periods: {
      today: 'Heute (seit Mitternacht)',
      '24h': '24 Std',
      '7d': '7 Tage',
      month: 'Monat (31 Tage)',
      all: 'Alle',
    } as Record<string, string>,
    // Pagination
    pageSizeLabel: 'Pro Seite',
    pageInfo: (x: number, y: number) => `Seite ${x} von ${y}`,
    totalEntries: (n: number) => `${n} Einträge`,
    prev: 'Zurück',
    next: 'Weiter',
  },

  drinks: {
    title: 'Getränke',
    // Table
    colTime: 'Zeit',
    colName: 'Getränk',
    colVolume: 'Menge (ml)',
    colAlcohol: 'Alkohol (g)',
    colSugar: 'Zucker (g)',
    colActions: 'Aktionen',
    noEntries: 'Noch keine Getränke.',
    noLabel: '(ohne Bezeichnung)',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    confirmDelete: 'Dieses Getränk wirklich löschen?',
    namePlaceholder: 'Getränk',
    volumePlaceholder: 'Menge (ml)',
    nameRequired: 'Getränk darf nicht leer sein.',
    volumeInvalid: 'Menge muss größer als 0 sein.',
    estimateFailed: 'Schätzung fehlgeschlagen — Getränk aktualisiert, Werte bleiben leer.',
    // Add form
    addTitle: 'Getränk hinzufügen',
    add: 'Hinzufügen',
    alcoholOverride: 'Alkohol (g/100 ml, optional)',
    sugarOverride: 'Zucker (g/100 ml, optional)',
    // Summary band
    summaryTitle: 'Zusammenfassung',
    periodCol: 'Zeitraum',
    periods: {
      today: 'Heute (seit Mitternacht)',
      '24h': '24 Std',
      '7d': '7 Tage',
      month: 'Monat (31 Tage)',
      all: 'Alle',
    } as Record<string, string>,
    // Water gauge
    gaugeTitle: 'Wasserhaushalt heute',
    gaugeLabel: (consumedL: string, goalL: string, pct: number) => `${consumedL} / ${goalL} L · ${pct} %`,
    // Pagination
    pageSizeLabel: 'Pro Seite',
    pageInfo: (x: number, y: number) => `Seite ${x} von ${y}`,
    totalEntries: (n: number) => `${n} Getränke`,
    prev: 'Zurück',
    next: 'Weiter',
  },

  people: {
    title: 'Personen',
    adminDisabled: 'Admin deaktiviert (kein ADMIN_SECRET gesetzt).',
    adminSecret: 'Admin-Geheimnis',
    unlock: 'Entsperren',
    linked: 'verknüpft',
    notLinked: 'nicht verknüpft',
    newUsername: 'neuer Benutzername',
    invite: 'Einladen',
    inviteHint:
      'Nach dem Einladen wird der neue Einladungs-Token serverseitig erzeugt; teile den passenden /start <Token> aus deinen Unterlagen oder über die API.',
    invalidSecret: 'Ungültiges Geheimnis',
    usernameRequired: 'Benutzername erforderlich',
  },

  settings: {
    title: 'Einstellungen',
    placeholder: 'Einstellungen folgen hier. (Platzhalter für v1.)',
  },

  login: {
    title: 'Anmeldung',
    username: 'Benutzername',
    continue: 'Weiter',
    submitting: '…',
    viewDemo: 'Demo ansehen (kein Telegram nötig)',
    demoUnavailable: 'Demo nicht verfügbar — führe `npm run db:seed-demo` aus.',
    loginFailed: 'Anmeldung fehlgeschlagen',
    codeInstructions: (sec: number) =>
      `Sende diesen 2-stelligen Code innerhalb von ${sec}s an den Health-Vault-Bot auf Telegram:`,
    restart: 'Neu starten',
    codeExpired: 'Code abgelaufen. Bitte erneut versuchen.',
  },

  bot: {
    welcomeNoToken: 'Willkommen. Um dieses Konto zu verknüpfen, verwende: /start &lt;Einladungs-Token&gt;',
    inviteInvalid: 'Einladungs-Token nicht erkannt.',
    inviteAlreadyUsed: 'Dieser Einladungs-Token wurde bereits verwendet.',
    telegramAlreadyLinked: 'Dieses Telegram-Konto ist bereits verknüpft.',
    linked: (username: string) => `Verknüpft. Willkommen, <b>${username}</b>.`,
    notLinked: 'Dieses Telegram-Konto ist nicht verknüpft. Bitte den Admin um einen Einladungslink.',
    weightUsage: 'Verwendung: /weight 82.4 [optionale Notiz]',
    weightLogged: (kg: string) => `✓ Gewicht ${kg} kg gespeichert`,
    moodUsage: 'Verwendung: /mood 1-5 [optionale Notiz]',
    moodLogged: (score: string) => `✓ Stimmung ${score} gespeichert`,
    activityUsage: 'Verwendung: /activity Lauf 28min [optionale Notiz]',
    activityLogged: (label: string, dur: string, hint: string) => `✓ Aktivität gespeichert: <b>${label}</b>${dur}${hint}`,
    activityDurSuffix: (min: number) => ` · ${min} Min`,
    activityNoDuration: ' (keine Dauer erkannt — nicht darstellbar)',
    drinkUsage: 'Verwendung: /drink Bier 500ml',
    drinkLogged: (name: string, vol: string, alcohol: string) => `✓ Getränk gespeichert: <b>${name}</b> · ${vol}${alcohol}`,
    drinkVolMl: (ml: number) => `${ml} ml`,
    drinkAlcoholSuffix: (g: number) => ` · ${g} g Alkohol`,
    help: [
      '<b>Health Vault</b>',
      '/weight 82.4 — Gewicht speichern (kg)',
      '/mood 1-5 [Notiz] — Stimmung speichern',
      '/activity Lauf 28min [Notiz] — Aktivität speichern (Dauer wird grafisch dargestellt)',
      '/drink Bier 500ml — Getränk speichern (Alkohol/Zucker KI-geschätzt)',
      'Reiner Text — als Mahlzeit gespeichert',
      'Foto (optional mit Bildunterschrift) — Mahlzeitenfoto, KI-erkannt',
      'Zweistelliger Code — schließt eine ausstehende Web-Anmeldung ab',
    ].join('\n'),
    loggedInWeb: '✓ Im Web angemeldet',
    noPendingLogin: 'Kein ausstehender Login passt zu diesem Code.',
    textLogged: (text: string) => `✓ Gespeichert: ${text}`,
    photoFetchFailed: 'Foto konnte nicht von Telegram geladen werden.',
    photoLogged: (label: string, kcal: string, extra: string) => `✓ Foto gespeichert: <b>${label}</b>${kcal}${extra}`,
    photoKcalSuffix: (kcal: number) => ` ~${kcal} kcal`,
    mealUnrecognised: '(nicht erkannte Mahlzeit)',
    genericError: 'Entschuldigung, beim Verarbeiten ist etwas schiefgelaufen.',
  },
} as const;

/** German date/time formatting helpers (de-DE locale). */
export const fmt = {
  dateTime: (ms: number | Date): string =>
    new Date(ms).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }),
  date: (ms: number | Date): string =>
    new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
};
