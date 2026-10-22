import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { IcerikRaporu } from "../types/sosyal";
import { Button, Badge, Icon } from "./ui/primitives";
import "./ReportCenter.css";
import IdentityReview from "./IdentityReview";

const statuses = {
  pending: "Alındı",
  reviewed: "İnceleniyor",
  resolved: "Sonuçlandı",
  rejected: "İhlal bulunamadı",
};
const reasons = {
  spam: "Spam",
  harassment: "Taciz / zorbalık",
  copyright: "Telif hakkı",
  privacy: "Gizlilik",
  misinformation: "Yanlış bilgi",
  other: "Diğer",
};
const targets = {
  post: "Gönderi",
  comment: "Yorum",
  community: "Topluluk",
  profile: "Profil",
};
type ReportEvent = {
  id: string;
  report_id: string;
  status: IcerikRaporu["status"];
  note: string;
  action_taken: string;
  created_at: string;
};
type Props = {
  reports: IcerikRaporu[];
  canModerate: boolean;
  isFounder: boolean;
  onRefresh: () => Promise<void>;
  selectedReportId: string | null;
};
const dateLabel = (value: string) => new Date(value).toLocaleString("tr-TR");

export default function ReportCenter({
  reports,
  canModerate,
  isFounder,
  onRefresh,
  selectedReportId,
}: Props) {
  const [events, setEvents] = useState<ReportEvent[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from("report_events")
        .select("*")
        .order("created_at");
      if (!active) return;
      setHistoryError(
        error ? "İşlem geçmişi yüklenemedi. Tekrar yenileyebilirsin." : "",
      );
      if (!error) setEvents((data ?? []) as ReportEvent[]);
    })();
    return () => {
      active = false;
    };
  }, [reports]);
  useEffect(() => {
    if (selectedReportId) {
      setFilter("all");
      requestAnimationFrame(() =>
        document
          .getElementById(`report-${selectedReportId}`)
          ?.scrollIntoView({ block: "center", behavior: "smooth" }),
      );
    }
  }, [selectedReportId]);
  const review = async (
    report: IcerikRaporu,
    status: "reviewed" | "resolved" | "rejected",
    action = "none",
  ) => {
    if (busy) return;
    const note = (notes[report.id] ?? "").trim();
    if (note.length < 5 || note.length > 1000) {
      setError(
        "Şikâyetçiye iletilecek 5–1000 karakterlik bir işlem açıklaması yaz.",
      );
      return;
    }
    setBusy(report.id);
    setError("");
    try {
      const { error } = await supabase.rpc("review_report", {
        target_report_id: report.id,
        new_status: status,
        reviewer_note: note,
        requested_action: action,
      });
      if (error) {
        setError(error.message);
        return;
      }
      setNotes((previous) => ({ ...previous, [report.id]: "" }));
      await onRefresh();
    } catch {
      setError("Bağlantı kurulamadı. Durumu yenileyip tekrar kontrol et.");
    } finally {
      setBusy(null);
    }
  };
  const shown = reports.filter(
    (report) =>
      filter === "all" ||
      (filter === "open"
        ? ["pending", "reviewed"].includes(report.status)
        : ["resolved", "rejected"].includes(report.status)),
  );
  return (
    <section className="report-center" aria-labelledby="report-heading">
      <header>
        <div>
          <span className="section-kicker">
            {canModerate ? "MODERASYON" : "ŞİKÂYET TAKİBİ"}
          </span>
          <h2 id="report-heading">
            {canModerate ? "Topluluk şikâyetleri" : "Şikâyetlerim"}
          </h2>
          <p>Durum değişikliklerini ve yapılan işlemleri buradan takip et.</p>
        </div>
        <Icon name="flag" />
      </header>
      <div
        className="report-filters"
        role="group"
        aria-label="Şikâyet filtresi"
      >
        {[
          ["all", "Tümü"],
          ["open", "Açık"],
          ["closed", "Sonuçlanan"],
        ].map(([id, label]) => (
          <Button
            key={id}
            variant={filter === id ? "primary" : "outline"}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </Button>
        ))}
        <Button variant="ghost" onClick={() => void onRefresh()}>
          Yenile
        </Button>
      </div>
      {error && (
        <p className="report-error" role="alert">
          {error}
        </p>
      )}
      {historyError && (
        <p className="report-error" role="alert">
          {historyError}
        </p>
      )}
      <div className="report-list">
        {shown.map((report) => (
          <article
            className={`report-item ${selectedReportId === report.id ? "report-item--selected" : ""}`}
            key={report.id}
            id={`report-${report.id}`}
          >
            <div className="report-item__heading">
              <strong>
                {reasons[report.reason]}{" "}
                <small>· {targets[report.target_type]}</small>
              </strong>
              <Badge>{statuses[report.status]}</Badge>
            </div>
            <small className="report-meta">
              Kayıt: {report.id.slice(0, 8)} · {dateLabel(report.created_at)}
            </small>
            <details open>
              <summary>Şikâyet edilen içerik</summary>
              <blockquote>
                {report.content_snapshot ||
                  "Bu eski kaydın içerik kopyası bulunamadı."}
              </blockquote>
              <small className="report-meta">
                Şikâyet alındığında kaydedilen içerik kopyasıdır.
              </small>
            </details>
            <p>
              <strong>Şikâyet açıklaması:</strong>{" "}
              {report.details || "Ek açıklama verilmedi."}
            </p>
            <ol className="report-timeline">
              <li>
                <strong>Şikâyet alındı</strong>
                <time>{dateLabel(report.created_at)}</time>
              </li>
              {events
                .filter((event) => event.report_id === report.id)
                .map((event) => (
                  <li key={event.id}>
                    <strong>{statuses[event.status]}</strong>
                    <p>{event.note}</p>
                    {event.action_taken === "deactivate_post" && (
                      <Badge>Gönderi pasife alındı</Badge>
                    )}
                    <time>{dateLabel(event.created_at)}</time>
                  </li>
                ))}
            </ol>
            {isFounder && report.post_id && (
              <IdentityReview key={report.id} postId={report.post_id} />
            )}
            {report.resolution_note && (
              <p className="report-result">
                <strong>Son işlem:</strong> {report.resolution_note}
              </p>
            )}
            {canModerate && ["pending", "reviewed"].includes(report.status) && (
              <div className="report-review">
                <label htmlFor={`note-${report.id}`}>
                  Şikâyetçiye gönderilecek açıklama
                </label>
                <textarea
                  id={`note-${report.id}`}
                  maxLength={1000}
                  rows={3}
                  value={notes[report.id] ?? ""}
                  onChange={(event) =>
                    setNotes((previous) => ({
                      ...previous,
                      [report.id]: event.target.value,
                    }))
                  }
                  placeholder="İnceleme sonucunu ve yapılan işlemi açıkla."
                  disabled={busy !== null}
                />
                <small className="report-meta">
                  Bu açıklama işlem geçmişinde ve bildirimde görünür. Özel
                  kimlik bilgisi ekleme.
                </small>
                <div className="report-review__actions">
                  {report.status === "pending" && (
                    <Button
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => void review(report, "reviewed")}
                    >
                      İncelemeye al
                    </Button>
                  )}
                  {report.target_type === "post" && (
                    <Button
                      disabled={busy !== null}
                      onClick={() =>
                        void review(report, "resolved", "deactivate_post")
                      }
                    >
                      Gönderiyi pasife al ve sonuçlandır
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() => void review(report, "resolved")}
                  >
                    İşlemi tamamla
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy !== null}
                    onClick={() => void review(report, "rejected")}
                  >
                    İhlal bulunamadı
                  </Button>
                </div>
                {busy === report.id && <p role="status">İşlem kaydediliyor…</p>}
              </div>
            )}
          </article>
        ))}
      </div>
      {shown.length === 0 && (
        <div className="bos-durum">
          <Icon name="flag" />
          <strong>Bu filtrede şikâyet yok.</strong>
          <span>Gönderdiğin şikâyetlerin durumu burada görünecek.</span>
        </div>
      )}
    </section>
  );
}
