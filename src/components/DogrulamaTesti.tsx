// ============================================================
// 1. GEREKLİ ARAÇLAR VE SORU HAVUZU
// ============================================================
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  soruHavuzu,
  type DogrulamaSorusu,
} from "../data/soruHavuzu";

import "./DogrulamaTesti.css";

// ============================================================
// 2. BİLEŞENİN TYPESCRIPT TİPLERİ
// ============================================================
type DogrulamaTestiProps = {
  acik: boolean;
  kapat: () => void;
  kullaniciId: string;
  alanlar: string[];
  sonucuKaydet: (dogruSayisi: number) => Promise<boolean>;
};

type VerilenCevap = {
  soruId: string;
  secilenCevap: number | null;
  dogruMu: boolean;
};

const SORU_SURESI = 45;

// ============================================================
// 3. KULLANICIYA SORULACAK 5 SORUYU SEÇME
// Her zorluk seviyesinden bir soru seçilir.
// Daha önce çözülen sorular mümkün olduğunca tekrar edilmez.
// ============================================================
const testSorulariniSec = (
  kullaniciId: string,
  alanlar: string[],
) => {
  const kayitAnahtari = `kampushafiza-cozulen-sorular-${kullaniciId}`;

  let cozulenSorular: string[] = [];

  try {
    cozulenSorular = JSON.parse(
      localStorage.getItem(kayitAnahtari) || "[]",
    ) as string[];
  } catch {
    cozulenSorular = [];
  }

  const gecerliAlanlar =
    alanlar.length > 0 ? alanlar : ["Algoritmalar"];

  const alanSorulari = soruHavuzu.filter((soru) =>
    gecerliAlanlar.includes(soru.alan),
  );

  const secilenSorular: DogrulamaSorusu[] = [];

  for (let zorluk = 1; zorluk <= 5; zorluk += 1) {
    const seviyedekiSorular = alanSorulari.filter(
      (soru) => soru.zorluk === zorluk,
    );

    const yeniSorular = seviyedekiSorular.filter(
      (soru) => !cozulenSorular.includes(soru.id),
    );

    const kullanilacakHavuz =
      yeniSorular.length > 0 ? yeniSorular : seviyedekiSorular;

    if (kullanilacakHavuz.length > 0) {
      const rastgeleIndeks = Math.floor(
        Math.random() * kullanilacakHavuz.length,
      );

      secilenSorular.push(kullanilacakHavuz[rastgeleIndeks]);
    }
  }

  return secilenSorular;
};

// ============================================================
// 4. DOĞRULAMA TESTİ BİLEŞENİ
// ============================================================
function DogrulamaTesti({
  acik,
  kapat,
  kullaniciId,
  alanlar,
  sonucuKaydet,
}: DogrulamaTestiProps) {
  const [sorular, setSorular] = useState<DogrulamaSorusu[]>([]);
  const [aktifSoruIndeksi, setAktifSoruIndeksi] = useState(0);
  const [secilenCevap, setSecilenCevap] = useState<number | null>(null);
  const [cevaplar, setCevaplar] = useState<VerilenCevap[]>([]);
  const [kalanSure, setKalanSure] = useState(SORU_SURESI);
  const [testBitti, setTestBitti] = useState(false);
  const [sonucKaydediliyor, setSonucKaydediliyor] = useState(false);
  const [kayitHatasi, setKayitHatasi] = useState("");

  // Test penceresi her açıldığında yeni soru takımı hazırlanır.
  useEffect(() => {
    if (!acik) {
      return;
    }

    setSorular(testSorulariniSec(kullaniciId, alanlar));
    setAktifSoruIndeksi(0);
    setSecilenCevap(null);
    setCevaplar([]);
    setKalanSure(SORU_SURESI);
    setTestBitti(false);
    setSonucKaydediliyor(false);
    setKayitHatasi("");
  }, [acik, alanlar, kullaniciId]);

  // Test açıkken arka sayfanın kaymasını engeller.
  useEffect(() => {
    if (!acik) {
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [acik]);

  const aktifSoru = sorular[aktifSoruIndeksi];

  // ==========================================================
  // 5. CEVABI KAYDETME VE SONRAKİ SORUYA GEÇME
  // ==========================================================
  const cevabiKaydetVeIlerle = useCallback(
    (cevap: number | null) => {
      const mevcutSoru = sorular[aktifSoruIndeksi];

      if (!mevcutSoru || testBitti) {
        return;
      }

      const yeniCevap: VerilenCevap = {
        soruId: mevcutSoru.id,
        secilenCevap: cevap,
        dogruMu: cevap === mevcutSoru.dogruCevap,
      };

      const yeniCevaplar = [...cevaplar, yeniCevap];
      setCevaplar(yeniCevaplar);

      const sonSoruMu = aktifSoruIndeksi === sorular.length - 1;

      if (sonSoruMu) {
        const kayitAnahtari =
          `kampushafiza-cozulen-sorular-${kullaniciId}`;

        let oncekiSorular: string[] = [];

        try {
          oncekiSorular = JSON.parse(
            localStorage.getItem(kayitAnahtari) || "[]",
          ) as string[];
        } catch {
          oncekiSorular = [];
        }

        const guncelSoruIdleri = Array.from(
          new Set([
            ...oncekiSorular,
            ...sorular.map((soru) => soru.id),
          ]),
        );

        localStorage.setItem(
          kayitAnahtari,
          JSON.stringify(guncelSoruIdleri),
        );

        setTestBitti(true);
        return;
      }

      setAktifSoruIndeksi((oncekiIndeks) => oncekiIndeks + 1);
      setSecilenCevap(null);
      setKalanSure(SORU_SURESI);
    }, [
      aktifSoruIndeksi,
      cevaplar,
      kullaniciId,
      sorular,
      testBitti,
    ],
  );

  // ==========================================================
  // 6. SORU SAYACI
  // ==========================================================
  useEffect(() => {
    if (!acik || testBitti || !aktifSoru) {
      return;
    }

    if (kalanSure === 0) {
      const otomatikGecis = window.setTimeout(() => {
        cevabiKaydetVeIlerle(null);
      }, 450);

      return () => window.clearTimeout(otomatikGecis);
    }

    const sayac = window.setTimeout(() => {
      setKalanSure((oncekiSure) => Math.max(oncekiSure - 1, 0));
    }, 1000);

    return () => window.clearTimeout(sayac);
  }, [
    acik,
    aktifSoru,
    cevabiKaydetVeIlerle,
    kalanSure,
    testBitti,
  ]);

  const dogruSayisi = useMemo(
    () => cevaplar.filter((cevap) => cevap.dogruMu).length,
    [cevaplar],
  );

  const bosSayisi = useMemo(
    () =>
      cevaplar.filter((cevap) => cevap.secilenCevap === null).length,
    [cevaplar],
  );

  const yanlisSayisi = cevaplar.length - dogruSayisi - bosSayisi;

  const sonucEtiketi =
    dogruSayisi >= 5
      ? "Alan Uzmanı"
      : dogruSayisi >= 4
        ? "Güçlü Katkıcı"
        : dogruSayisi >= 3
          ? "Gelişen Katkıcı"
        : "Öğrenen";

  const testiKaydetVeKapat = async () => {
    setSonucKaydediliyor(true);
    setKayitHatasi("");

    const kaydedildi = await sonucuKaydet(dogruSayisi);

    if (!kaydedildi) {
      setKayitHatasi(
        "Test sonucu kaydedilemedi. İnternet bağlantını kontrol edip tekrar dene.",
      );
      setSonucKaydediliyor(false);
      return;
    }

    setSonucKaydediliyor(false);
    kapat();
  };

  if (!acik) {
    return null;
  }

  // ==========================================================
  // 7. SONUÇ EKRANI
  // ==========================================================
  if (testBitti) {
    return (
      <div className="test-overlay">
        <section
          className="test-panel test-panel--sonuc"
          role="dialog"
          aria-modal="true"
          aria-labelledby="test-sonuc-basligi"
        >
          <div className="test-sonuc-simgesi">✦</div>

          <span className="test-etiketi">TEST TAMAMLANDI</span>

          <h2 id="test-sonuc-basligi">Seviyen belirlendi.</h2>

          <div className="test-seviye-rozeti">{sonucEtiketi}</div>

          <div className="test-sonuc-grid">
            <article>
              <strong>{dogruSayisi}</strong>
              <span>Doğru</span>
            </article>

            <article>
              <strong>{yanlisSayisi}</strong>
              <span>Yanlış</span>
            </article>

            <article>
              <strong>{bosSayisi}</strong>
              <span>Boş</span>
            </article>
          </div>

          <p>
            Sonucun öğrenci profiline kaydedilecek ve seçtiğin alanlar
            doğrulanmış olarak işaretlenecek.
          </p>

          {kayitHatasi && (
            <p className="test-kayit-hatasi">{kayitHatasi}</p>
          )}

          <button
            className="button button--primary button--large"
            type="button"
            disabled={sonucKaydediliyor}
            onClick={() => void testiKaydetVeKapat()}
          >
            {sonucKaydediliyor
              ? "Sonuç kaydediliyor..."
              : "Sonucu kaydet ve devam et"}
          </button>
        </section>
      </div>
    );
  }

  if (!aktifSoru) {
    return null;
  }

  const ilerlemeYuzdesi =
    ((aktifSoruIndeksi + 1) / sorular.length) * 100;

  // ==========================================================
  // 8. SORU EKRANI
  // ==========================================================
  return (
    <div className="test-overlay">
      <section
        className="test-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="test-soru-basligi"
      >
        <div className="test-panel__ust">
          <div>
            <span className="test-etiketi">ALAN DOĞRULAMA TESTİ</span>
            <strong>
              Soru {aktifSoruIndeksi + 1} / {sorular.length}
            </strong>
          </div>

          <div
            className={
              kalanSure <= 10
                ? "test-sayaci test-sayaci--acil"
                : "test-sayaci"
            }
            aria-label={`${kalanSure} saniye kaldı`}
          >
            <span>◷</span>
            {kalanSure}
          </div>
        </div>

        <div className="test-ilerleme">
          <span style={{ width: `${ilerlemeYuzdesi}%` }} />
        </div>

        <div className="test-soru-alani">
          <div className="test-soru-bilgisi">
            <span>{aktifSoru.alan}</span>
            <strong>Zorluk {aktifSoru.zorluk} / 5</strong>
          </div>

          <h2 id="test-soru-basligi">{aktifSoru.soru}</h2>

          <div className="test-secenekleri">
            {aktifSoru.secenekler.map((secenek, indeks) => (
              <button
                className={
                  secilenCevap === indeks
                    ? "test-secenegi test-secenegi--secili"
                    : "test-secenegi"
                }
                type="button"
                key={secenek}
                aria-pressed={secilenCevap === indeks}
                onClick={() => setSecilenCevap(indeks)}
              >
                <span>{String.fromCharCode(65 + indeks)}</span>
                {secenek}
              </button>
            ))}
          </div>
        </div>

        <div className="test-panel__alt">
          <p>
            Cevaplar test bittikten sonra değerlendirilecektir.
          </p>

          <button
            className="button button--primary"
            type="button"
            disabled={secilenCevap === null}
            onClick={() => cevabiKaydetVeIlerle(secilenCevap)}
          >
            {aktifSoruIndeksi === sorular.length - 1
              ? "Testi tamamla"
              : "Sonraki soru"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default DogrulamaTesti;
