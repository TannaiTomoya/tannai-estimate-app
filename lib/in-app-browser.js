/**
 * アプリ内ブラウザ（LINE / Instagram / Facebook など）の判定。
 * これらは window.print() が動かないため、外部ブラウザか PDF へ誘導する。
 */
const IN_APP_PATTERNS = [
  { name: "LINE", re: /\bLine\//i },
  { name: "Instagram", re: /Instagram/i },
  { name: "Facebook", re: /FBAN|FBAV|FB_IAB/i },
  { name: "X", re: /Twitter/i },
  { name: "TikTok", re: /musical_ly|BytedanceWebview|TikTok/i },
];

export function detectInAppBrowser(userAgent) {
  const ua = String(userAgent || "");
  const hit = IN_APP_PATTERNS.find((p) => p.re.test(ua));
  return hit ? hit.name : null;
}

/** LINE は URL に openExternalBrowser=1 があると標準ブラウザで開く */
export function externalBrowserUrl(href) {
  const url = new URL(href);
  url.searchParams.set("openExternalBrowser", "1");
  return url.toString();
}
