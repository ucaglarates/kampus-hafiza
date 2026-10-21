// ============================================================
// 1. GEREKLİ ARAÇLAR
// ============================================================
import { useEffect, useState, type FormEvent } from "react";

import { Button, Input } from "./ui/primitives";
import { supabase } from "../lib/supabase";
import "./GirisAkisi.css";

// ============================================================
// 2. BİLEŞENE DIŞARIDAN GELEN ÖZELLİKLER
// ============================================================
type GirisAkisiProps = {
  acik: boolean;
  kapat: () => void;
};

// ============================================================
// 3. GİRİŞ PENCERESİ
// ============================================================
function GirisAkisi({ acik, kapat }: GirisAkisiProps) {
  const [eposta, setEposta] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const [girisYapiliyor, setGirisYapiliyor] = useState(false);

  // Pencere açıkken arka sayfanın kaymasını engeller.
  // Escape tuşuyla pencerenin kapanmasını sağlar.
  useEffect(() => {
    if (!acik) {
      return;
    }

    document.body.style.overflow = "hidden";

    const escapeKontrolu = (olay: KeyboardEvent) => {
      if (olay.key === "Escape" && !girisYapiliyor) {
        kapat();
      }
    };

    window.addEventListener("keydown", escapeKontrolu);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", escapeKontrolu);
    };
  }, [acik, girisYapiliyor, kapat]);

  if (!acik) {
    return null;
  }

  // ==========================================================
  // 4. SUPABASE İLE GİRİŞ YAPMA
  // ==========================================================
  const girisYap = async (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    setHata("");

    const temizEposta = eposta.trim().toLowerCase();
    const ogrenciEpostaDeseni = /^[^@\s]+@ogr\.cbu\.edu\.tr$/i;

    if (!ogrenciEpostaDeseni.test(temizEposta)) {
      setHata(
        "Yalnızca @ogr.cbu.edu.tr uzantılı MCBÜ öğrenci e-postası kullanabilirsin.",
      );
      return;
    }

    if (!sifre) {
      setHata("Lütfen şifreni yaz.");
      return;
    }

    setGirisYapiliyor(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: temizEposta,
        password: sifre,
      });

      if (error) {
        const hataMetni = error.message.toLowerCase();

        if (hataMetni.includes("email not confirmed")) {
          setHata(
            "E-posta adresin henüz doğrulanmamış. Gelen kutundaki doğrulama bağlantısına bas.",
          );
        } else if (hataMetni.includes("invalid login credentials")) {
          setHata("E-posta adresin veya şifren hatalı.");
        } else {
          setHata(`Giriş yapılamadı: ${error.message}`);
        }

        return;
      }

      setEposta("");
      setSifre("");
      kapat();
    } catch {
      setHata(
        "Giriş sırasında beklenmeyen bir sorun oluştu. Lütfen tekrar dene.",
      );
    } finally {
      setGirisYapiliyor(false);
    }
  };

  return (
    <div
      className="giris-overlay"
      role="presentation"
      onMouseDown={(olay) => {
        if (olay.target === olay.currentTarget && !girisYapiliyor) {
          kapat();
        }
      }}
    >
      <section
        className="giris-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="giris-basligi"
      >
        <button
          className="giris-panel__kapat"
          type="button"
          onClick={kapat}
          disabled={girisYapiliyor}
          aria-label="Giriş ekranını kapat"
        >
          ×
        </button>

        <div className="giris-brand">
          <span>K</span>

          <div>
            <strong>KampüsHafıza</strong>
            <small>Öğrenciden öğrenciye bilgi</small>
          </div>
        </div>

        <form className="giris-formu" onSubmit={girisYap}>
          <span className="giris-etiketi">TEKRAR HOŞ GELDİN</span>

          <h2 id="giris-basligi">Kampüs hesabına giriş yap.</h2>

          <p>
            Doğruladığın MCBÜ öğrenci e-postan ve şifrenle kaldığın yerden devam
            et.
          </p>

          <label className="giris-form-alani">
            <span>MCBÜ öğrenci e-postası</span>

            <Input
              type="email"
              value={eposta}
              placeholder="ogrencino@ogr.cbu.edu.tr"
              autoComplete="email"
              required
              onChange={(olay) => setEposta(olay.target.value)}
            />
          </label>

          <label className="giris-form-alani">
            <span>Şifre</span>

            <Input
              type="password"
              value={sifre}
              placeholder="Şifreni yaz"
              autoComplete="current-password"
              required
              onChange={(olay) => setSifre(olay.target.value)}
            />
          </label>

          {hata && (
            <p className="giris-hatasi" role="alert">
              {hata}
            </p>
          )}

          <Button
            className="giris-buton"
            type="submit"
            disabled={girisYapiliyor}
          >
            {girisYapiliyor ? "Giriş yapılıyor..." : "Giriş yap"}
          </Button>
        </form>
      </section>
    </div>
  );
}

export default GirisAkisi;
