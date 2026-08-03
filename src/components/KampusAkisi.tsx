import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import type { User } from "@supabase/supabase-js";

import { seviyeBilgisiniGetir } from "../data/seviyeler";
import { supabase } from "../lib/supabase";
import type { KullaniciProfili } from "../types/profil";
import type {
  AkisSekmesi,
  Begeni,
  Bildirim,
  CanliSosyalVeriler,
  Gonderi,
  IcerikRaporu,
  Takip,
  Topluluk,
  ToplulukUyesi,
  Yorum,
} from "../types/sosyal";
import OgrenciPaneli from "./OgrenciPaneli";

import "./KampusAkisi.css";

type KampusAkisiProps = {
  kullanici: User;
  profil: KullaniciProfili;
  cikisYap: () => Promise<void>;
  testeBasla: () => void;
  ilgiAlanlariniDuzenle: () => void;
  yetkileriYonet: () => void;
  profiliYenile: () => Promise<void>;
  hukukiMetinleriAc: () => void;
};

const bosVeriler: CanliSosyalVeriler = {
  gonderiler: [],
  profiller: [],
  topluluklar: [],
  uyelikler: [],
  yorumlar: [],
  begeniler: [],
  takipler: [],
  bildirimler: [],
  raporlar: [],
};

const kategoriler = [
  "Bilgi",
  "Ders",
  "Kariyer",
  "Staj",
  "Kampüs",
  "Soru",
  "Kaynak",
];

const raporNedenleri: Array<{
  id: IcerikRaporu["reason"];
  ad: string;
}> = [
  { id: "spam", ad: "Spam veya aldatıcı içerik" },
  { id: "harassment", ad: "Taciz, hakaret veya tehdit" },
  { id: "copyright", ad: "Telif hakkı ihlali" },
  { id: "privacy", ad: "Kişisel veri / gizlilik ihlali" },
  { id: "misinformation", ad: "Yanlış veya yanıltıcı bilgi" },
  { id: "other", ad: "Diğer" },
];

const raporNedeniAdi = (neden: IcerikRaporu["reason"]) =>
  raporNedenleri.find((item) => item.id === neden)?.ad ?? "Diğer";

const rolAdi = (profil?: KullaniciProfili) => {
  if (profil?.role === "founder") return "Kurucu";
  if (profil?.role === "moderator") return "Moderatör";
  if (profil?.role === "assistant_moderator") return "Mod. Yardımcısı";
  return "Öğrenci";
};

const tarihYaz = (tarih: string) => {
  const zaman = new Date(tarih);
  const fark = Date.now() - zaman.getTime();
  const dakika = Math.floor(fark / 60_000);

  if (dakika < 1) return "şimdi";
  if (dakika < 60) return `${dakika} dk`;

  const saat = Math.floor(dakika / 60);
  if (saat < 24) return `${saat} sa`;

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
  }).format(zaman);
};

function KampusAkisi({
  kullanici,
  profil,
  cikisYap,
  testeBasla,
  ilgiAlanlariniDuzenle,
  yetkileriYonet,
  profiliYenile,
  hukukiMetinleriAc,
}: KampusAkisiProps) {
  const [sekme, setSekme] = useState<AkisSekmesi>("anasayfa");
  const [veriler, setVeriler] = useState<CanliSosyalVeriler>(bosVeriler);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [hata, setHata] = useState("");
  const [bildirim, setBildirim] = useState("");
  const [arama, setArama] = useState("");
  const [gonderiMetni, setGonderiMetni] = useState("");
  const [kategori, setKategori] = useState("Bilgi");
  const [bolum, setBolum] = useState(profil.department || "");
  const [etiketMetni, setEtiketMetni] = useState("");
  const [hedefTopluluk, setHedefTopluluk] = useState("");
  const [paylasiliyor, setPaylasiliyor] = useState(false);
  const [acikYorumlar, setAcikYorumlar] = useState<string[]>([]);
  const [yorumTaslaklari, setYorumTaslaklari] = useState<Record<string, string>>(
    {},
  );
  const [toplulukFormuAcik, setToplulukFormuAcik] = useState(false);
  const [toplulukAdi, setToplulukAdi] = useState("");
  const [toplulukAciklamasi, setToplulukAciklamasi] = useState("");
  const [toplulukBolumu, setToplulukBolumu] = useState(profil.department || "");
  const [seciliTopluluk, setSeciliTopluluk] = useState<string | null>(null);
  const [seciliProfilId, setSeciliProfilId] = useState<string | null>(null);
  const [medyaYukleniyor, setMedyaYukleniyor] = useState("");
  const [raporHedefi, setRaporHedefi] = useState<{
    target_type: IcerikRaporu["target_type"];
    post_id?: string;
    comment_id?: string;
    community_id?: string;
    profile_id?: string;
  } | null>(null);
  const [raporNedeni, setRaporNedeni] = useState<IcerikRaporu["reason"]>("spam");
  const [raporDetayi, setRaporDetayi] = useState("");
  const [raporGonderiliyor, setRaporGonderiliyor] = useState(false);
  const [hesapSilmeMetni, setHesapSilmeMetni] = useState("");
  const [hesapSiliniyor, setHesapSiliniyor] = useState(false);

  const moderatorMu = [
    "assistant_moderator",
    "moderator",
    "founder",
  ].includes(profil.role);

  const avatarIcerigi = (kisi?: KullaniciProfili | null) =>
    kisi?.avatar_url ? (
      <img src={kisi.avatar_url} alt={`${kisi.full_name} profil fotoğrafı`} />
    ) : (
      (kisi?.full_name || "Ö").charAt(0).toUpperCase()
    );

  const verileriGetir = useCallback(async (sessiz = false) => {
    if (sessiz) setYenileniyor(true);
    else setYukleniyor(true);

    const sonuclar = await Promise.all([
      supabase.from("posts").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("full_name"),
      supabase
        .from("communities")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("community_members").select("*"),
      supabase.from("comments").select("*").order("created_at"),
      supabase.from("post_likes").select("*"),
      supabase.from("follows").select("*"),
      supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", kullanici.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    const ilkHata = sonuclar.find((sonuc) => sonuc.error)?.error;

    if (ilkHata) {
      setHata(`Canlı akış okunamadı: ${ilkHata.message}`);
    } else {
      setHata("");
      setVeriler({
        gonderiler: (sonuclar[0].data ?? []) as Gonderi[],
        profiller: (sonuclar[1].data ?? []) as KullaniciProfili[],
        topluluklar: (sonuclar[2].data ?? []) as Topluluk[],
        uyelikler: (sonuclar[3].data ?? []) as ToplulukUyesi[],
        yorumlar: (sonuclar[4].data ?? []) as Yorum[],
        begeniler: (sonuclar[5].data ?? []) as Begeni[],
        takipler: (sonuclar[6].data ?? []) as Takip[],
        bildirimler: (sonuclar[7].data ?? []) as Bildirim[],
        raporlar: (sonuclar[8].data ?? []) as IcerikRaporu[],
      });
    }

    setYukleniyor(false);
    setYenileniyor(false);
  }, [kullanici.id]);

  useEffect(() => {
    void verileriGetir();

    const kanal = supabase
      .channel("kampus-hafiza-canli-akis")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => void verileriGetir(true),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        () => void verileriGetir(true),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_likes" },
        () => void verileriGetir(true),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follows" },
        () => void verileriGetir(true),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "communities" },
        () => void verileriGetir(true),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_members" },
        () => void verileriGetir(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${kullanici.id}`,
        },
        () => void verileriGetir(true),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => void verileriGetir(true),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [kullanici.id, verileriGetir]);

  useEffect(() => {
    if (!bildirim) return;
    const sure = window.setTimeout(() => setBildirim(""), 2800);
    return () => window.clearTimeout(sure);
  }, [bildirim]);

  const profilHaritasi = useMemo(
    () => new Map(veriler.profiller.map((item) => [item.id, item])),
    [veriler.profiller],
  );

  const toplulukHaritasi = useMemo(
    () => new Map(veriler.topluluklar.map((item) => [item.id, item])),
    [veriler.topluluklar],
  );

  const okunmamisBildirimSayisi = veriler.bildirimler.filter(
    (item) => !item.read_at,
  ).length;

  const bekleyenRaporSayisi = veriler.raporlar.filter(
    (item) => item.status === "pending" || item.status === "reviewed",
  ).length;

  const goruntulenenProfil = seciliProfilId
    ? profilHaritasi.get(seciliProfilId)
    : profil;

  const takipEttigimIdler = useMemo(
    () =>
      new Set(
        veriler.takipler
          .filter((takip) => takip.follower_id === kullanici.id)
          .map((takip) => takip.following_id),
      ),
    [kullanici.id, veriler.takipler],
  );

  const uyeOldugumTopluluklar = useMemo(() => {
    const idler = new Set(
      veriler.uyelikler
        .filter((uyelik) => uyelik.user_id === kullanici.id)
        .map((uyelik) => uyelik.community_id),
    );
    return veriler.topluluklar.filter((topluluk) => idler.has(topluluk.id));
  }, [kullanici.id, veriler.topluluklar, veriler.uyelikler]);

  const gorunurGonderiler = useMemo(() => {
    const secili = veriler.gonderiler.filter((gonderi) => {
      if (gonderi.moderation_status === "rejected") {
        return moderatorMu || gonderi.author_id === kullanici.id;
      }

      if (gonderi.moderation_status === "pending") {
        return moderatorMu || gonderi.author_id === kullanici.id;
      }

      return true;
    });

    if (seciliTopluluk) {
      return secili.filter(
        (gonderi) => gonderi.community_id === seciliTopluluk,
      );
    }

    if (sekme === "profil" && seciliProfilId) {
      return secili.filter(
        (gonderi) => gonderi.author_id === seciliProfilId,
      );
    }

    if (sekme === "takip") {
      return secili.filter(
        (gonderi) =>
          takipEttigimIdler.has(gonderi.author_id) ||
          gonderi.author_id === kullanici.id,
      );
    }

    if (sekme === "arastir" && arama.trim()) {
      const aranan = arama.toLocaleLowerCase("tr-TR");
      return secili.filter((gonderi) => {
        const yazar = profilHaritasi.get(gonderi.author_id);
        const topluluk = gonderi.community_id
          ? toplulukHaritasi.get(gonderi.community_id)
          : undefined;
        const aranacak = [
          gonderi.body,
          gonderi.category,
          gonderi.department,
          gonderi.tags.join(" "),
          yazar?.full_name,
          topluluk?.name,
        ]
          .join(" ")
          .toLocaleLowerCase("tr-TR");
        return aranacak.includes(aranan);
      });
    }

    return secili;
  }, [
    arama,
    kullanici.id,
    moderatorMu,
    profilHaritasi,
    seciliTopluluk,
    seciliProfilId,
    sekme,
    takipEttigimIdler,
    toplulukHaritasi,
    veriler.gonderiler,
  ]);

  const toplulukAramaSonuclari = useMemo(() => {
    if (sekme !== "arastir" || !arama.trim()) return [];
    const aranan = arama.toLocaleLowerCase("tr-TR");
    return veriler.topluluklar.filter((topluluk) =>
      `${topluluk.name} ${topluluk.description} ${topluluk.department}`
        .toLocaleLowerCase("tr-TR")
        .includes(aranan),
    );
  }, [arama, sekme, veriler.topluluklar]);

  const kisiAramaSonuclari = useMemo(() => {
    if (sekme !== "arastir" || !arama.trim()) return [];
    const aranan = arama.toLocaleLowerCase("tr-TR");
    return veriler.profiller.filter(
      (item) =>
        item.id !== kullanici.id &&
        `${item.full_name} ${item.department} ${item.expertise_areas.join(" ")}`
          .toLocaleLowerCase("tr-TR")
          .includes(aranan),
    );
  }, [arama, kullanici.id, sekme, veriler.profiller]);

  const sekmeyeGit = (yeniSekme: AkisSekmesi) => {
    setSeciliTopluluk(null);
    setSeciliProfilId(null);
    setSekme(yeniSekme);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const profiliAc = (profilId: string) => {
    setSeciliTopluluk(null);
    setSeciliProfilId(profilId);
    setSekme("profil");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const bildirimiOku = async (bildirim: Bildirim) => {
    if (!bildirim.read_at) {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", bildirim.id);
      if (error) {
        setBildirim(error.message);
        return;
      }
      await verileriGetir(true);
    }

    if (bildirim.community_id) {
      topluluguAc(bildirim.community_id);
      return;
    }

    if (bildirim.type === "follow" && bildirim.actor_id) {
      profiliAc(bildirim.actor_id);
      return;
    }

    if (bildirim.post_id) {
      sekmeyeGit("anasayfa");
      window.setTimeout(
        () =>
          document
            .getElementById(`gonderi-${bildirim.post_id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        350,
      );
    }
  };

  const tumBildirimleriOku = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", kullanici.id)
      .is("read_at", null);
    if (error) setBildirim(error.message);
    else await verileriGetir(true);
  };

  const eskiMedyaYolunuGetir = (url: string | null | undefined) => {
    if (!url) return null;
    const isaret = "/storage/v1/object/public/kampus-medya/";
    const baslangic = url.indexOf(isaret);
    if (baslangic === -1) return null;
    return decodeURIComponent(url.slice(baslangic + isaret.length));
  };

  const gorseliWebIcinHazirla = async (
    dosya: File,
    tur: "avatar" | "cover" | "community",
  ) => {
    if (!dosya.type.startsWith("image/")) {
      throw new Error("Seçtiğin dosya bir görsel değil.");
    }
    if (dosya.size > 12 * 1024 * 1024) {
      throw new Error("Kaynak görsel en fazla 12 MB olabilir.");
    }

    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(dosya);
    } catch {
      throw new Error(
        "Bu görsel biçimi tarayıcı tarafından açılamadı. JPG, PNG veya WebP dene.",
      );
    }

    const enFazlaGenislik = tur === "cover" ? 1920 : 1000;
    const enFazlaYukseklik = tur === "cover" ? 1080 : 1000;
    const oran = Math.min(
      enFazlaGenislik / bitmap.width,
      enFazlaYukseklik / bitmap.height,
      1,
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * oran));
    canvas.height = Math.max(1, Math.round(bitmap.height * oran));
    const cizim = canvas.getContext("2d");
    if (!cizim) {
      bitmap.close();
      throw new Error("Görsel hazırlanamadı.");
    }
    cizim.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((coz) =>
      canvas.toBlob(coz, "image/webp", 0.84),
    );
    if (!blob) {
      throw new Error("Görsel WebP biçimine dönüştürülemedi.");
    }
    if (blob.size > 3 * 1024 * 1024) {
      throw new Error("Görsel küçültüldükten sonra bile 3 MB sınırını aşıyor.");
    }

    return new File([blob], `${tur}.webp`, { type: "image/webp" });
  };

  const medyaYukle = async (
    dosya: File,
    tur: "avatar" | "cover" | "community",
    topluluk?: Topluluk,
  ) => {
    setMedyaYukleniyor(tur);
    let yuklenecekDosya: File;
    try {
      yuklenecekDosya = await gorseliWebIcinHazirla(dosya, tur);
    } catch (error) {
      setBildirim(
        error instanceof Error ? error.message : "Görsel hazırlanamadı.",
      );
      setMedyaYukleniyor("");
      return;
    }

    const dosyaAdi = `${tur}-${Date.now()}.webp`;
    const dosyaYolu = `${kullanici.id}/${dosyaAdi}`;

    const { error: yuklemeHatasi } = await supabase.storage
      .from("kampus-medya")
      .upload(dosyaYolu, yuklenecekDosya, {
        cacheControl: "3600",
        contentType: "image/webp",
      });

    if (yuklemeHatasi) {
      setBildirim(`Görsel yüklenemedi: ${yuklemeHatasi.message}`);
      setMedyaYukleniyor("");
      return;
    }

    const { data: genelAdres } = supabase.storage
      .from("kampus-medya")
      .getPublicUrl(dosyaYolu);

    const eskiUrl = tur === "avatar"
      ? profil.avatar_url
      : tur === "cover"
        ? profil.cover_url
        : topluluk?.logo_url;

    const guncelleme = tur === "community" && topluluk
      ? supabase
          .from("communities")
          .update({
            logo_url: genelAdres.publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", topluluk.id)
      : supabase
          .from("profiles")
          .update({
            [tur === "avatar" ? "avatar_url" : "cover_url"]:
              genelAdres.publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", kullanici.id);

    const { error: kayitHatasi } = await guncelleme;
    if (kayitHatasi) {
      await supabase.storage.from("kampus-medya").remove([dosyaYolu]);
      setBildirim(`Görsel profile bağlanamadı: ${kayitHatasi.message}`);
      setMedyaYukleniyor("");
      return;
    }

    const eskiYol = eskiMedyaYolunuGetir(eskiUrl);
    if (eskiYol) {
      await supabase.storage.from("kampus-medya").remove([eskiYol]);
    }

    await Promise.all([profiliYenile(), verileriGetir(true)]);
    setBildirim(
      tur === "avatar"
        ? "Profil fotoğrafın güncellendi."
        : tur === "cover"
          ? "Kapak fotoğrafın güncellendi."
          : "Topluluk logosu güncellendi.",
    );
    setMedyaYukleniyor("");
  };

  const medyayiKaldir = async (
    tur: "avatar" | "cover" | "community",
    topluluk?: Topluluk,
  ) => {
    const mevcutUrl = tur === "avatar"
      ? profil.avatar_url
      : tur === "cover"
        ? profil.cover_url
        : topluluk?.logo_url;
    if (!mevcutUrl) return;

    setMedyaYukleniyor(tur);
    const guncelleme = tur === "community" && topluluk
      ? supabase
          .from("communities")
          .update({ logo_url: null, updated_at: new Date().toISOString() })
          .eq("id", topluluk.id)
      : supabase
          .from("profiles")
          .update({
            [tur === "avatar" ? "avatar_url" : "cover_url"]: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", kullanici.id);

    const { error } = await guncelleme;
    if (error) {
      setBildirim(`Görsel kaldırılamadı: ${error.message}`);
      setMedyaYukleniyor("");
      return;
    }

    const dosyaYolu = eskiMedyaYolunuGetir(mevcutUrl);
    if (dosyaYolu) {
      await supabase.storage.from("kampus-medya").remove([dosyaYolu]);
    }

    await Promise.all([profiliYenile(), verileriGetir(true)]);
    setBildirim(
      tur === "community"
        ? "Topluluk logosu kaldırıldı."
        : tur === "cover"
          ? "Kapak fotoğrafın kaldırıldı."
          : "Profil fotoğrafın kaldırıldı.",
    );
    setMedyaYukleniyor("");
  };

  const gonderiPaylas = async (event: FormEvent) => {
    event.preventDefault();
    const metin = gonderiMetni.trim();
    if (!metin || paylasiliyor) return;

    setPaylasiliyor(true);
    const etiketler = etiketMetni
      .split(",")
      .map((etiket) => etiket.trim().replace(/^#/, ""))
      .filter(Boolean)
      .slice(0, 5);

    const { error } = await supabase.from("posts").insert({
      author_id: kullanici.id,
      community_id: hedefTopluluk || null,
      body: metin,
      category: kategori,
      department: bolum.trim(),
      tags: etiketler,
      moderation_status: moderatorMu ? "approved" : "pending",
    });

    if (error) {
      setBildirim(`Paylaşılamadı: ${error.message}`);
    } else {
      setGonderiMetni("");
      setEtiketMetni("");
      setBildirim(
        moderatorMu
          ? "Gönderin canlı akışta yayınlandı."
          : "Gönderin moderasyon sırasına alındı.",
      );
      await verileriGetir(true);
    }
    setPaylasiliyor(false);
  };

  const takipDegistir = async (hedefId: string) => {
    const takipte = takipEttigimIdler.has(hedefId);
    const istek = takipte
      ? supabase
          .from("follows")
          .delete()
          .eq("follower_id", kullanici.id)
          .eq("following_id", hedefId)
      : supabase.from("follows").insert({
          follower_id: kullanici.id,
          following_id: hedefId,
        });
    const { error } = await istek;
    if (error) setBildirim(error.message);
    else await verileriGetir(true);
  };

  const begeniDegistir = async (gonderi: Gonderi) => {
    if (gonderi.author_id === kullanici.id) {
      setBildirim("Kendi gönderini faydalı olarak işaretleyemezsin.");
      return;
    }

    const begenildi = veriler.begeniler.some(
      (begeni) =>
        begeni.post_id === gonderi.id && begeni.user_id === kullanici.id,
    );
    const istek = begenildi
      ? supabase
          .from("post_likes")
          .delete()
          .eq("post_id", gonderi.id)
          .eq("user_id", kullanici.id)
      : supabase.from("post_likes").insert({
          post_id: gonderi.id,
          user_id: kullanici.id,
        });
    const { error } = await istek;
    if (error) setBildirim(error.message);
    else await verileriGetir(true);
  };

  const yorumGonder = async (event: FormEvent, gonderiId: string) => {
    event.preventDefault();
    const metin = yorumTaslaklari[gonderiId]?.trim();
    if (!metin) return;

    const { error } = await supabase.from("comments").insert({
      post_id: gonderiId,
      author_id: kullanici.id,
      body: metin,
    });
    if (error) setBildirim(error.message);
    else {
      setYorumTaslaklari((onceki) => ({ ...onceki, [gonderiId]: "" }));
      await verileriGetir(true);
    }
  };

  const gonderiyiSil = async (gonderiId: string) => {
    if (!window.confirm("Bu gönderiyi silmek istediğine emin misin?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", gonderiId);
    if (error) setBildirim(error.message);
    else {
      setBildirim("Gönderi silindi.");
      await verileriGetir(true);
    }
  };

  const yorumuSil = async (yorumId: string) => {
    if (!window.confirm("Bu yorumu silmek istediğine emin misin?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", yorumId);
    if (error) setBildirim(error.message);
    else {
      setBildirim("Yorum silindi.");
      await verileriGetir(true);
    }
  };

  const gonderiyiYonet = async (
    gonderiId: string,
    durum: "approved" | "rejected",
  ) => {
    const { error } = await supabase.rpc("moderate_post", {
      target_post_id: gonderiId,
      new_status: durum,
    });
    if (error) setBildirim(error.message);
    else {
      setBildirim(durum === "approved" ? "Gönderi onaylandı." : "Gönderi reddedildi.");
      await verileriGetir(true);
    }
  };

  const raporuGonder = async (event: FormEvent) => {
    event.preventDefault();
    if (!raporHedefi || raporGonderiliyor) return;

    setRaporGonderiliyor(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: kullanici.id,
      target_type: raporHedefi.target_type,
      post_id: raporHedefi.post_id ?? null,
      comment_id: raporHedefi.comment_id ?? null,
      community_id: raporHedefi.community_id ?? null,
      profile_id: raporHedefi.profile_id ?? null,
      reason: raporNedeni,
      details: raporDetayi.trim(),
    });

    if (error) {
      setBildirim(
        error.code === "23505"
          ? "Bu içeriği daha önce şikâyet ettin."
          : `Şikâyet gönderilemedi: ${error.message}`,
      );
    } else {
      setBildirim("Şikâyetin moderasyon ekibine iletildi.");
      setRaporHedefi(null);
      setRaporDetayi("");
      setRaporNedeni("spam");
      await verileriGetir(true);
    }
    setRaporGonderiliyor(false);
  };

  const raporuSonuclandir = async (
    raporId: string,
    durum: "resolved" | "rejected",
  ) => {
    const { error } = await supabase
      .from("reports")
      .update({
        status: durum,
        reviewed_by: kullanici.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", raporId);

    if (error) setBildirim(`Rapor güncellenemedi: ${error.message}`);
    else {
      setBildirim(
        durum === "resolved"
          ? "Rapor çözüldü olarak işaretlendi."
          : "Rapor ihlal yok olarak kapatıldı.",
      );
      await verileriGetir(true);
    }
  };

  const hesabimiSil = async () => {
    if (hesapSilmeMetni !== "HESABIMI SİL" || hesapSiliniyor) return;

    const sonOnay = window.confirm(
      "Hesabın; gönderilerin, yorumların, toplulukların ve görsellerinle birlikte kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam edilsin mi?",
    );
    if (!sonOnay) return;

    setHesapSiliniyor(true);

    // Supabase Storage tabloları SQL ile doğrudan silinemez. Bu nedenle
    // kullanıcının klasöründeki görselleri önce güvenli Storage API ile kaldırırız.
    const { data: hesapDosyalari, error: listeHatasi } = await supabase.storage
      .from("kampus-medya")
      .list(kullanici.id, { limit: 1000 });

    if (listeHatasi) {
      setBildirim(`Hesap görselleri okunamadı: ${listeHatasi.message}`);
      setHesapSiliniyor(false);
      return;
    }

    const silinecekDosyalar = (hesapDosyalari ?? []).map(
      (dosya) => `${kullanici.id}/${dosya.name}`,
    );

    if (silinecekDosyalar.length > 0) {
      const { error: dosyaSilmeHatasi } = await supabase.storage
        .from("kampus-medya")
        .remove(silinecekDosyalar);

      if (dosyaSilmeHatasi) {
        setBildirim(`Hesap görselleri silinemedi: ${dosyaSilmeHatasi.message}`);
        setHesapSiliniyor(false);
        return;
      }
    }

    const { error } = await supabase.rpc("delete_my_account");

    if (error) {
      setBildirim(`Hesap silinemedi: ${error.message}`);
      setHesapSiliniyor(false);
      return;
    }

    await supabase.auth.signOut({ scope: "local" });
    window.location.reload();
  };

  const toplulukOlustur = async (event: FormEvent) => {
    event.preventDefault();
    if (!toplulukAdi.trim() || !toplulukAciklamasi.trim()) return;

    const { data, error } = await supabase
      .from("communities")
      .insert({
        founder_id: kullanici.id,
        name: toplulukAdi.trim(),
        description: toplulukAciklamasi.trim(),
        faculty: profil.faculty,
        department: toplulukBolumu.trim(),
      })
      .select("id")
      .single();

    if (error) setBildirim(`Topluluk kurulamadı: ${error.message}`);
    else {
      setToplulukAdi("");
      setToplulukAciklamasi("");
      setToplulukFormuAcik(false);
      setSeciliTopluluk(data.id as string);
      setBildirim("Topluluğun kuruldu, sen de kurucu üyesin.");
      await verileriGetir(true);
    }
  };

  const uyelikDegistir = async (topluluk: Topluluk) => {
    const uyelik = veriler.uyelikler.find(
      (item) =>
        item.community_id === topluluk.id && item.user_id === kullanici.id,
    );

    if (uyelik?.role === "founder") {
      setBildirim("Kurucusu olduğun topluluktan ayrılamazsın.");
      return;
    }

    const istek = uyelik
      ? supabase
          .from("community_members")
          .delete()
          .eq("community_id", topluluk.id)
          .eq("user_id", kullanici.id)
      : supabase.from("community_members").insert({
          community_id: topluluk.id,
          user_id: kullanici.id,
          role: "member",
        });
    const { error } = await istek;
    if (error) setBildirim(error.message);
    else {
      setBildirim(uyelik ? "Topluluktan ayrıldın." : "Topluluğa katıldın.");
      await verileriGetir(true);
    }
  };

  const topluluguSil = async (topluluk: Topluluk) => {
    const onay = window.confirm(
      `“${topluluk.name}” topluluğu; içindeki gönderiler ve yorumlarla birlikte kalıcı olarak silinecek. Devam edilsin mi?`,
    );
    if (!onay) return;

    const { error } = await supabase
      .from("communities")
      .delete()
      .eq("id", topluluk.id);
    if (error) {
      setBildirim(`Topluluk silinemedi: ${error.message}`);
      return;
    }

    const logoYolu = eskiMedyaYolunuGetir(topluluk.logo_url);
    if (logoYolu && topluluk.founder_id === kullanici.id) {
      await supabase.storage.from("kampus-medya").remove([logoYolu]);
    }

    setSeciliTopluluk(null);
    setHedefTopluluk("");
    setSekme("topluluklar");
    setBildirim("Topluluk ve topluluğa bağlı içerikler silindi.");
    await verileriGetir(true);
  };

  const topluluguAc = (toplulukId: string) => {
    setSekme("topluluklar");
    setSeciliTopluluk(toplulukId);
    setHedefTopluluk(toplulukId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const seciliToplulukBilgisi = seciliTopluluk
    ? toplulukHaritasi.get(seciliTopluluk)
    : undefined;

  const goruntulenenTakipciSayisi = goruntulenenProfil
    ? veriler.takipler.filter(
        (takip) => takip.following_id === goruntulenenProfil.id,
      ).length
    : 0;
  const goruntulenenTakipSayisi = goruntulenenProfil
    ? veriler.takipler.filter(
        (takip) => takip.follower_id === goruntulenenProfil.id,
      ).length
    : 0;
  const goruntulenenGonderiSayisi = goruntulenenProfil
    ? veriler.gonderiler.filter(
        (gonderi) =>
          gonderi.author_id === goruntulenenProfil.id &&
          gonderi.moderation_status === "approved",
      ).length
    : 0;

  const bildirimBilgisi = (item: Bildirim) => {
    const aktor = item.actor_id
      ? profilHaritasi.get(item.actor_id)?.full_name || "Bir öğrenci"
      : "Moderasyon ekibi";

    if (item.type === "follow") {
      return { simge: "＋", metin: `${aktor} seni takip etmeye başladı.` };
    }
    if (item.type === "comment") {
      return { simge: "◯", metin: `${aktor} gönderine yorum yaptı.` };
    }
    if (item.type === "like") {
      return { simge: "♡", metin: `${aktor} gönderini faydalı buldu.` };
    }
    if (item.type === "post_approved") {
      return { simge: "✓", metin: "Gönderin onaylandı ve canlı akışta yayınlandı." };
    }
    if (item.type === "post_rejected") {
      return { simge: "×", metin: "Gönderin moderasyon sonucunda reddedildi." };
    }
    return { simge: "◎", metin: `${aktor} topluluğuna katıldı.` };
  };

  const takipOnerileri = veriler.profiller
    .filter(
      (item) => item.id !== kullanici.id && !takipEttigimIdler.has(item.id),
    )
    .slice(0, 3);

  const gonderiKarti = (gonderi: Gonderi) => {
    const yazar = profilHaritasi.get(gonderi.author_id);
    const topluluk = gonderi.community_id
      ? toplulukHaritasi.get(gonderi.community_id)
      : undefined;
    const yorumlar = veriler.yorumlar.filter(
      (yorum) => yorum.post_id === gonderi.id,
    );
    const begeniler = veriler.begeniler.filter(
      (begeni) => begeni.post_id === gonderi.id,
    );
    const begenildi = begeniler.some(
      (begeni) => begeni.user_id === kullanici.id,
    );
    const yorumlarAcik = acikYorumlar.includes(gonderi.id);
    const toplulukKurucusuMu = topluluk?.founder_id === kullanici.id;
    const silebilir =
      gonderi.author_id === kullanici.id ||
      moderatorMu ||
      toplulukKurucusuMu;
    const seviye = seviyeBilgisiniGetir(yazar?.level ?? 1);

    return (
      <article
        className="akis-gonderisi"
        id={`gonderi-${gonderi.id}`}
        key={gonderi.id}
      >
        <div className="akis-avatar">{avatarIcerigi(yazar)}</div>
        <div className="akis-gonderisi__govde">
          <div className="akis-gonderisi__ust">
            <div>
              <button
                className="yazar-profili-buton"
                type="button"
                onClick={() => profiliAc(gonderi.author_id)}
              >
                {yazar?.full_name || "MCBÜ Öğrencisi"}
              </button>
              {yazar?.role !== "student" && (
                <span className={`rol-rozeti rol-rozeti--${yazar?.role}`}>
                  {rolAdi(yazar)}
                </span>
              )}
              <small>Seviye {yazar?.level ?? 1} · {seviye.ad}</small>
            </div>
            <span>{tarihYaz(gonderi.created_at)}</span>
          </div>

          {topluluk && (
            <button
              className="topluluk-baglanti"
              type="button"
              onClick={() => topluluguAc(topluluk.id)}
            >
              ◉ {topluluk.name} topluluğunda
            </button>
          )}

          <p className="akis-gonderisi__metin">{gonderi.body}</p>

          <div className="akis-gonderisi__etiketler">
            <span>{gonderi.category}</span>
            {gonderi.department && <span>{gonderi.department}</span>}
            {gonderi.tags.map((etiket) => (
              <button
                type="button"
                key={etiket}
                onClick={() => {
                  setArama(etiket);
                  sekmeyeGit("arastir");
                }}
              >
                #{etiket}
              </button>
            ))}
          </div>

          {gonderi.moderation_status !== "approved" && (
            <div className={`moderasyon-durumu moderasyon-durumu--${gonderi.moderation_status}`}>
              {gonderi.moderation_status === "pending"
                ? "İnceleme bekliyor"
                : "Yayınlanması uygun bulunmadı"}
            </div>
          )}

          {moderatorMu && gonderi.moderation_status === "pending" && (
            <div className="moderasyon-butonlari">
              <button type="button" onClick={() => void gonderiyiYonet(gonderi.id, "approved")}>
                ✓ Onayla
              </button>
              <button type="button" onClick={() => void gonderiyiYonet(gonderi.id, "rejected")}>
                × Reddet
              </button>
            </div>
          )}

          <div className="akis-gonderisi__aksiyonlar">
            <button
              type="button"
              className={yorumlarAcik ? "aktif" : ""}
              onClick={() =>
                setAcikYorumlar((onceki) =>
                  onceki.includes(gonderi.id)
                    ? onceki.filter((id) => id !== gonderi.id)
                    : [...onceki, gonderi.id],
                )
              }
            >
              ◯ <span>{yorumlar.length}</span> Yorum
            </button>
            <button
              type="button"
              className={begenildi ? "aktif faydali" : ""}
              onClick={() => void begeniDegistir(gonderi)}
            >
              ♡ <span>{begeniler.length}</span> Faydalı
            </button>
            {gonderi.author_id !== kullanici.id && (
              <button type="button" onClick={() => void takipDegistir(gonderi.author_id)}>
                {takipEttigimIdler.has(gonderi.author_id) ? "✓ Takipte" : "+ Takip et"}
              </button>
            )}
            {gonderi.author_id !== kullanici.id && (
              <button
                className="rapor-aksiyonu"
                type="button"
                onClick={() =>
                  setRaporHedefi({ target_type: "post", post_id: gonderi.id })
                }
              >
                Şikâyet et
              </button>
            )}
            {silebilir && (
              <button className="sil-aksiyonu" type="button" onClick={() => void gonderiyiSil(gonderi.id)}>
                Sil
              </button>
            )}
          </div>

          {yorumlarAcik && (
            <div className="yorum-alani">
              {yorumlar.map((yorum) => {
                const yorumYazari = profilHaritasi.get(yorum.author_id);
                return (
                  <div className="yorum" key={yorum.id}>
                    <span>{avatarIcerigi(yorumYazari)}</span>
                    <div>
                      <div className="yorum__ust">
                        <strong>{yorumYazari?.full_name || "Öğrenci"}</strong>
                        <small>{tarihYaz(yorum.created_at)}</small>
                        {(yorum.author_id === kullanici.id ||
                          moderatorMu ||
                          toplulukKurucusuMu) && (
                          <button
                            type="button"
                            onClick={() => void yorumuSil(yorum.id)}
                          >
                            Sil
                          </button>
                        )}
                        {yorum.author_id !== kullanici.id && (
                          <button
                            className="yorum-rapor-butonu"
                            type="button"
                            onClick={() =>
                              setRaporHedefi({
                                target_type: "comment",
                                comment_id: yorum.id,
                              })
                            }
                          >
                            Şikâyet
                          </button>
                        )}
                      </div>
                      <p>{yorum.body}</p>
                    </div>
                  </div>
                );
              })}
              <form onSubmit={(event) => void yorumGonder(event, gonderi.id)}>
                <input
                  value={yorumTaslaklari[gonderi.id] || ""}
                  onChange={(event) =>
                    setYorumTaslaklari((onceki) => ({
                      ...onceki,
                      [gonderi.id]: event.target.value,
                    }))
                  }
                  maxLength={600}
                  placeholder="Topluluğa düşünceni ekle..."
                />
                <button type="submit">Yanıtla</button>
              </form>
            </div>
          )}
        </div>
      </article>
    );
  };

  const toplulukKarti = (topluluk: Topluluk) => {
    const uyeler = veriler.uyelikler.filter(
      (uyelik) => uyelik.community_id === topluluk.id,
    );
    const uye = uyeler.find((uyelik) => uyelik.user_id === kullanici.id);
    const kurucu = profilHaritasi.get(topluluk.founder_id);

    return (
      <article className="topluluk-karti" key={topluluk.id}>
        <button className="topluluk-karti__govde" type="button" onClick={() => topluluguAc(topluluk.id)}>
          <span className="topluluk-karti__simge">
            {topluluk.logo_url ? (
              <img src={topluluk.logo_url} alt={`${topluluk.name} logosu`} />
            ) : (
              "◎"
            )}
          </span>
          <div>
            <strong>{topluluk.name}</strong>
            <p>{topluluk.description}</p>
            <small>
              Kurucu: {kurucu?.full_name || "Öğrenci"} · {uyeler.length} üye
            </small>
          </div>
        </button>
        <button
          className={uye ? "topluluk-uyelik aktif" : "topluluk-uyelik"}
          type="button"
          onClick={() => void uyelikDegistir(topluluk)}
        >
          {uye?.role === "founder" ? "Kurucusun" : uye ? "Katıldın" : "Katıl"}
        </button>
      </article>
    );
  };

  const sayfaBasligi = seciliToplulukBilgisi
    ? seciliToplulukBilgisi.name
    : sekme === "profil" && seciliProfilId && goruntulenenProfil
      ? goruntulenenProfil.full_name
    : sekme === "anasayfa"
      ? "Ana Sayfa"
      : sekme === "takip"
        ? "Takip Ettiklerim"
      : sekme === "arastir"
          ? "Araştır"
          : sekme === "bildirimler"
            ? "Bildirimler"
          : sekme === "raporlar"
            ? "Şikâyet Merkezi"
          : sekme === "topluluklar"
            ? "Topluluklar"
            : "Profilim";

  return (
    <div className="kampus-uygulamasi">
      {bildirim && <div className="akis-bildirimi">{bildirim}</div>}

      {raporHedefi && (
        <div className="rapor-overlay" role="presentation">
          <form
            className="rapor-paneli"
            onSubmit={(event) => void raporuGonder(event)}
          >
            <div className="rapor-paneli__ust">
              <div>
                <span>GÜVENLİ TOPLULUK</span>
                <h2>İçeriği şikâyet et</h2>
              </div>
              <button
                type="button"
                aria-label="Şikâyet penceresini kapat"
                onClick={() => setRaporHedefi(null)}
              >
                ×
              </button>
            </div>
            <p>
              Bildirimin yalnızca yetkili moderatörler tarafından incelenir.
              Acil bir tehlike varsa ilgili resmî makamlara başvur.
            </p>
            <label>
              <span>Şikâyet nedeni</span>
              <select
                value={raporNedeni}
                onChange={(event) =>
                  setRaporNedeni(event.target.value as IcerikRaporu["reason"])
                }
              >
                {raporNedenleri.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.ad}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Açıklama (isteğe bağlı)</span>
              <textarea
                value={raporDetayi}
                maxLength={1000}
                placeholder="İncelemeyi kolaylaştıracak kısa bir açıklama yaz..."
                onChange={(event) => setRaporDetayi(event.target.value)}
              />
            </label>
            <div className="rapor-paneli__alt">
              <button type="button" onClick={() => setRaporHedefi(null)}>
                Vazgeç
              </button>
              <button type="submit" disabled={raporGonderiliyor}>
                {raporGonderiliyor ? "Gönderiliyor..." : "Şikâyeti gönder"}
              </button>
            </div>
          </form>
        </div>
      )}

      <aside className="sol-menu">
        <button className="uygulama-markasi" type="button" onClick={() => sekmeyeGit("anasayfa")}>
          <span>K</span>
          <strong>KampüsHafıza</strong>
        </button>

        <nav aria-label="Uygulama menüsü">
          <button className={sekme === "anasayfa" && !seciliTopluluk ? "aktif" : ""} type="button" onClick={() => sekmeyeGit("anasayfa")}>
            <span>⌂</span> Ana Sayfa
          </button>
          <button className={sekme === "takip" ? "aktif" : ""} type="button" onClick={() => sekmeyeGit("takip")}>
            <span>◉</span> Takip Ettiklerim
          </button>
          <button className={sekme === "arastir" ? "aktif" : ""} type="button" onClick={() => sekmeyeGit("arastir")}>
            <span>⌕</span> Araştır
          </button>
          <button className={sekme === "bildirimler" ? "aktif" : ""} type="button" onClick={() => sekmeyeGit("bildirimler")}>
            <span className="menu-bildirim-simgesi">
              ♧
              {okunmamisBildirimSayisi > 0 && <b>{Math.min(okunmamisBildirimSayisi, 99)}</b>}
            </span>
            Bildirimler
          </button>
          {moderatorMu && (
            <button className={sekme === "raporlar" ? "aktif" : ""} type="button" onClick={() => sekmeyeGit("raporlar")}>
              <span className="menu-bildirim-simgesi">
                ⚑
                {bekleyenRaporSayisi > 0 && <b>{Math.min(bekleyenRaporSayisi, 99)}</b>}
              </span>
              Şikâyetler
            </button>
          )}
          <button className={sekme === "topluluklar" ? "aktif" : ""} type="button" onClick={() => sekmeyeGit("topluluklar")}>
            <span>◎</span> Topluluklar
          </button>
          <button className={sekme === "profil" ? "aktif" : ""} type="button" onClick={() => sekmeyeGit("profil")}>
            <span>♙</span> Profilim
          </button>
        </nav>

        <button className="sol-menu__paylas" type="button" onClick={() => {
          sekmeyeGit("anasayfa");
          window.setTimeout(() => document.getElementById("gonderi-olustur")?.focus(), 350);
        }}>
          Bilgi paylaş
        </button>

        <button
          className="sol-menu__hukuk"
          type="button"
          onClick={hukukiMetinleriAc}
        >
          ◇ Gizlilik ve koşullar
        </button>

        <div className="sol-menu__profil">
          <span>{avatarIcerigi(profil)}</span>
          <div>
            <strong>{profil.full_name}</strong>
            <small>{rolAdi(profil)} · S{profil.level}</small>
          </div>
          <button type="button" aria-label="Çıkış yap" onClick={() => void cikisYap()}>↪</button>
        </div>
      </aside>

      <main className="akis-merkezi">
        <header className="akis-basligi">
          {(seciliToplulukBilgisi || seciliProfilId) && (
            <button
              type="button"
              aria-label="Geri dön"
              onClick={() => {
                if (seciliToplulukBilgisi) setSeciliTopluluk(null);
                else sekmeyeGit("anasayfa");
              }}
            >
              ←
            </button>
          )}
          <div>
            <h1>{sayfaBasligi}</h1>
            <span>{yenileniyor ? "Canlı akış yenileniyor..." : "Canlı kampüs ağı"}</span>
          </div>
        </header>

        {sekme === "profil" &&
        seciliProfilId &&
        seciliProfilId !== kullanici.id &&
        goruntulenenProfil ? (
          <>
            <section className="kullanici-profil-kapagi">
              <div
                className="kullanici-profil-kapagi__ust"
                style={
                  goruntulenenProfil.cover_url
                    ? {
                        backgroundImage: `linear-gradient(rgba(7, 17, 29, 0.18), rgba(7, 17, 29, 0.5)), url("${goruntulenenProfil.cover_url}")`,
                      }
                    : undefined
                }
              />
              <div className="kullanici-profil-kapagi__icerik">
                <span className="kullanici-profil-avatar">
                  {avatarIcerigi(goruntulenenProfil)}
                </span>
                <button
                  type="button"
                  onClick={() => void takipDegistir(goruntulenenProfil.id)}
                >
                  {takipEttigimIdler.has(goruntulenenProfil.id)
                    ? "✓ Takip ediyorsun"
                    : "+ Takip et"}
                </button>
                <button
                  className="profil-rapor-butonu"
                  type="button"
                  onClick={() =>
                    setRaporHedefi({
                      target_type: "profile",
                      profile_id: goruntulenenProfil.id,
                    })
                  }
                >
                  Profili şikâyet et
                </button>
                <div>
                  <h2>{goruntulenenProfil.full_name}</h2>
                  <span className={`rol-rozeti rol-rozeti--${goruntulenenProfil.role}`}>
                    {rolAdi(goruntulenenProfil)}
                  </span>
                  <p>
                    {goruntulenenProfil.faculty || "Manisa Celal Bayar Üniversitesi"}
                    {goruntulenenProfil.department
                      ? ` · ${goruntulenenProfil.department}`
                      : ""}
                  </p>
                </div>
                <div className="kullanici-profil-istatistikleri">
                  <div><strong>{goruntulenenGonderiSayisi}</strong><span>Gönderi</span></div>
                  <div><strong>{goruntulenenTakipciSayisi}</strong><span>Takipçi</span></div>
                  <div><strong>{goruntulenenTakipSayisi}</strong><span>Takip edilen</span></div>
                  <div><strong>{goruntulenenProfil.xp}</strong><span>XP</span></div>
                </div>
                <div className="kullanici-profil-alanlari">
                  {goruntulenenProfil.expertise_areas.map((alan) => (
                    <span key={alan}>{alan}</span>
                  ))}
                </div>
              </div>
            </section>
            <div className="profil-gonderileri-baslik">Paylaşımlar</div>
            <section className="gonderi-listesi">
              {gorunurGonderiler.length > 0 ? (
                gorunurGonderiler.map(gonderiKarti)
              ) : (
                <div className="bos-durum">
                  <strong>Henüz bir paylaşımı yok.</strong>
                  <span>Yeni katkıları burada görünecek.</span>
                </div>
              )}
            </section>
          </>
        ) : sekme === "profil" ? (
          <div className="akis-profil-sarmalayici">
            <section
              className="profil-medya-paneli"
              style={
                profil.cover_url
                  ? {
                      backgroundImage: `linear-gradient(rgba(7, 17, 29, 0.35), rgba(7, 17, 29, 0.8)), url("${profil.cover_url}")`,
                    }
                  : undefined
              }
            >
              <span className="profil-medya-avatar">
                {avatarIcerigi(profil)}
              </span>
              <div>
                <strong>Profil görsellerin</strong>
                <small>JPG, PNG veya WebP · En fazla 3 MB</small>
              </div>
              <div className="profil-medya-butonlari">
                <label>
                  {medyaYukleniyor === "avatar"
                    ? "Yükleniyor..."
                    : "Profil fotoğrafını değiştir"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={Boolean(medyaYukleniyor)}
                    onChange={(event) => {
                      const dosya = event.currentTarget.files?.[0];
                      if (dosya) void medyaYukle(dosya, "avatar");
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {profil.avatar_url && (
                  <button
                    className="medya-kaldir-butonu"
                    type="button"
                    disabled={Boolean(medyaYukleniyor)}
                    onClick={() => void medyayiKaldir("avatar")}
                  >
                    Profil fotoğrafını kaldır
                  </button>
                )}
                <label>
                  {medyaYukleniyor === "cover"
                    ? "Yükleniyor..."
                    : "Kapak fotoğrafını değiştir"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={Boolean(medyaYukleniyor)}
                    onChange={(event) => {
                      const dosya = event.currentTarget.files?.[0];
                      if (dosya) void medyaYukle(dosya, "cover");
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {profil.cover_url && (
                  <button
                    className="medya-kaldir-butonu"
                    type="button"
                    disabled={Boolean(medyaYukleniyor)}
                    onClick={() => void medyayiKaldir("cover")}
                  >
                    Kapak fotoğrafını kaldır
                  </button>
                )}
              </div>
            </section>
            <OgrenciPaneli
              kullanici={kullanici}
              profil={profil}
              testeBasla={testeBasla}
              yetkileriYonet={yetkileriYonet}
              ilgiAlanlariniDuzenle={ilgiAlanlariniDuzenle}
            />
            <section className="hesap-guvenligi">
              <div>
                <span>HESAP VE VERİLER</span>
                <h2>Hesabını kalıcı olarak sil</h2>
                <p>
                  Profilin, gönderilerin, yorumların, kurduğun topluluklar ve
                  yüklediğin görseller silinir. Bu işlem geri alınamaz.
                </p>
              </div>
              <label>
                <span>Onaylamak için HESABIMI SİL yaz</span>
                <input
                  value={hesapSilmeMetni}
                  placeholder="HESABIMI SİL"
                  onChange={(event) => setHesapSilmeMetni(event.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={
                  hesapSilmeMetni !== "HESABIMI SİL" || hesapSiliniyor
                }
                onClick={() => void hesabimiSil()}
              >
                {hesapSiliniyor ? "Hesap siliniyor..." : "Hesabımı kalıcı sil"}
              </button>
            </section>
          </div>
        ) : (
          <>
            {sekme === "bildirimler" && (
              <section className="bildirim-merkezi">
                <div className="bildirim-merkezi__ust">
                  <div>
                    <strong>Bildirimlerin</strong>
                    <span>{okunmamisBildirimSayisi} okunmamış bildirim</span>
                  </div>
                  {okunmamisBildirimSayisi > 0 && (
                    <button type="button" onClick={() => void tumBildirimleriOku()}>
                      Tümünü okundu yap
                    </button>
                  )}
                </div>

                {veriler.bildirimler.length > 0 ? (
                  <div className="bildirim-listesi">
                    {veriler.bildirimler.map((item) => {
                      const bilgi = bildirimBilgisi(item);
                      return (
                        <button
                          className={item.read_at ? "bildirim-satiri" : "bildirim-satiri bildirim-satiri--yeni"}
                          type="button"
                          key={item.id}
                          onClick={() => void bildirimiOku(item)}
                        >
                          <span className="bildirim-satiri__simge">{bilgi.simge}</span>
                          <div>
                            <strong>{bilgi.metin}</strong>
                            <small>{tarihYaz(item.created_at)}</small>
                          </div>
                          {!item.read_at && <i aria-label="Okunmamış" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bos-durum">
                    <strong>Henüz bildirimin yok.</strong>
                    <span>Yeni etkileşimler burada gerçek zamanlı görünecek.</span>
                  </div>
                )}
              </section>
            )}

            {sekme === "raporlar" && moderatorMu && (
              <section className="rapor-merkezi">
                <div className="rapor-merkezi__ust">
                  <div>
                    <span>MODERASYON</span>
                    <h2>Topluluk şikâyetleri</h2>
                  </div>
                  <strong>{bekleyenRaporSayisi} açık rapor</strong>
                </div>

                {veriler.raporlar.length > 0 ? (
                  <div className="rapor-listesi">
                    {veriler.raporlar.map((rapor) => {
                      const bildiren = profilHaritasi.get(rapor.reporter_id);
                      return (
                        <article className={`rapor-karti rapor-karti--${rapor.status}`} key={rapor.id}>
                          <div className="rapor-karti__ust">
                            <div>
                              <strong>{raporNedeniAdi(rapor.reason)}</strong>
                              <span>
                                {rapor.target_type === "post"
                                  ? "Gönderi"
                                  : rapor.target_type === "comment"
                                    ? "Yorum"
                                    : rapor.target_type === "community"
                                      ? "Topluluk"
                                      : "Profil"}
                              </span>
                            </div>
                            <small>{tarihYaz(rapor.created_at)}</small>
                          </div>
                          <p>{rapor.details || "Ek açıklama verilmedi."}</p>
                          <small>
                            Bildiren: {bildiren?.full_name || "Öğrenci"} · Durum: {rapor.status}
                          </small>
                          {(rapor.status === "pending" || rapor.status === "reviewed") && (
                            <div className="rapor-karti__aksiyonlar">
                              <button
                                type="button"
                                onClick={() => void raporuSonuclandir(rapor.id, "resolved")}
                              >
                                İşlem yapıldı
                              </button>
                              <button
                                type="button"
                                onClick={() => void raporuSonuclandir(rapor.id, "rejected")}
                              >
                                İhlal yok
                              </button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bos-durum">
                    <strong>Henüz şikâyet yok.</strong>
                    <span>Yeni raporlar yalnızca yetkili kişilere burada görünür.</span>
                  </div>
                )}
              </section>
            )}

            {sekme === "arastir" && (
              <section className="arama-paneli">
                <span>⌕</span>
                <input
                  autoFocus
                  value={arama}
                  onChange={(event) => setArama(event.target.value)}
                  placeholder="Bilgi, bölüm, kişi, etiket veya topluluk ara..."
                />
              </section>
            )}

            {sekme === "topluluklar" && !seciliTopluluk && (
              <section className="topluluklar-paneli">
                <div className="bolum-basligi">
                  <div>
                    <span>ÖĞRENCİ TOPLULUKLARI</span>
                    <h2>Birlikte öğren, birlikte paylaş</h2>
                  </div>
                  <button type="button" onClick={() => setToplulukFormuAcik((acik) => !acik)}>
                    + Topluluk kur
                  </button>
                </div>

                {toplulukFormuAcik && (
                  <form className="topluluk-formu" onSubmit={(event) => void toplulukOlustur(event)}>
                    <input value={toplulukAdi} onChange={(event) => setToplulukAdi(event.target.value)} minLength={3} maxLength={60} placeholder="Topluluğun adı" required />
                    <textarea value={toplulukAciklamasi} onChange={(event) => setToplulukAciklamasi(event.target.value)} maxLength={500} placeholder="Bu topluluk ne için var?" required />
                    <input value={toplulukBolumu} onChange={(event) => setToplulukBolumu(event.target.value)} placeholder="Bölüm veya alan (isteğe bağlı)" />
                    <button type="submit">Topluluğu oluştur</button>
                  </form>
                )}

                <div className="topluluk-listesi">
                  {veriler.topluluklar.length > 0 ? veriler.topluluklar.map(toplulukKarti) : (
                    <div className="bos-durum"><strong>Henüz topluluk yok.</strong><span>İlk topluluğu sen kurabilirsin.</span></div>
                  )}
                </div>
              </section>
            )}

            {seciliToplulukBilgisi && (
              <section className="topluluk-kapak">
                <div className="topluluk-kapak__simge">
                  {seciliToplulukBilgisi.logo_url ? (
                    <img
                      src={seciliToplulukBilgisi.logo_url}
                      alt={`${seciliToplulukBilgisi.name} logosu`}
                    />
                  ) : (
                    "◎"
                  )}
                </div>
                <div>
                  <span>{seciliToplulukBilgisi.department || "Tüm kampüs"}</span>
                  <h2>{seciliToplulukBilgisi.name}</h2>
                  <p>{seciliToplulukBilgisi.description}</p>
                  <small>
                    {veriler.uyelikler.filter((item) => item.community_id === seciliToplulukBilgisi.id).length} üye · Kurucu {profilHaritasi.get(seciliToplulukBilgisi.founder_id)?.full_name || "Öğrenci"}
                  </small>
                </div>
                <div className="topluluk-kapak__aksiyonlar">
                  {seciliToplulukBilgisi.founder_id === kullanici.id && (
                    <label>
                      {medyaYukleniyor === "community"
                        ? "Yükleniyor..."
                        : "Logo değiştir"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={Boolean(medyaYukleniyor)}
                        onChange={(event) => {
                          const dosya = event.currentTarget.files?.[0];
                          if (dosya) {
                            void medyaYukle(
                              dosya,
                              "community",
                              seciliToplulukBilgisi,
                            );
                          }
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  )}
                  {seciliToplulukBilgisi.founder_id === kullanici.id &&
                    seciliToplulukBilgisi.logo_url && (
                      <button
                        className="medya-kaldir-butonu"
                        type="button"
                        disabled={Boolean(medyaYukleniyor)}
                        onClick={() =>
                          void medyayiKaldir(
                            "community",
                            seciliToplulukBilgisi,
                          )
                        }
                      >
                        Logoyu kaldır
                      </button>
                    )}
                  <button type="button" onClick={() => void uyelikDegistir(seciliToplulukBilgisi)}>
                    {veriler.uyelikler.some((item) => item.community_id === seciliToplulukBilgisi.id && item.user_id === kullanici.id) ? "Üyesin" : "Topluluğa katıl"}
                  </button>
                  {seciliToplulukBilgisi.founder_id !== kullanici.id && (
                    <button
                      type="button"
                      onClick={() =>
                        setRaporHedefi({
                          target_type: "community",
                          community_id: seciliToplulukBilgisi.id,
                        })
                      }
                    >
                      Şikâyet et
                    </button>
                  )}
                  {(seciliToplulukBilgisi.founder_id === kullanici.id ||
                    profil.role === "moderator" ||
                    profil.role === "founder") && (
                    <button
                      className="topluluk-sil-butonu"
                      type="button"
                      onClick={() => void topluluguSil(seciliToplulukBilgisi)}
                    >
                      Topluluğu sil
                    </button>
                  )}
                </div>
              </section>
            )}

            {(sekme === "anasayfa" || sekme === "takip" || seciliTopluluk) && (
              <form className="gonderi-olusturucu" onSubmit={(event) => void gonderiPaylas(event)}>
                <span className="akis-avatar">{avatarIcerigi(profil)}</span>
                <div>
                  <textarea
                    id="gonderi-olustur"
                    value={gonderiMetni}
                    onChange={(event) => setGonderiMetni(event.target.value)}
                    maxLength={2000}
                    placeholder={seciliToplulukBilgisi ? `${seciliToplulukBilgisi.name} topluluğuna ne paylaşacaksın?` : "Kampüse ne öğretmek istersin? Bir deneyim, soru veya kaynak paylaş..."}
                  />
                  <div className="gonderi-ayarlari">
                    <select value={kategori} onChange={(event) => setKategori(event.target.value)} aria-label="Gönderi kategorisi">
                      {kategoriler.map((item) => <option key={item}>{item}</option>)}
                    </select>
                    <input value={bolum} onChange={(event) => setBolum(event.target.value)} placeholder="Bölüm" />
                    <input value={etiketMetni} onChange={(event) => setEtiketMetni(event.target.value)} placeholder="Etiketler: react, staj" />
                    <select value={hedefTopluluk} onChange={(event) => setHedefTopluluk(event.target.value)} aria-label="Paylaşım hedefi">
                      <option value="">Herkese açık</option>
                      {uyeOldugumTopluluklar.map((topluluk) => <option value={topluluk.id} key={topluluk.id}>{topluluk.name}</option>)}
                    </select>
                  </div>
                  <div className="gonderi-olusturucu__alt">
                    <span>{gonderiMetni.length}/2000</span>
                    <button type="submit" disabled={!gonderiMetni.trim() || paylasiliyor}>
                      {paylasiliyor ? "Paylaşılıyor..." : "Paylaş"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {sekme === "arastir" && arama.trim() && (toplulukAramaSonuclari.length > 0 || kisiAramaSonuclari.length > 0) && (
              <section className="arama-ek-sonuclari">
                {kisiAramaSonuclari.map((kisi) => (
                  <div className="kisi-sonucu" key={kisi.id}>
                    <span>{avatarIcerigi(kisi)}</span>
                    <div>
                      <button className="kisi-profili-buton" type="button" onClick={() => profiliAc(kisi.id)}>{kisi.full_name}</button>
                      <small>{kisi.department || rolAdi(kisi)}</small>
                    </div>
                    <button type="button" onClick={() => void takipDegistir(kisi.id)}>{takipEttigimIdler.has(kisi.id) ? "Takipte" : "Takip et"}</button>
                  </div>
                ))}
                {toplulukAramaSonuclari.map(toplulukKarti)}
              </section>
            )}

            {hata && <div className="akis-hatasi">{hata}</div>}
            {yukleniyor ? (
              <div className="akis-yukleniyor">Kampüs bilgileri yükleniyor...</div>
            ) : (["anasayfa", "takip", "arastir"].includes(sekme) || Boolean(seciliTopluluk)) && (
              <section className="gonderi-listesi">
                {gorunurGonderiler.length > 0 ? gorunurGonderiler.map(gonderiKarti) : (
                  <div className="bos-durum">
                    <strong>{sekme === "takip" ? "Takip akışın henüz sessiz." : "Burada henüz bir paylaşım yok."}</strong>
                    <span>{sekme === "takip" ? "Öğrencileri takip ettiğinde paylaşımları burada görünür." : "İlk faydalı bilgiyi sen paylaşabilirsin."}</span>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      <aside className="sag-panel">
        <label className="hizli-arama">
          <span>⌕</span>
          <input value={arama} onChange={(event) => setArama(event.target.value)} onFocus={() => sekmeyeGit("arastir")} placeholder="KampüsHafıza'da ara" />
        </label>

        <section className="yan-kart">
          <div className="yan-kart__baslik"><strong>Canlı ağ</strong><span className="canli-nokta" /></div>
          <div className="canli-sayilar">
            <div><strong>{veriler.gonderiler.filter((item) => item.moderation_status === "approved").length}</strong><span>Paylaşım</span></div>
            <div><strong>{veriler.topluluklar.length}</strong><span>Topluluk</span></div>
            <div><strong>{veriler.profiller.length}</strong><span>Öğrenci</span></div>
          </div>
        </section>

        <section className="yan-kart">
          <div className="yan-kart__baslik"><strong>Kimi takip etmeli?</strong></div>
          {takipOnerileri.length > 0 ? takipOnerileri.map((kisi) => (
            <div className="takip-onerisi" key={kisi.id}>
              <span>{avatarIcerigi(kisi)}</span>
              <div>
                <button className="kisi-profili-buton" type="button" onClick={() => profiliAc(kisi.id)}>{kisi.full_name}</button>
                <small>{kisi.department || rolAdi(kisi)}</small>
              </div>
              <button type="button" onClick={() => void takipDegistir(kisi.id)}>Takip et</button>
            </div>
          )) : <p className="yan-kart__bos">Şimdilik yeni bir öneri yok.</p>}
        </section>

        <section className="yan-kart">
          <div className="yan-kart__baslik"><strong>Toplulukları keşfet</strong></div>
          {veriler.topluluklar.slice(0, 3).map((topluluk) => (
            <button className="yan-topluluk" type="button" key={topluluk.id} onClick={() => topluluguAc(topluluk.id)}>
              <span>
                {topluluk.logo_url ? (
                  <img src={topluluk.logo_url} alt="" />
                ) : (
                  "◎"
                )}
              </span><div><strong>{topluluk.name}</strong><small>{veriler.uyelikler.filter((item) => item.community_id === topluluk.id).length} üye</small></div>
            </button>
          ))}
          {veriler.topluluklar.length === 0 && <p className="yan-kart__bos">İlk topluluk kurulmayı bekliyor.</p>}
        </section>
      </aside>

      <nav className="mobil-menu" aria-label="Mobil uygulama menüsü">
        <button className={sekme === "anasayfa" ? "aktif" : ""} type="button" onClick={() => sekmeyeGit("anasayfa")}><span>⌂</span><small>Ana Sayfa</small></button>
        <button className={sekme === "takip" ? "aktif" : ""} type="button" onClick={() => sekmeyeGit("takip")}><span>◉</span><small>Takip</small></button>
        <button className="mobil-paylas" type="button" onClick={() => sekmeyeGit("anasayfa")}>+</button>
        <button className={sekme === "arastir" ? "aktif" : ""} type="button" onClick={() => sekmeyeGit("arastir")}><span>⌕</span><small>Araştır</small></button>
        <button className={sekme === "bildirimler" ? "aktif" : ""} type="button" onClick={() => sekmeyeGit("bildirimler")}><span className="mobil-bildirim-simgesi">♧{okunmamisBildirimSayisi > 0 && <b>{Math.min(okunmamisBildirimSayisi, 9)}</b>}</span><small>Bildirim</small></button>
        <button className={sekme === "topluluklar" ? "aktif" : ""} type="button" onClick={() => sekmeyeGit("topluluklar")}><span>◎</span><small>Topluluk</small></button>
      </nav>
    </div>
  );
}

export default KampusAkisi;
