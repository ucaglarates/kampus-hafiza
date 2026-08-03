// ============================================================
// 1. GEREKLİ ARAÇLAR
// ============================================================
import { useEffect, useState } from "react";

import { secilebilirAlanlar } from "../data/bilgiAlanlari";
import { supabase } from "../lib/supabase";

import "./IlgiAlanlariDuzenle.css";

type IlgiAlanlariDuzenleProps = {
  acik: boolean;
  kapat: () => void;
  mevcutAlanlar: string[];
  kurucuMu: boolean;
  kaydedildi: () => Promise<void>;
};

// ============================================================
// 2. İLGİ ALANLARINI EKLEME VE DÜZENLEME PENCERESİ
// ============================================================
function IlgiAlanlariDuzenle({
  acik,
  kapat,
  mevcutAlanlar,
  kurucuMu,
  kaydedildi,
}: IlgiAlanlariDuzenleProps) {
  const [secilenAlanlar, setSecilenAlanlar] = useState<string[]>([]);
  const [hata, setHata] = useState("");
  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => {
    if (!acik) {
      return;
    }

    setSecilenAlanlar(mevcutAlanlar);
    setHata("");
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [acik, mevcutAlanlar]);

  const alanDegistir = (alan: string) => {
    if (secilenAlanlar.includes(alan)) {
      setSecilenAlanlar((oncekiAlanlar) =>
        oncekiAlanlar.filter((item) => item !== alan),
      );
      setHata("");
      return;
    }

    if (secilenAlanlar.length >= 5) {
      setHata("En fazla beş ilgi alanı seçebilirsin.");
      return;
    }

    setSecilenAlanlar((oncekiAlanlar) => [...oncekiAlanlar, alan]);
    setHata("");
  };

  const alanlariKaydet = async () => {
    if (secilenAlanlar.length === 0) {
      setHata("En az bir ilgi alanı seçmelisin.");
      return;
    }

    setKaydediliyor(true);
    setHata("");

    const { error } = await supabase.rpc("update_my_expertise_areas", {
      selected_areas: secilenAlanlar,
    });

    if (error) {
      setHata("İlgi alanları kaydedilemedi. Lütfen tekrar dene.");
      setKaydediliyor(false);
      return;
    }

    await kaydedildi();
    setKaydediliyor(false);
    kapat();
  };

  if (!acik) {
    return null;
  }

  return (
    <div className="ilgi-overlay">
      <section
        className="ilgi-paneli"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ilgi-basligi"
      >
        <header className="ilgi-paneli__ust">
          <div>
            <span>PROFİL ALANLARI</span>
            <h2 id="ilgi-basligi">İlgi alanlarını düzenle</h2>
            <p>
              Bilgi paylaşmak ve görmek istediğin 1–5 alanı seç.
            </p>
          </div>

          {mevcutAlanlar.length > 0 && (
            <button
              type="button"
              aria-label="İlgi alanları penceresini kapat"
              onClick={kapat}
            >
              ×
            </button>
          )}
        </header>

        <div className="ilgi-secim-bilgisi">
          <strong>{secilenAlanlar.length} / 5 seçildi</strong>
          <span>
            {kurucuMu
              ? "Kurucu hesabının 5/5 doğrulaması korunur."
              : "Alan değişikliğinden sonra doğrulama testi yeniden açılır."}
          </span>
        </div>

        <div className="ilgi-alanlari-grid">
          {secilebilirAlanlar.map((alan) => {
            const seciliMi = secilenAlanlar.includes(alan);

            return (
              <button
                className={
                  seciliMi
                    ? "ilgi-alani ilgi-alani--secili"
                    : "ilgi-alani"
                }
                type="button"
                key={alan}
                aria-pressed={seciliMi}
                onClick={() => alanDegistir(alan)}
              >
                <span>{seciliMi ? "✓" : "+"}</span>
                {alan}
              </button>
            );
          })}
        </div>

        {hata && <p className="ilgi-hatasi">{hata}</p>}

        <footer className="ilgi-paneli__alt">
          <p>Seçtiğin alanlar profilinde ve soru havuzunda kullanılacak.</p>

          <button
            className="button button--primary"
            type="button"
            disabled={kaydediliyor}
            onClick={() => void alanlariKaydet()}
          >
            {kaydediliyor ? "Kaydediliyor..." : "Alanları kaydet"}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default IlgiAlanlariDuzenle;

