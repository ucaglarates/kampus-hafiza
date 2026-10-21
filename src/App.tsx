// ============================================================
// 1. GEREKLİ ARAÇLAR VE DOSYALAR
// ============================================================
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";

import GirisAkisi from "./components/GirisAkisi";
import DogrulamaTesti from "./components/DogrulamaTesti";
import HukukiMerkez from "./components/HukukiMerkez";
import IlgiAlanlariDuzenle from "./components/IlgiAlanlariDuzenle";
import KampusAkisi from "./components/KampusAkisi";
import KayitAkisi, { type KayitVerileri } from "./components/KayitAkisi";
import YetkiYonetimi from "./components/YetkiYonetimi";
import { supabase } from "./lib/supabase";
import { HUKUKI_SURUM } from "./data/hukuki";
import type { KullaniciProfili } from "./types/profil";

import "./App.css";

const LandingPage = lazy(() => import("./components/LandingPage"));

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
  const [oturumKontrolEdiliyor, setOturumKontrolEdiliyor] = useState(true);

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

    const { error } = await supabase.rpc("complete_verification_test", {
      test_score: dogruSayisi,
      tested_areas: profil.expertise_areas,
    });

    if (error) {
      console.error("Test sonucu kaydedilemedi:", error.message);
      return false;
    }

    await profiliOku();
    return true;
  };

  // Metadata içindeki alanları güvenli ve sabit bir diziye dönüştürür.
  // Böylece test ekranı açıkken her sayaç değişiminde sorular yenilenmez.
  const kullaniciBilgiAlanlari = useMemo(() => {
    const alanlar = profil?.expertise_areas;

    return Array.isArray(alanlar)
      ? alanlar.filter((alan): alan is string => typeof alan === "string")
      : [];
  }, [profil]);

  // ==========================================================
  // 13. GİRİŞTEN SONRA CANLI KAMPÜS AĞINI GÖSTERME
  // Oturum açan kullanıcı artık tanıtım sayfası yerine X benzeri
  // gönderi, takip, araştırma ve topluluk ekranına girer.
  // ==========================================================
  if (kullanici && !profil) {
    return (
      <div className="uygulama-yukleniyor">Kampüs profilin hazırlanıyor...</div>
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
      <Suspense
        fallback={
          <div className="uygulama-yukleniyor" role="status">
            KampüsHafıza yükleniyor…
          </div>
        }
      >
        <LandingPage
          onLogin={girisEkraniniAc}
          onRegister={kayitEkraniniAc}
          onLegal={() => setHukukiMerkezAcik(true)}
          sessionLoading={oturumKontrolEdiliyor}
        />
      </Suspense>

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
      <GirisAkisi acik={girisAcik} kapat={girisEkraniniKapat} />

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
