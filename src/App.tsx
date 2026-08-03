// ============================================================
// 1. GEREKLİ ARAÇLAR VE DOSYALAR
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

import GirisAkisi from "./components/GirisAkisi";
import DogrulamaTesti from "./components/DogrulamaTesti";
import HukukiMerkez from "./components/HukukiMerkez";
import IlgiAlanlariDuzenle from "./components/IlgiAlanlariDuzenle";
import KampusAkisi from "./components/KampusAkisi";
import KayitAkisi, {
  type KayitVerileri,
} from "./components/KayitAkisi";
import YetkiYonetimi from "./components/YetkiYonetimi";
import { supabase } from "./lib/supabase";
import { HUKUKI_SURUM } from "./data/hukuki";
import type { KullaniciProfili } from "./types/profil";

import "./App.css";

// ============================================================
// 2. BİLGİ ALANLARININ TYPESCRIPT TİPİ
// ============================================================
type BilgiAlani = {
  simge: string;
  baslik: string;
  aciklama: string;
  etiketler: string[];
};

// ============================================================
// 3. ANA SAYFADA GÖSTERİLECEK ÖRNEK ALANLAR
// Daha sonra bu bilgiler veritabanından gelecek.
// ============================================================
const bilgiAlanlari: BilgiAlani[] = [
  {
    simge: "⌘",
    baslik: "Yazılım Geliştirme",
    aciklama:
      "Kodlama, proje geliştirme ve sektöre hazırlanma deneyimleri.",
    etiketler: ["React", "JavaScript", "Python"],
  },
  {
    simge: "◈",
    baslik: "Ders Rehberleri",
    aciklama:
      "Zor dersler, çalışma yöntemleri ve öğrencilerden kaynak önerileri.",
    etiketler: ["Matematik", "Algoritma", "Fizik"],
  },
  {
    simge: "✦",
    baslik: "Staj ve Kariyer",
    aciklama:
      "Staj başvuruları, mülakatlar ve kariyer yolculuğu hakkında bilgiler.",
    etiketler: ["Staj", "CV", "Mülakat"],
  },
];

// ============================================================
// 4. ANA UYGULAMA BİLEŞENİ
// ============================================================
function App() {
  // Kayıt penceresinin açık veya kapalı olduğunu saklar.
  const [kayitAcik, setKayitAcik] = useState(false);

  // Giriş penceresinin açık veya kapalı olduğunu saklar.
  const [girisAcik, setGirisAcik] = useState(false);

  // Beş soruluk doğrulama testinin açık veya kapalı durumunu saklar.
  const [testAcik, setTestAcik] = useState(false);

  // Kurucuya özel yetki yönetim penceresini kontrol eder.
  const [yetkiPaneliAcik, setYetkiPaneliAcik] = useState(false);

  // İlgi alanı ekleme ve düzenleme penceresini kontrol eder.
  const [ilgiPaneliAcik, setIlgiPaneliAcik] = useState(false);

  // KVKK, gizlilik, kullanım koşulları ve topluluk kurallarını açar.
  const [hukukiMerkezAcik, setHukukiMerkezAcik] = useState(false);

  // Supabase'te oturum açmış kullanıcıyı saklar.
  const [kullanici, setKullanici] = useState<User | null>(null);

  // Kullanıcının güvenli rolünü ve topluluk profilini saklar.
  const [profil, setProfil] = useState<KullaniciProfili | null>(null);

  // İlk açılışta oturum bilgisi okunurken kullanılır.
  const [oturumKontrolEdiliyor, setOturumKontrolEdiliyor] =
    useState(true);

  // ==========================================================
  // 5. OTURUMU OKUMA VE DEĞİŞİKLİKLERİ DİNLEME
  // E-posta bağlantısından dönüldüğünde Supabase'in oluşturduğu
  // oturum burada yakalanır.
  // ==========================================================
  useEffect(() => {
    const oturumuOku = async () => {
      const { data } = await supabase.auth.getSession();

      setKullanici(data.session?.user ?? null);
      setOturumKontrolEdiliyor(false);
    };

    void oturumuOku();

    const { data: dinleyici } = supabase.auth.onAuthStateChange(
      (_olay, oturum) => {
        setKullanici(oturum?.user ?? null);
        setOturumKontrolEdiliyor(false);
      },
    );

    return () => {
      dinleyici.subscription.unsubscribe();
    };
  }, []);

  // ==========================================================
  // 6. GİRİŞ YAPAN KULLANICININ GÜVENLİ PROFİLİNİ OKUMA
  // Rol bilgisi user_metadata yerine profiles tablosundan gelir.
  // ==========================================================
  const profiliOku = useCallback(async () => {
    if (!kullanici) {
      setProfil(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", kullanici.id)
      .maybeSingle<KullaniciProfili>();

    if (error) {
      console.error("Profil okunamadı:", error.message);
      setProfil(null);
      return;
    }

    // Yönetici tarafından silinmiş veya eksik kalmış bir hesap varsa
    // kullanıcıyı sonsuz yükleme ekranında bırakmadan oturumu kapatır.
    if (!data) {
      setProfil(null);
      await supabase.auth.signOut();
      return;
    }

    setProfil(data);
  }, [kullanici]);

  useEffect(() => {
    void profiliOku();
  }, [profiliOku]);

  // ==========================================================
  // 7. İLK GİRİŞ AKIŞI
  // İlgi alanı yoksa önce alan seçimi, test tamamlanmadıysa hemen
  // ardından beş soruluk doğrulama testi açılır.
  // ==========================================================
  useEffect(() => {
    if (!profil) {
      return;
    }

    const hukukiOnayGerekli =
      profil.legal_version !== HUKUKI_SURUM ||
      !profil.legal_accepted_at ||
      !profil.cross_border_consent_at ||
      !profil.age_confirmed_at;

    if (hukukiOnayGerekli) {
      return;
    }

    if (profil.expertise_areas.length === 0) {
      setIlgiPaneliAcik(true);
      return;
    }

    if (!profil.verification_test_completed) {
      setTestAcik(true);
    }
  }, [profil]);

  // ==========================================================
  // 6. KAYIT EKRANINI AÇMA
  // ==========================================================
  const kayitEkraniniAc = () => {
    setGirisAcik(false);
    setKayitAcik(true);
  };

  // ==========================================================
  // 7. KAYIT EKRANINI KAPATMA
  // ==========================================================
  const kayitEkraniniKapat = () => {
    setKayitAcik(false);
  };

  // ==========================================================
  // 8. GİRİŞ EKRANINI AÇMA VE KAPATMA
  // ==========================================================
  const girisEkraniniAc = () => {
    setKayitAcik(false);
    setGirisAcik(true);
  };

  const girisEkraniniKapat = () => {
    setGirisAcik(false);
  };

  // ==========================================================
  // 9. OTURUMU KAPATMA
  // ==========================================================
  const cikisYap = async () => {
    setTestAcik(false);
    setYetkiPaneliAcik(false);
    setIlgiPaneliAcik(false);

    const { error } = await supabase.auth.signOut();

    if (error) {
      window.alert("Çıkış yapılırken bir sorun oluştu.");
    }
  };

  // ==========================================================
  // 10. KAYIT TAMAMLANDIĞINDA ÇALIŞACAK FONKSİYON
  // Şimdilik bilgileri konsolda gösteriyoruz.
  // Sonraki aşamada süreli doğrulama testini açacağız.
  // ==========================================================
  const dogrulamaTestineGec = (veriler: KayitVerileri) => {
    console.log("Kayıt bilgileri:", veriler);

    setKayitAcik(false);

    window.alert(
      `${veriler.adSoyad}, kayıt bilgilerin hazır. Sıradaki aşama doğrulama testi.`,
    );
  };

  // ==========================================================
  // 11. İLGİLİ SAYFA BÖLÜMÜNE KAYDIRMA
  // ==========================================================
  const bolumeGit = (bolumId: string) => {
    document.getElementById(bolumId)?.scrollIntoView({
      behavior: "smooth",
    });
  };

  // ==========================================================
  // 12. DOĞRULAMA TESTİNİ BAŞLATMA
  // Öğrenci panelindeki butona basıldığında test penceresini açar.
  // ==========================================================
  const dogrulamaTestiniBaslat = () => {
    setTestAcik(true);
  };

  const dogrulamaTestiniKapat = () => {
    setTestAcik(false);
  };

  // Test sonucunu kalıcı olarak profile kaydeder.
  const dogrulamaSonucunuKaydet = async (dogruSayisi: number) => {
    if (!profil) {
      return false;
    }

    const { error } = await supabase.rpc(
      "complete_verification_test",
      {
        test_score: dogruSayisi,
        tested_areas: profil.expertise_areas,
      },
    );

    if (error) {
      console.error("Test sonucu kaydedilemedi:", error.message);
      return false;
    }

    await profiliOku();
    return true;
  };

  // Kullanıcının adını e-posta yerine göstermek için metadata'yı okur.
  const kullaniciAdi =
    profil?.full_name ||
    (typeof kullanici?.user_metadata.ad_soyad === "string"
      ? kullanici.user_metadata.ad_soyad
      : "MCBÜ Öğrencisi");

  const kullaniciRolEtiketi =
    profil?.role === "founder"
      ? "Kurucu • Ana Moderatör"
      : profil?.role === "moderator"
        ? "Topluluk Moderatörü"
        : profil?.role === "assistant_moderator"
          ? "Moderatör Yardımcısı"
          : kullanici?.email;

  // Metadata içindeki alanları güvenli ve sabit bir diziye dönüştürür.
  // Böylece test ekranı açıkken her sayaç değişiminde sorular yenilenmez.
  const kullaniciBilgiAlanlari = useMemo(() => {
    const alanlar = profil?.expertise_areas;

    return Array.isArray(alanlar)
      ? alanlar.filter(
          (alan): alan is string => typeof alan === "string",
        )
      : [];
  }, [profil]);

  // ==========================================================
  // 13. GİRİŞTEN SONRA CANLI KAMPÜS AĞINI GÖSTERME
  // Oturum açan kullanıcı artık tanıtım sayfası yerine X benzeri
  // gönderi, takip, araştırma ve topluluk ekranına girer.
  // ==========================================================
  if (kullanici && !profil) {
    return (
      <div className="uygulama-yukleniyor">
        Kampüs profilin hazırlanıyor...
      </div>
    );
  }

  if (kullanici && profil) {
    const hukukiOnayGerekli =
      profil.legal_version !== HUKUKI_SURUM ||
      !profil.legal_accepted_at ||
      !profil.cross_border_consent_at ||
      !profil.age_confirmed_at;

    return (
      <>
        <KampusAkisi
          kullanici={kullanici}
          profil={profil}
          cikisYap={cikisYap}
          testeBasla={dogrulamaTestiniBaslat}
          ilgiAlanlariniDuzenle={() => setIlgiPaneliAcik(true)}
          yetkileriYonet={() => setYetkiPaneliAcik(true)}
          profiliYenile={profiliOku}
          hukukiMetinleriAc={() => setHukukiMerkezAcik(true)}
        />

        <HukukiMerkez
          acik={hukukiMerkezAcik || hukukiOnayGerekli}
          kapat={() => setHukukiMerkezAcik(false)}
          zorunlu={hukukiOnayGerekli}
          onaylandi={profiliOku}
        />

        <DogrulamaTesti
          acik={testAcik}
          kapat={dogrulamaTestiniKapat}
          kullaniciId={kullanici.id}
          alanlar={kullaniciBilgiAlanlari}
          sonucuKaydet={dogrulamaSonucunuKaydet}
        />

        <IlgiAlanlariDuzenle
          acik={ilgiPaneliAcik}
          kapat={() => setIlgiPaneliAcik(false)}
          mevcutAlanlar={profil.expertise_areas}
          kurucuMu={profil.role === "founder"}
          kaydedildi={profiliOku}
        />

        {profil.role === "founder" && (
          <YetkiYonetimi
            acik={yetkiPaneliAcik}
            kapat={() => setYetkiPaneliAcik(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="site-shell" id="sayfa-basi">
      {/* =====================================================
          9. SABİT NAVBAR
      ====================================================== */}
      <header className="navbar">
        <a
          className="brand"
          href="#sayfa-basi"
          aria-label="Sayfanın başına git"
        >
          <span className="brand__logo">K</span>

          <span>
            <strong>KampüsHafıza</strong>
            <small>Öğrenciden öğrenciye bilgi</small>
          </span>
        </a>

        <nav className="navbar__links" aria-label="Ana menü">
          <a href="#alanlar">Alanlar</a>
          <a href="#nasil-calisir">Nasıl çalışır?</a>
          <a href="#topluluk">Topluluk</a>
        </nav>

        <div className="navbar__actions">
          {oturumKontrolEdiliyor ? (
            <button
              className="button button--ghost"
              type="button"
              disabled
            >
              Oturum kontrol ediliyor...
            </button>
          ) : kullanici ? (
            <>
              <div className="kullanici-karti">
                <span>{kullaniciAdi.charAt(0).toUpperCase()}</span>

                <div>
                  <strong>{kullaniciAdi}</strong>
                  <small>{kullaniciRolEtiketi}</small>
                </div>
              </div>

              <button
                className="button button--ghost cikis-butonu"
                type="button"
                onClick={() => void cikisYap()}
              >
                Çıkış yap
              </button>
            </>
          ) : (
            <>
              <button
                className="button button--ghost"
                type="button"
                onClick={girisEkraniniAc}
              >
                Giriş yap
              </button>

              <button
                className="button button--primary"
                type="button"
                onClick={kayitEkraniniAc}
              >
                Topluluğa katıl
              </button>
            </>
          )}
        </div>
      </header>

      <main>
        {/* ===================================================
            10. KARŞILAMA ALANI
        ==================================================== */}
        <section className="hero" id="anasayfa">
          <div className="hero__content">
            <div className="eyebrow">
              <span className="eyebrow__dot"></span>
              Üniversite bilgisi artık kaybolmayacak
            </div>

            <h1>
              Deneyimini paylaş,
              <span className="hero__highlight">
                {" "}
                öğrenme yoluna dönüştürelim.
              </span>
            </h1>

            <p className="hero__description">
              KampüsHafıza, öğrencilerin bilgi ve deneyimlerini ortak bir
              havuzda toplar. Yapay zekâ bu bilgileri düzenler ve yeni
              öğrenciler için güvenilir rehberlere dönüştürür.
            </p>

            <div className="hero__actions">
              <button
                className="button button--primary button--large"
                type="button"
                onClick={() => bolumeGit("alanlar")}
              >
                Bilgi alanlarını keşfet
              </button>

              <button
                className="button button--secondary button--large"
                type="button"
                onClick={() => bolumeGit("nasil-calisir")}
              >
                Nasıl çalıştığını gör
              </button>
            </div>

            <div className="hero__trust">
              <div className="avatar-group" aria-hidden="true">
                <span>U</span>
                <span>E</span>
                <span>M</span>
                <span>+</span>
              </div>

              <p>
                Öğrencilerin gerçek deneyimleriyle oluşturulan ortak bilgi
                havuzu
              </p>
            </div>
          </div>

          {/* Sağ taraftaki örnek bilgi kartları */}
          <div
            className="hero__visual"
            aria-label="Örnek öğrenci katkıları"
          >
            <div className="visual-glow"></div>

            <article className="knowledge-card knowledge-card--main">
              <div className="knowledge-card__top">
                <span className="knowledge-card__category">
                  Yazılım Mühendisliği
                </span>

                <span className="verified-badge">
                  ✓ Doğrulandı
                </span>
              </div>

              <h2>React öğrenirken bilmen gerekenler</h2>

              <p>
                Üst sınıf öğrencilerin deneyimlerinden hazırlanan başlangıç
                rehberi.
              </p>

              <div className="knowledge-card__tags">
                <span>Öğrenci deneyimi</span>
                <span>Alan odaklı bilgi</span>
              </div>

              <div className="ai-summary">
                <span className="ai-summary__icon">✦</span>

                <div>
                  <strong>AI özeti hazır</strong>
                  <small>
                    Benzer bilgiler düzenlenip birleştirildi.
                  </small>
                </div>
              </div>
            </article>

            <article className="floating-card floating-card--top">
              <span>Oyunlaştırılmış</span>
              <strong>XP sistemi</strong>
            </article>

            <article className="floating-card floating-card--bottom">
              <span>Öğrenci ağı</span>
              <strong>Topluluğunu kur</strong>
            </article>
          </div>
        </section>

        {/* ===================================================
            11. GİRİŞ YAPAN ÖĞRENCİYE ÖZEL PROFİL PANELİ
        ==================================================== */}
        {/* ===================================================
            12. İSTATİSTİKLER
        ==================================================== */}
        <section
          className="stats"
          aria-label="Platform istatistikleri"
        >
          <div><strong>Canlı</strong><span>Öğrenci paylaşımları</span></div>
          <div><strong>Alan bazlı</strong><span>Bilgi doğrulama</span></div>
          <div><strong>Birlikte</strong><span>Topluluklar</span></div>
          <div><strong>Güvenli</strong><span>Moderatör denetimi</span></div>
        </section>

        {/* ===================================================
            12. BİLGİ ALANLARI
        ==================================================== */}
        <section className="section" id="alanlar">
          <div className="section__heading">
            <div>
              <span className="section__label">
                BİLGİ HAVUZU
              </span>

              <h2>Öğrencilerin deneyimlerinden öğren</h2>
            </div>

            <p>
              Bir alan seç, doğrulanmış öğrenci katkılarını incele ve yapay
              zekânın hazırladığı rehberlerden faydalan.
            </p>
          </div>

          <div className="topic-grid">
            {bilgiAlanlari.map((alan) => (
              <article
                className="topic-card"
                key={alan.baslik}
              >
                <div className="topic-card__icon">
                  {alan.simge}
                </div>

                <h3>{alan.baslik}</h3>

                <p>{alan.aciklama}</p>

                <div className="topic-card__tags">
                  {alan.etiketler.map((etiket) => (
                    <span key={etiket}>
                      {etiket}
                    </span>
                  ))}
                </div>

                <div className="topic-card__footer">
                  <span>Canlı paylaşımları keşfet</span>

                  <button
                    type="button"
                    aria-label={`${alan.baslik} alanını aç`}
                    onClick={kayitEkraniniAc}
                  >
                    →
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ===================================================
            13. NASIL ÇALIŞIR?
        ==================================================== */}
        <section
          className="section process"
          id="nasil-calisir"
        >
          <div className="section__heading">
            <div>
              <span className="section__label">
                NASIL ÇALIŞIR?
              </span>

              <h2>Bilgiden güvenilir rehbere</h2>
            </div>
          </div>

          <div className="process-grid">
            <article>
              <span className="process__number">01</span>

              <h3>Alanını seç</h3>

              <p>
                Üniversiteni, bölümünü ve bilgi sahibi olduğun konuları
                belirle.
              </p>
            </article>

            <article>
              <span className="process__number">02</span>

              <h3>Bilgini doğrula</h3>

              <p>
                Seçtiğin alanla ilgili niş soruları cevapla ve seviyeni
                oluştur.
              </p>
            </article>

            <article>
              <span className="process__number">03</span>

              <h3>Havuza katkı sağla</h3>

              <p>
                Deneyimini paylaş; yapay zekâ bilgileri düzenli rehberlere
                dönüştürsün.
              </p>
            </article>
          </div>
        </section>

        {/* ===================================================
            14. TOPLULUK ÇAĞRI ALANI
        ==================================================== */}
        <section
          className="community-cta"
          id="topluluk"
        >
          <span className="section__label">
            KAMPÜSÜN HAFIZASINA KATIL
          </span>

          <h2>
            Senin öğrendiğin, başka bir öğrencinin başlangıcı olsun.
          </h2>

          <p>
            Bilgini paylaş, katkı puanı kazan ve senden sonra gelen
            öğrencilere yol göster.
          </p>

          <button
            className="button button--light button--large"
            type="button"
            onClick={kayitEkraniniAc}
          >
            İlk katkımı oluştur
          </button>
        </section>
      </main>

      {/* =====================================================
          15. SAYFA ALTI
      ====================================================== */}
      <footer className="footer">
        <a
          className="brand"
          href="#sayfa-basi"
          aria-label="Sayfanın başına git"
        >
          <span className="brand__logo">K</span>
          <strong>KampüsHafıza</strong>
        </a>

        <p>
          Üniversitede öğrenilenler, senden sonra kaybolmasın.
        </p>

        <div className="footer__hukuk">
          <button type="button" onClick={() => setHukukiMerkezAcik(true)}>
            Gizlilik ve koşullar
          </button>
          <small>
            Bağımsız öğrenci projesidir; MCBÜ veya X Corp. ile resmî bağlantısı
            yoktur.
          </small>
          <span>© 2026 KampüsHafıza</span>
        </div>
      </footer>

      {/* =====================================================
          16. ÜÇ AŞAMALI KAYIT PENCERESİ
      ====================================================== */}
      <KayitAkisi
        acik={kayitAcik}
        kapat={kayitEkraniniKapat}
        testeGec={dogrulamaTestineGec}
        hukukiMetinleriAc={() => setHukukiMerkezAcik(true)}
      />

      <HukukiMerkez
        acik={hukukiMerkezAcik}
        kapat={() => setHukukiMerkezAcik(false)}
      />

      {/* =====================================================
          17. GİRİŞ PENCERESİ
      ====================================================== */}
      <GirisAkisi
        acik={girisAcik}
        kapat={girisEkraniniKapat}
      />

      {/* =====================================================
          18. BEŞ SORULUK SÜRELİ ALAN DOĞRULAMA TESTİ
      ====================================================== */}
      {kullanici && (
        <DogrulamaTesti
          acik={testAcik}
          kapat={dogrulamaTestiniKapat}
          kullaniciId={kullanici.id}
          alanlar={kullaniciBilgiAlanlari}
          sonucuKaydet={dogrulamaSonucunuKaydet}
        />
      )}

      {/* =====================================================
          19. İLGİ ALANLARINI EKLEME VE DÜZENLEME PENCERESİ
      ====================================================== */}
      {profil && (
        <IlgiAlanlariDuzenle
          acik={ilgiPaneliAcik}
          kapat={() => setIlgiPaneliAcik(false)}
          mevcutAlanlar={profil.expertise_areas}
          kurucuMu={profil.role === "founder"}
          kaydedildi={profiliOku}
        />
      )}

      {/* =====================================================
          20. SADECE KURUCUYA AÇILAN YETKİ YÖNETİM PANELİ
      ====================================================== */}
      {profil?.role === "founder" && (
        <YetkiYonetimi
          acik={yetkiPaneliAcik}
          kapat={() => setYetkiPaneliAcik(false)}
        />
      )}
    </div>
  );
}

export default App;
