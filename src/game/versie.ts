/**
 * Versie van het spel, vast bij het opstarten (wisselen = opnieuw laden):
 *  - "standaard": realistische personages (Rocketbox), echte planten, nabewerking, HDRI-lucht,
 *    oppervlaktedetail, wind, wolkenschaduw, vogels en rook;
 *  - "laag" (lage resolutie): het eerdere beeld met de Quaternius-figuren en Kenney-planten,
 *    zonder die extra's. Laadt ook veel minder (fijn op een trage verbinding of oude laptop).
 * Testen kan met ?versie=laag in de adresbalk.
 */
export type Versie = 'standaard' | 'laag';

function lees(): Versie {
  try {
    const url = new URLSearchParams(location.search).get('versie');
    if (url === 'laag' || url === 'standaard') return url;
    const v = JSON.parse(localStorage.getItem('wijkwijs-instellingen') ?? '{}').versie;
    return v === 'laag' ? 'laag' : 'standaard';
  } catch { return 'standaard'; }
}

export const VERSIE: Versie = lees();
export const LAGE_RESOLUTIE = VERSIE === 'laag';
