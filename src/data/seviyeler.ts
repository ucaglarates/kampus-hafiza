// ============================================================
// TOPLULUKTAKİ OYUNLAŞTIRILMIŞ SEVİYELER
// ============================================================

export type ToplulukSeviyesi = {
  seviye: number;
  ad: string;
  simge: string;
  gerekliXp: number;
  gerekliKatki: number;
  gerekliFaydaliOy: number;
};

export const toplulukSeviyeleri: ToplulukSeviyesi[] = [
  {
    seviye: 1,
    ad: "Yeni Gelen",
    simge: "●",
    gerekliXp: 0,
    gerekliKatki: 0,
    gerekliFaydaliOy: 0,
  },
  {
    seviye: 2,
    ad: "Katkıcı",
    simge: "◆",
    gerekliXp: 50,
    gerekliKatki: 3,
    gerekliFaydaliOy: 0,
  },
  {
    seviye: 3,
    ad: "Bilgi Elçisi",
    simge: "✦",
    gerekliXp: 200,
    gerekliKatki: 10,
    gerekliFaydaliOy: 20,
  },
  {
    seviye: 4,
    ad: "Kampüs Rehberi",
    simge: "✧",
    gerekliXp: 600,
    gerekliKatki: 25,
    gerekliFaydaliOy: 75,
  },
  {
    seviye: 5,
    ad: "Kampüs Efsanesi",
    simge: "★",
    gerekliXp: 1500,
    gerekliKatki: 60,
    gerekliFaydaliOy: 200,
  },
];

export const seviyeBilgisiniGetir = (seviye: number) =>
  toplulukSeviyeleri.find((item) => item.seviye === seviye) ??
  toplulukSeviyeleri[0];

