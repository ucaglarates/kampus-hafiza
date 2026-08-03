// ============================================================
// 1. GEREKLİ ARAÇLAR
// ============================================================
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { supabase } from "../lib/supabase";
import { secilebilirAlanlar } from "../data/bilgiAlanlari";
import { HUKUKI_SURUM } from "../data/hukuki";
import "./KayitAkisi.css";

// ============================================================
// 2. KAYIT BİLGİLERİNİN TYPESCRIPT TİPİ
// ============================================================
export type KayitVerileri = {
  adSoyad: string;
  eposta: string;
  universite: string;
  fakulte: string;
  bolum: string;
  sinif: string;
  bilgiAlanlari: string[];
};

// ============================================================
// 3. BİLEŞENE DIŞARIDAN GELEN BİLGİLER
// ============================================================
type KayitAkisiProps = {
  acik: boolean;
  kapat: () => void;
  testeGec: (veriler: KayitVerileri) => void;
  hukukiMetinleriAc: () => void;
};

// ============================================================
// 4. FAKÜLTELER VE BÖLÜMLER
// ============================================================
const fakultelerVeBolumler: Record<string, string[]> = {
  "Hasan Ferdi Turgutlu Teknoloji Fakültesi": [
    "Yazılım Mühendisliği",
    "Mekatronik Mühendisliği",
    "Enerji Sistemleri Mühendisliği",
    "Makine ve İmalat Mühendisliği",
    "Elektrik Mühendisliği",
  ],

  "Mühendislik ve Doğa Bilimleri Fakültesi": [
    "Bilgisayar Mühendisliği",
    "Biyomühendislik",
    "Elektrik-Elektronik Mühendisliği",
    "Endüstri Mühendisliği",
    "Gıda Mühendisliği",
    "İnşaat Mühendisliği",
    "Makine Mühendisliği",
    "Metalurji ve Malzeme Mühendisliği",
  ],
};

// ============================================================
// 6. KAYIT BİLEŞENİ
// ============================================================
function KayitAkisi({
  acik,
  kapat,
  testeGec,
  hukukiMetinleriAc,
}: KayitAkisiProps) {
  // Kullanıcının bulunduğu kayıt adımı
  const [adim, setAdim] = useState(1);

  // Kullanıcının parolası
  const [sifre, setSifre] = useState("");

  // Parolanın tekrar yazıldığı alan
  const [sifreTekrar, setSifreTekrar] = useState("");

  // Ekranda gösterilecek hata mesajı
  const [hata, setHata] = useState("");

  // Supabase kayıt işleminin devam edip etmediği
  const [kayitYapiliyor, setKayitYapiliyor] =
    useState(false);

  // Doğrulama e-postasının gönderilip gönderilmediği
  const [kayitTamamlandi, setKayitTamamlandi] =
    useState(false);

  // Hukuki onaylar birbirinden ayrı tutulur. Aydınlatma metni bir
  // açık rıza değildir; kullanıcı yalnızca okuduğunu belirtir.
  const [aydinlatildi, setAydinlatildi] = useState(false);
  const [kosullariKabul, setKosullariKabul] = useState(false);
  const [yurtDisiRiza, setYurtDisiRiza] = useState(false);
  const [yasOnayi, setYasOnayi] = useState(false);

  // Kullanıcının kayıt bilgileri
  const [veriler, setVeriler] =
    useState<KayitVerileri>({
      adSoyad: "",
      eposta: "",
      universite:
        "Manisa Celal Bayar Üniversitesi",
      fakulte: "",
      bolum: "",
      sinif: "",
      bilgiAlanlari: [],
    });

  // ==========================================================
  // 7. KAYIT PENCERESİ AÇILDIĞINDA
  // ==========================================================
  useEffect(() => {
    if (!acik) {
      return;
    }

    document.body.style.overflow = "hidden";

    const escapeKontrolu = (
      olay: KeyboardEvent,
    ) => {
      if (olay.key === "Escape") {
        kapat();
      }
    };

    window.addEventListener(
      "keydown",
      escapeKontrolu,
    );

    return () => {
      document.body.style.overflow = "";

      window.removeEventListener(
        "keydown",
        escapeKontrolu,
      );
    };
  }, [acik, kapat]);

  // Pencere kapalıysa hiçbir şey gösterme.
  if (!acik) {
    return null;
  }

  // ==========================================================
  // 8. FAKÜLTE SEÇİMİ
  // ==========================================================
  const fakulteSec = (fakulte: string) => {
    setVeriler((oncekiVeriler) => ({
      ...oncekiVeriler,
      fakulte,
      bolum: "",
    }));

    setHata("");
  };

  // ==========================================================
  // 9. BİLGİ ALANI SEÇİMİ
  // ==========================================================
  const bilgiAlaniDegistir = (alan: string) => {
    const alanSeciliMi =
      veriler.bilgiAlanlari.includes(alan);

    // Seçili alana tekrar basılırsa kaldır.
    if (alanSeciliMi) {
      setVeriler((oncekiVeriler) => ({
        ...oncekiVeriler,

        bilgiAlanlari:
          oncekiVeriler.bilgiAlanlari.filter(
            (secilenAlan) =>
              secilenAlan !== alan,
          ),
      }));

      setHata("");
      return;
    }

    // Kullanıcı en fazla üç alan seçebilir.
    if (veriler.bilgiAlanlari.length >= 3) {
      setHata(
        "En fazla üç bilgi alanı seçebilirsin.",
      );

      return;
    }

    setVeriler((oncekiVeriler) => ({
      ...oncekiVeriler,

      bilgiAlanlari: [
        ...oncekiVeriler.bilgiAlanlari,
        alan,
      ],
    }));

    setHata("");
  };

  // ==========================================================
  // 10. KAYIT ADIMLARINI KONTROL ETME
  // ==========================================================
  const adimiDogrula = () => {
    // --------------------------------------------------------
    // ADIM 1: AD, E-POSTA VE ŞİFRE
    // --------------------------------------------------------
    if (adim === 1) {
      if (!veriler.adSoyad.trim()) {
        setHata(
          "Lütfen adını ve soyadını yaz.",
        );

        return false;
      }

      // Yalnızca MCBÜ öğrenci e-postasını kabul eder.
      const ogrenciEpostaDeseni =
        /^[^@\s]+@ogr\.cbu\.edu\.tr$/i;

      if (
        !ogrenciEpostaDeseni.test(
          veriler.eposta.trim(),
        )
      ) {
        setHata(
          "Yalnızca @ogr.cbu.edu.tr uzantılı MCBÜ öğrenci e-postası kullanabilirsin.",
        );

        return false;
      }

      if (sifre.length < 8) {
        setHata(
          "Şifren en az 8 karakter olmalıdır.",
        );

        return false;
      }

      if (sifre !== sifreTekrar) {
        setHata(
          "Yazdığın şifreler birbiriyle eşleşmiyor.",
        );

        return false;
      }
    }

    // --------------------------------------------------------
    // ADIM 2: FAKÜLTE, BÖLÜM VE SINIF
    // --------------------------------------------------------
    if (adim === 2) {
      if (!veriler.fakulte) {
        setHata("Lütfen fakülteni seç.");
        return false;
      }

      if (!veriler.bolum) {
        setHata("Lütfen bölümünü seç.");
        return false;
      }

      if (!veriler.sinif) {
        setHata("Lütfen sınıfını seç.");
        return false;
      }
    }

    // --------------------------------------------------------
    // ADIM 3: BİLGİ ALANLARI
    // --------------------------------------------------------
    if (
      adim === 3 &&
      veriler.bilgiAlanlari.length === 0
    ) {
      setHata(
        "Teste geçmek için en az bir bilgi alanı seç.",
      );

      return false;
    }

    if (
      adim === 3 &&
      (!aydinlatildi || !kosullariKabul || !yurtDisiRiza || !yasOnayi)
    ) {
      setHata(
        "Hesabını oluşturmak için dört ayrı hukuki seçeneği de işaretlemelisin.",
      );
      return false;
    }

    setHata("");
    return true;
  };

  // ==========================================================
  // 11. SUPABASE İLE GERÇEK KAYIT OLUŞTURMA
  // ==========================================================
  const supabaseKaydiOlustur = async () => {
    setKayitYapiliyor(true);
    setHata("");

    const temizEposta = veriler.eposta
      .trim()
      .toLowerCase();

    try {
      const { data, error } =
        await supabase.auth.signUp({
          email: temizEposta,
          password: sifre,

          options: {
            emailRedirectTo:
              window.location.origin,

            data: {
              ad_soyad: veriler.adSoyad.trim(),
              universite: veriler.universite,
              fakulte: veriler.fakulte,
              bolum: veriler.bolum,
              sinif: veriler.sinif,

              bilgi_alanlari:
                veriler.bilgiAlanlari,
              legal_version: HUKUKI_SURUM,
              legal_terms_accepted: true,
              cross_border_accepted: yurtDisiRiza,
              age_confirmed: yasOnayi,
            },
          },
        });

      if (error) {
        if (
          error.message
            .toLowerCase()
            .includes("already registered")
        ) {
          setHata(
            "Bu e-posta adresiyle daha önce kayıt oluşturulmuş.",
          );
        } else {
          setHata(
            `Kayıt oluşturulamadı: ${error.message}`,
          );
        }

        return;
      }

      // E-posta doğrulaması kapalıysa oturum
      // doğrudan açılabilir.
      if (data.session) {
        testeGec({
          ...veriler,
          eposta: temizEposta,
        });

        return;
      }

      // E-posta doğrulaması açıksa kullanıcıya
      // doğrulama mesajı gösterilir.
      setKayitTamamlandi(true);
    } catch {
      setHata(
        "Kayıt sırasında beklenmeyen bir sorun oluştu. Lütfen tekrar dene.",
      );
    } finally {
      setKayitYapiliyor(false);
    }
  };

  // ==========================================================
  // 12. FORM GÖNDERİLDİĞİNDE
  // ==========================================================
  const formuGonder = async (
    olay: FormEvent<HTMLFormElement>,
  ) => {
    olay.preventDefault();

    if (!adimiDogrula()) {
      return;
    }

    // İlk iki adımda bir sonraki ekrana geç.
    if (adim < 3) {
      setAdim(
        (oncekiAdim) => oncekiAdim + 1,
      );

      return;
    }

    // Son adımda Supabase kaydını oluştur.
    await supabaseKaydiOlustur();
  };

  // ==========================================================
  // 13. ÖNCEKİ ADIMA DÖNME
  // ==========================================================
  const geriDon = () => {
    if (kayitYapiliyor) {
      return;
    }

    if (adim === 1) {
      kapat();
      return;
    }

    setAdim(
      (oncekiAdim) => oncekiAdim - 1,
    );

    setHata("");
  };

  // ==========================================================
  // 14. KAYIT EKRANI
  // ==========================================================
  return (
    <div
      className="kayit-overlay"
      role="presentation"
      onMouseDown={(olay) => {
        if (
          olay.target === olay.currentTarget &&
          !kayitYapiliyor
        ) {
          kapat();
        }
      }}
    >
      <section
        className="kayit-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kayit-basligi"
      >
        <button
          className="kayit-panel__kapat"
          type="button"
          onClick={kapat}
          disabled={kayitYapiliyor}
          aria-label="Kayıt ekranını kapat"
        >
          ×
        </button>

        {/* ===================================================
            15. PANELİN ÜST KISMI
        ==================================================== */}
        <div className="kayit-panel__ust">
          <a
            className="kayit-brand"
            href="#sayfa-basi"
            onClick={kapat}
          >
            <span>K</span>
            KampüsHafıza
          </a>

          {!kayitTamamlandi && (
            <div className="kayit-adim-bilgisi">
              <span>Adım {adim} / 3</span>

              <div className="kayit-ilerleme">
                <span
                  style={{
                    width: `${(adim / 3) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ===================================================
            16. E-POSTA GÖNDERİLDİ EKRANI
        ==================================================== */}
        {kayitTamamlandi ? (
          <div className="kayit-formu">
            <div className="kayit-adimi">
              <span className="kayit-etiketi">
                E-POSTANI KONTROL ET
              </span>

              <h2 id="kayit-basligi">
                Doğrulama bağlantısını gönderdik.
              </h2>

              <p>
                <strong>{veriler.eposta}</strong>{" "}
                adresine bir doğrulama bağlantısı
                gönderdik. Hesabını etkinleştirmek için
                e-postadaki bağlantıya bas.
              </p>

              <button
                className="button button--primary"
                type="button"
                onClick={kapat}
              >
                Tamam
              </button>
            </div>
          </div>
        ) : (
          /* =================================================
              17. KAYIT FORMU
          ================================================== */
          <form
            className="kayit-formu"
            onSubmit={formuGonder}
          >
            {/* ===============================================
                ADIM 1: KİŞİSEL BİLGİLER
            ================================================ */}
            {adim === 1 && (
              <div className="kayit-adimi">
                <span className="kayit-etiketi">
                  PROFİLİNİ OLUŞTUR
                </span>

                <h2 id="kayit-basligi">
                  Kampüsün bilgi ağına katıl.
                </h2>

                <p>
                  Yalnızca Manisa Celal Bayar
                  Üniversitesi öğrenci e-posta
                  adresleriyle kayıt oluşturulabilir.
                </p>

                <label className="form-alani">
                  <span>Ad ve soyad</span>

                  <input
                    type="text"
                    value={veriler.adSoyad}
                    placeholder="Örnek: Umut Çağlar Ateş"
                    autoComplete="name"
                    required
                    onChange={(olay) =>
                      setVeriler(
                        (oncekiVeriler) => ({
                          ...oncekiVeriler,
                          adSoyad:
                            olay.target.value,
                        }),
                      )
                    }
                  />
                </label>

                <label className="form-alani">
                  <span>
                    MCBÜ öğrenci e-postası
                  </span>

                  <input
                    type="email"
                    value={veriler.eposta}
                    placeholder="ogrencino@ogr.cbu.edu.tr"
                    autoComplete="email"
                    inputMode="email"
                    required
                    onChange={(olay) =>
                      setVeriler(
                        (oncekiVeriler) => ({
                          ...oncekiVeriler,
                          eposta:
                            olay.target.value,
                        }),
                      )
                    }
                  />
                </label>

                <label className="form-alani">
                  <span>Şifre</span>

                  <input
                    type="password"
                    value={sifre}
                    placeholder="En az 8 karakter"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    onChange={(olay) =>
                      setSifre(olay.target.value)
                    }
                  />
                </label>

                <label className="form-alani">
                  <span>Şifreyi tekrar yaz</span>

                  <input
                    type="password"
                    value={sifreTekrar}
                    placeholder="Şifreni tekrar yaz"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    onChange={(olay) =>
                      setSifreTekrar(
                        olay.target.value,
                      )
                    }
                  />
                </label>
              </div>
            )}

            {/* ===============================================
                ADIM 2: ÜNİVERSİTE VE BÖLÜM
            ================================================ */}
            {adim === 2 && (
              <div className="kayit-adimi">
                <span className="kayit-etiketi">
                  KAMPÜS BİLGİLERİN
                </span>

                <h2 id="kayit-basligi">
                  Seni doğru bilgi havuzuna
                  yerleştirelim.
                </h2>

                <p>
                  Dersleri ve öğrenci deneyimlerini
                  bölümüne göre göstereceğiz.
                </p>

                <label className="form-alani">
                  <span>Üniversite</span>

                  <input
                    type="text"
                    value={veriler.universite}
                    disabled
                  />
                </label>

                <label className="form-alani">
                  <span>Fakülte</span>

                  <select
                    value={veriler.fakulte}
                    required
                    onChange={(olay) =>
                      fakulteSec(
                        olay.target.value,
                      )
                    }
                  >
                    <option value="">
                      Fakülteni seç
                    </option>

                    {Object.keys(
                      fakultelerVeBolumler,
                    ).map((fakulte) => (
                      <option
                        value={fakulte}
                        key={fakulte}
                      >
                        {fakulte}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-alani">
                  <span>Bölüm</span>

                  <select
                    value={veriler.bolum}
                    disabled={!veriler.fakulte}
                    required
                    onChange={(olay) =>
                      setVeriler(
                        (oncekiVeriler) => ({
                          ...oncekiVeriler,
                          bolum:
                            olay.target.value,
                        }),
                      )
                    }
                  >
                    <option value="">
                      {veriler.fakulte
                        ? "Bölümünü seç"
                        : "Önce fakülteni seç"}
                    </option>

                    {veriler.fakulte &&
                      fakultelerVeBolumler[
                        veriler.fakulte
                      ].map((bolum) => (
                        <option
                          value={bolum}
                          key={bolum}
                        >
                          {bolum}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="form-alani">
                  <span>Sınıf</span>

                  <select
                    value={veriler.sinif}
                    required
                    onChange={(olay) =>
                      setVeriler(
                        (oncekiVeriler) => ({
                          ...oncekiVeriler,
                          sinif:
                            olay.target.value,
                        }),
                      )
                    }
                  >
                    <option value="">
                      Sınıfını seç
                    </option>

                    <option value="Hazırlık">
                      Hazırlık
                    </option>

                    <option value="1. Sınıf">
                      1. Sınıf
                    </option>

                    <option value="2. Sınıf">
                      2. Sınıf
                    </option>

                    <option value="3. Sınıf">
                      3. Sınıf
                    </option>

                    <option value="4. Sınıf">
                      4. Sınıf
                    </option>

                    <option value="Mezun">
                      Mezun
                    </option>
                  </select>
                </label>
              </div>
            )}

            {/* ===============================================
                ADIM 3: BİLGİ ALANLARI
            ================================================ */}
            {adim === 3 && (
              <div className="kayit-adimi">
                <span className="kayit-etiketi">
                  BİLGİ ALANLARIN
                </span>

                <h2 id="kayit-basligi">
                  Hangi konularda katkı
                  sağlayabilirsin?
                </h2>

                <p>
                  En fazla üç alan seç. Doğrulama
                  testindeki beş soru bu seçimlere
                  göre hazırlanacak.
                </p>

                <div className="alan-secim-bilgisi">
                  <span>Seçilen alan</span>

                  <strong>
                    {veriler.bilgiAlanlari.length} / 3
                  </strong>
                </div>

                <div className="bilgi-alanlari">
                  {secilebilirAlanlar.map(
                    (alan) => {
                      const secili =
                        veriler.bilgiAlanlari.includes(
                          alan,
                        );

                      return (
                        <button
                          className={
                            secili
                              ? "bilgi-alani bilgi-alani--secili"
                              : "bilgi-alani"
                          }
                          type="button"
                          key={alan}
                          aria-pressed={secili}
                          onClick={() =>
                            bilgiAlaniDegistir(
                              alan,
                            )
                          }
                        >
                          <span>
                            {secili ? "✓" : "+"}
                          </span>

                          {alan}
                        </button>
                      );
                    },
                  )}
                </div>

                <div className="kayit-hukuki">
                  <div className="kayit-hukuki__ust">
                    <strong>Güvenli kullanım onayları</strong>
                    <button type="button" onClick={hukukiMetinleriAc}>
                      Metinleri oku
                    </button>
                  </div>

                  <label>
                    <input
                      type="checkbox"
                      checked={aydinlatildi}
                      onChange={(olay) => setAydinlatildi(olay.target.checked)}
                    />
                    <span>KVKK aydınlatma metnini okudum ve bilgilendirildim.</span>
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={kosullariKabul}
                      onChange={(olay) => setKosullariKabul(olay.target.checked)}
                    />
                    <span>
                      Kullanım Koşulları ve Topluluk Kuralları'nı kabul ediyorum.
                    </span>
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={yurtDisiRiza}
                      onChange={(olay) => setYurtDisiRiza(olay.target.checked)}
                    />
                    <span>
                      Verilerimin Supabase altyapısı nedeniyle yurt dışına
                      aktarılmasına açık rıza veriyorum.
                    </span>
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={yasOnayi}
                      onChange={(olay) => setYasOnayi(olay.target.checked)}
                    />
                    <span>18 yaşını doldurduğumu beyan ediyorum.</span>
                  </label>
                </div>
              </div>
            )}

            {/* ===============================================
                18. HATA MESAJI
            ================================================ */}
            {hata && (
              <p
                className="kayit-hatasi"
                role="alert"
              >
                {hata}
              </p>
            )}

            {/* ===============================================
                19. ALT BUTONLAR
            ================================================ */}
            <div className="kayit-formu__butonlar">
              <button
                className="button button--ghost"
                type="button"
                onClick={geriDon}
                disabled={kayitYapiliyor}
              >
                {adim === 1
                  ? "Vazgeç"
                  : "Geri dön"}
              </button>

              <button
                className="button button--primary"
                type="submit"
                disabled={kayitYapiliyor}
              >
                {kayitYapiliyor
                  ? "Kayıt oluşturuluyor..."
                  : adim === 3
                    ? "Hesabımı oluştur"
                    : "Devam et"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export default KayitAkisi;
