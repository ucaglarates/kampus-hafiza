export const HUKUKI_SURUM = "2026-08-01";

export type HukukiSekme =
  | "aydinlatma"
  | "gizlilik"
  | "kosullar"
  | "kurallar";

export const HUKUKI_SEKMELER: Array<{
  id: HukukiSekme;
  ad: string;
}> = [
  { id: "aydinlatma", ad: "KVKK Aydınlatma" },
  { id: "gizlilik", ad: "Gizlilik" },
  { id: "kosullar", ad: "Kullanım Koşulları" },
  { id: "kurallar", ad: "Topluluk Kuralları" },
];

