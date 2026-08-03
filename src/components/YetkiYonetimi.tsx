// ============================================================
// 1. GEREKLİ ARAÇLAR VE TİPLER
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "../lib/supabase";
import { seviyeBilgisiniGetir } from "../data/seviyeler";
import type {
  KullaniciProfili,
  KullaniciRolu,
} from "../types/profil";

import "./YetkiYonetimi.css";

type YetkiYonetimiProps = {
  acik: boolean;
  kapat: () => void;
};

type YonetilebilirProfil = Pick<
  KullaniciProfili,
  "id" | "email" | "full_name" | "faculty" | "department" | "role"
  | "level" | "xp" | "verified_contributions" | "helpful_votes"
>;

const atanabilirRoller: Array<{
  deger: Exclude<KullaniciRolu, "founder">;
  etiket: string;
}> = [
  { deger: "student", etiket: "Öğrenci" },
  {
    deger: "assistant_moderator",
    etiket: "Moderatör Yardımcısı",
  },
  { deger: "moderator", etiket: "Moderatör" },
];

// ============================================================
// 2. KURUCUYA ÖZEL YETKİ YÖNETİM PENCERESİ
// ============================================================
function YetkiYonetimi({ acik, kapat }: YetkiYonetimiProps) {
  const [profiller, setProfiller] = useState<YonetilebilirProfil[]>([]);
  const [arama, setArama] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [kaydedilenId, setKaydedilenId] = useState<string | null>(null);
  const [hata, setHata] = useState("");
  const [bilgi, setBilgi] = useState("");

  const profilleriGetir = useCallback(async () => {
    setYukleniyor(true);
    setHata("");

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name, faculty, department, role, level, xp, verified_contributions, helpful_votes",
      )
      .neq("role", "founder")
      .order("full_name", { ascending: true });

    if (error) {
      setHata("Öğrenci listesi alınamadı. Lütfen tekrar dene.");
      setYukleniyor(false);
      return;
    }

    setProfiller((data ?? []) as YonetilebilirProfil[]);
    setYukleniyor(false);
  }, []);

  useEffect(() => {
    if (!acik) {
      return;
    }

    setArama("");
    setBilgi("");
    void profilleriGetir();
  }, [acik, profilleriGetir]);

  useEffect(() => {
    if (!acik) {
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [acik]);

  const filtrelenmisProfiller = useMemo(() => {
    const aranan = arama.trim().toLocaleLowerCase("tr-TR");

    if (!aranan) {
      return profiller;
    }

    return profiller.filter((profil) =>
      [
        profil.full_name,
        profil.email,
        profil.faculty,
        profil.department,
      ].some((deger) =>
        deger.toLocaleLowerCase("tr-TR").includes(aranan),
      ),
    );
  }, [arama, profiller]);

  const rolDegistir = async (
    profilId: string,
    yeniRol: Exclude<KullaniciRolu, "founder">,
  ) => {
    setKaydedilenId(profilId);
    setHata("");
    setBilgi("");

    const { error } = await supabase.rpc("founder_set_user_role", {
      target_user_id: profilId,
      new_role: yeniRol,
    });

    if (error) {
      setHata("Yetki değiştirilemedi. Kurucu hesabını kontrol et.");
      setKaydedilenId(null);
      return;
    }

    setProfiller((oncekiProfiller) =>
      oncekiProfiller.map((profil) =>
        profil.id === profilId
          ? { ...profil, role: yeniRol }
          : profil,
      ),
    );

    setBilgi("Kullanıcının yetkisi başarıyla güncellendi.");
    setKaydedilenId(null);
  };

  const seviyeYukselt = async (profil: YonetilebilirProfil) => {
    const yeniSeviye = Math.min(profil.level + 1, 5);

    if (yeniSeviye === profil.level) {
      return;
    }

    setKaydedilenId(profil.id);
    setHata("");
    setBilgi("");

    const { error } = await supabase.rpc("founder_promote_user_level", {
      target_user_id: profil.id,
      new_level: yeniSeviye,
    });

    if (error) {
      setHata("Öğrencinin seviyesi yükseltilemedi.");
      setKaydedilenId(null);
      return;
    }

    setProfiller((oncekiProfiller) =>
      oncekiProfiller.map((item) =>
        item.id === profil.id
          ? { ...item, level: yeniSeviye }
          : item,
      ),
    );

    setBilgi("Öğrenci bir üst topluluk seviyesine yükseltildi.");
    setKaydedilenId(null);
  };

  if (!acik) {
    return null;
  }

  return (
    <div className="yetki-overlay">
      <section
        className="yetki-paneli"
        role="dialog"
        aria-modal="true"
        aria-labelledby="yetki-basligi"
      >
        <header className="yetki-paneli__ust">
          <div>
            <span>KURUCU PANELİ</span>
            <h2 id="yetki-basligi">Topluluk yetkileri</h2>
            <p>
              Öğrencilere moderasyon görevi ver veya mevcut yetkisini kaldır.
            </p>
          </div>

          <button
            type="button"
            onClick={kapat}
            aria-label="Yetki panelini kapat"
          >
            ×
          </button>
        </header>

        <div className="yetki-arama">
          <span>⌕</span>
          <input
            type="search"
            value={arama}
            onChange={(olay) => setArama(olay.target.value)}
            placeholder="İsim, e-posta veya bölüm ara..."
            aria-label="Kullanıcı ara"
          />
        </div>

        {hata && <p className="yetki-mesaji yetki-mesaji--hata">{hata}</p>}
        {bilgi && <p className="yetki-mesaji yetki-mesaji--bilgi">{bilgi}</p>}

        <div className="yetki-listesi">
          {yukleniyor ? (
            <p className="yetki-bos">Öğrenciler getiriliyor...</p>
          ) : filtrelenmisProfiller.length === 0 ? (
            <p className="yetki-bos">Eşleşen öğrenci bulunamadı.</p>
          ) : (
            filtrelenmisProfiller.map((profil) => (
              <article className="yetki-kullanicisi" key={profil.id}>
                <span className="yetki-avatar">
                  {(profil.full_name || profil.email).charAt(0).toUpperCase()}
                </span>

                <div className="yetki-kullanicisi__bilgi">
                  <strong>{profil.full_name || "İsimsiz öğrenci"}</strong>
                  <span>{profil.email}</span>
                  <small>
                    {profil.department || profil.faculty || "Bölüm belirtilmedi"}
                  </small>

                  <em>
                    {seviyeBilgisiniGetir(profil.level).simge}{" "}
                    Seviye {profil.level} •{" "}
                    {seviyeBilgisiniGetir(profil.level).ad} • {profil.xp} XP
                  </em>
                </div>

                <label>
                  <span>Yetki</span>
                  <select
                    value={profil.role}
                    disabled={kaydedilenId === profil.id}
                    onChange={(olay) =>
                      void rolDegistir(
                        profil.id,
                        olay.target.value as Exclude<
                          KullaniciRolu,
                          "founder"
                        >,
                      )
                    }
                  >
                    {atanabilirRoller.map((rol) => (
                      <option value={rol.deger} key={rol.deger}>
                        {rol.etiket}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  className="yetki-seviye-butonu"
                  type="button"
                  disabled={
                    profil.level >= 5 || kaydedilenId === profil.id
                  }
                  onClick={() => void seviyeYukselt(profil)}
                >
                  {profil.level >= 5
                    ? "En yüksek seviye"
                    : `Seviye ${profil.level + 1}'e yükselt`}
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default YetkiYonetimi;
