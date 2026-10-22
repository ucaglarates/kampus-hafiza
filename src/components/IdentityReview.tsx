import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "./ui/primitives";

export default function IdentityReview({ postId }: { postId: string }) {
  const [purpose, setPurpose] = useState("moderation");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [result, setResult] = useState<{
    full_name: string;
    email: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function inspect() {
    if (busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const { data, error } = await supabase.rpc("inspect_post_author", {
        target_post_id: postId,
        access_purpose: purpose,
        access_reason: reason.trim(),
        official_reference:
          purpose === "authority_request" ? reference.trim() : null,
      });
      if (error) setError(error.message);
      else setResult(data);
    } catch {
      setError("Bağlantı kurulamadı. Lütfen tekrar dene.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      className="identity-review"
      onToggle={(event) => {
        if (!event.currentTarget.open) setResult(null);
      }}
    >
      <summary>Kurucu: gerekçeli hesap incelemesi</summary>
      <p>
        Bu işlem anonimliği kaldıran bir özellik değildir. Mevcut gönderinin
        hesap bilgileri açılır ve inceleme gerekçesi kaydedilir. Resmî referans
        yazılması, talebin geçerliliğini otomatik doğrulamaz.
      </p>
      <label>
        İnceleme amacı
        <select
          value={purpose}
          onChange={(event) => {
            setPurpose(event.target.value);
            setResult(null);
          }}
        >
          <option value="moderation">
            Güvenlik / somut şikâyet incelemesi
          </option>
          <option value="authority_request">
            Yetkili makamın resmî talebi
          </option>
        </select>
      </label>
      {purpose === "authority_request" && (
        <label>
          Kurum ve evrak referansı
          <input
            maxLength={200}
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Kurum, tarih ve evrak numarası"
          />
        </label>
      )}
      <label>
        İnceleme gerekçesi
        <textarea
          minLength={10}
          maxLength={1000}
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Somut ihtiyacı ve inceleme kapsamını açıkla."
        />
      </label>
      <Button
        variant="outline"
        disabled={
          busy ||
          reason.trim().length < 10 ||
          (purpose === "authority_request" && reference.trim().length < 3)
        }
        onClick={() => void inspect()}
      >
        {busy ? "Kaydediliyor…" : "Erişimi kaydet ve hesap bilgisini göster"}
      </Button>
      {error && (
        <p role="alert" className="report-error">
          {error}
        </p>
      )}
      {result && (
        <div className="report-result" role="status">
          <p>
            <strong>Ad soyad:</strong> {result.full_name}
          </p>
          <p>
            <strong>E-posta:</strong> {result.email}
          </p>
          <Button variant="ghost" onClick={() => setResult(null)}>
            Bilgileri gizle
          </Button>
        </div>
      )}
    </details>
  );
}
