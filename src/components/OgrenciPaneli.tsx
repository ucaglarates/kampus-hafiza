// ============================================================
// 1. GEREKLİ TYPESCRIPT TİPİ
// ============================================================
import type { User } from "@supabase/supabase-js";
import type { KullaniciProfili } from "../types/profil";
import {
  seviyeBilgisiniGetir,
  toplulukSeviyeleri,
} from "../data/seviyeler";

import "./OgrenciPaneli.css";

type OgrenciPaneliProps = {
  kullanici: User;
  profil: KullaniciProfili | null;
  testeBasla: () => void;
  yetkileriYonet: () => void;
  ilgiAlanlariniDuzenle: () => void;
};

type KullaniciBilgileri = {
  ad_soyad?: string;
  universite?: string;
  fakulte?: string;
  bolum?: string;
  sinif?: string;
  bilgi_alanlari?: string[];
};

// ============================================================
// 2. GİRİŞ YAPAN ÖĞRENCİNİN PANELİ
// ============================================================
function OgrenciPaneli({
  kullanici,
  profil,
  testeBasla,
  yetkileriYonet,
  ilgiAlanlariniDuzenle,
}: OgrenciPaneliProps) {
  const bilgiler =
    kullanici.user_metadata as KullaniciBilgileri;

  const adSoyad =
    profil?.full_name || bilgiler.ad_soyad || "MCBÜ Öğrencisi";
  const bilgiAlanlari = Array.isArray(profil?.expertise_areas)
    ? profil.expertise_areas
    : [];

  const kurucuMu = profil?.role === "founder";
  const moderatorMu =
    profil?.role === "assistant_moderator" ||
    profil?.role === "moderator" ||
    kurucuMu;

  const rolEtiketi = kurucuMu
    ? "KURUCU • ANA MODERATÖR"
    : profil?.role === "moderator"
      ? "TOPLULUK MODERATÖRÜ"
      : profil?.role === "assistant_moderator"
        ? "MODERATÖR YARDIMCISI"
        : "DOĞRULANMIŞ ÖĞRENCİ";

  const seviye = seviyeBilgisiniGetir(profil?.level ?? 1);
  const sonrakiSeviye = toplulukSeviyeleri.find(
    (item) => item.seviye === seviye.seviye + 1,
  );

  const seviyeIlerlemesi = sonrakiSeviye
    ? Math.min(
        ((profil?.xp ?? 0) / sonrakiSeviye.gerekliXp) * 100,
        100,
      )
    : 100;

  return (
    <section
      className={
        kurucuMu
          ? "ogrenci-paneli ogrenci-paneli--kurucu"
          : "ogrenci-paneli"
      }
      aria-labelledby="ogrenci-paneli-basligi"
    >
      <div className="ogrenci-paneli__ust">
        <div className="ogrenci-kimligi">
          <span className="ogrenci-kimligi__avatar">
            {profil?.avatar_url ? (
              <img
                src={profil.avatar_url}
                alt={`${adSoyad} profil fotoğrafı`}
              />
            ) : (
              adSoyad.charAt(0).toUpperCase()
            )}
          </span>

          <div>
            <span
              className={
                moderatorMu
                  ? "ogrenci-paneli__etiket ogrenci-paneli__etiket--yetkili"
                  : "ogrenci-paneli__etiket"
              }
            >
              {rolEtiketi}
            </span>

            <h2 id="ogrenci-paneli-basligi">
              Hoş geldin, {adSoyad}.
            </h2>

            <p>{kullanici.email}</p>
          </div>
        </div>

        <div className="dogrulanmis-rozet">
          <span>✓</span>
          E-posta doğrulandı
        </div>

        {profil?.verification_test_completed && (
          <div className="test-sonucu-rozeti">
            <span>★</span>
            Alan testi {profil.verification_test_score}/5
          </div>
        )}

        {moderatorMu && (
          <div className="moderator-rozeti">
            <span>✦</span>
            {kurucuMu ? "Kurucu hesabı" : "Moderatör hesabı"}
          </div>
        )}
      </div>

      <div className="ogrenci-paneli__icerik">
        <div className="ogrenci-bilgileri">
          <article>
            <span>Fakülte</span>
            <strong>
              {bilgiler.fakulte || "Henüz belirtilmedi"}
            </strong>
          </article>

          <article>
            <span>Bölüm</span>
            <strong>
              {bilgiler.bolum || "Henüz belirtilmedi"}
            </strong>
          </article>

          <article>
            <span>Sınıf</span>
            <strong>
              {bilgiler.sinif || "Henüz belirtilmedi"}
            </strong>
          </article>
        </div>

        <div className="ogrenci-alanlari">
          <div className="ogrenci-alanlari__baslik">
            <span>Seçtiğin bilgi alanları</span>

            <button
              type="button"
              onClick={ilgiAlanlariniDuzenle}
            >
              Düzenle
            </button>
          </div>

          <div>
            {bilgiAlanlari.length > 0 ? (
              bilgiAlanlari.map((alan) => (
                <strong key={alan}>{alan}</strong>
              ))
            ) : (
              <p>Henüz bir bilgi alanı seçilmedi.</p>
            )}
          </div>
        </div>

        <div className="topluluk-seviyesi">
          <div className="topluluk-seviyesi__ust">
            <span>{seviye.simge}</span>

            <div>
              <small>SEVİYE {seviye.seviye}</small>
              <strong>{seviye.ad}</strong>
            </div>

            <b>{profil?.xp ?? 0} XP</b>
          </div>

          <div className="topluluk-seviyesi__cubuk">
            <span style={{ width: `${seviyeIlerlemesi}%` }} />
          </div>

          <p>
            {sonrakiSeviye
              ? `Sonraki rütbe: ${sonrakiSeviye.ad} • ${sonrakiSeviye.gerekliXp} XP`
              : "En yüksek topluluk rütbesine ulaştın."}
          </p>
        </div>
      </div>

      <div className="ogrenci-paneli__alt">
        <div className="profil-ilerlemesi">
          <div className="profil-ilerlemesi__baslik">
            <span>Katkıcı profili</span>
            <strong>
              {profil?.verification_test_completed ? "3 / 3" : "2 / 3"}{" "}
              tamamlandı
            </strong>
          </div>

          <div className="profil-ilerlemesi__cubuk">
            <span
              style={{
                width: profil?.verification_test_completed
                  ? "100%"
                  : "66.66%",
              }}
            />
          </div>

          <div className="profil-adimlari">
            <span className="profil-adimi profil-adimi--tamam">
              ✓ E-posta
            </span>

            <span className="profil-adimi profil-adimi--tamam">
              ✓ Profil
            </span>

            <span
              className={
                profil?.verification_test_completed
                  ? "profil-adimi profil-adimi--tamam"
                  : "profil-adimi"
              }
            >
              {profil?.verification_test_completed ? "✓" : "3"} Alan testi
            </span>
          </div>
        </div>

        <div className="ogrenci-paneli__butonlar">
          {kurucuMu && (
            <button
              className="button button--secondary button--large"
              type="button"
              onClick={yetkileriYonet}
            >
              Yetkileri yönet
            </button>
          )}

          <button
            className="button button--primary button--large"
            type="button"
            onClick={testeBasla}
          >
            {profil?.verification_test_completed
              ? "Testi tekrar çöz"
              : "Doğrulama testine başla"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default OgrenciPaneli;
