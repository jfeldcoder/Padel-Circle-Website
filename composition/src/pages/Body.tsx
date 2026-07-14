import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { fetchBodyMetrics, upsertBodyMetric } from "../lib/db";
import { PHOTO_BUCKET, supabase } from "../lib/supabase";
import { compressImage } from "../lib/image";
import { localDate, shortDate } from "../lib/dates";
import { movingAverage } from "../lib/insights";
import type { BodyMetric } from "../lib/types";
import Sheet from "../components/Sheet";

interface PhotoEntry {
  metric: BodyMetric;
  url: string;
}

export default function Body() {
  const user = useUser();
  const toast = useToast();
  const today = localDate();

  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [weight, setWeight] = useState("");
  const [bf, setBf] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [viewer, setViewer] = useState<PhotoEntry | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSel, setCompareSel] = useState<PhotoEntry[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const m = await fetchBodyMetrics(user.id);
    setMetrics(m);
    const todayMetric = m.find((x) => x.logged_date === today);
    if (todayMetric) {
      setWeight(todayMetric.weight_kg ? String(todayMetric.weight_kg) : "");
      setBf(todayMetric.body_fat_pct ? String(todayMetric.body_fat_pct) : "");
    }
    // Signed URLs for the photo timeline (private bucket).
    const withPhotos = m.filter((x) => x.photo_path);
    if (withPhotos.length > 0) {
      const { data } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrls(withPhotos.map((x) => x.photo_path!), 3600);
      const urls = (data ?? [])
        .map((d, i) => ({ metric: withPhotos[i], url: d.signedUrl }))
        .filter((p): p is PhotoEntry => typeof p.url === "string" && p.url.length > 0);
      setPhotos(urls.reverse()); // newest first
    } else {
      setPhotos([]);
    }
  }, [user.id, today]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveMetrics = async () => {
    if (saving) return;
    const w = parseFloat(weight);
    const b = parseFloat(bf);
    setSaving(true);
    try {
      await upsertBodyMetric(user.id, {
        logged_date: today,
        weight_kg: Number.isFinite(w) ? w : null,
        body_fat_pct: Number.isFinite(b) ? b : null,
      });
      await load();
      toast("Saved");
    } catch {
      toast("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const path = `${user.id}/${today}-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw new Error(error.message);
      await upsertBodyMetric(user.id, { logged_date: today, photo_path: path });
      await load();
      toast("Photo added");
    } catch {
      toast("Couldn't upload photo — try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const weightSeries = useMemo(
    () =>
      metrics
        .filter((m) => m.weight_kg)
        .map((m) => ({ date: m.logged_date, value: m.weight_kg! })),
    [metrics]
  );
  const bfSeries = useMemo(
    () =>
      metrics
        .filter((m) => m.body_fat_pct)
        .map((m) => ({ date: m.logged_date, value: m.body_fat_pct! })),
    [metrics]
  );
  const weightMA = movingAverage(weightSeries).at(-1)?.value ?? null;
  const bfMA = movingAverage(bfSeries).at(-1)?.value ?? null;

  const toggleCompare = (p: PhotoEntry) => {
    setCompareSel((sel) => {
      if (sel.some((s) => s.metric.id === p.metric.id)) {
        return sel.filter((s) => s.metric.id !== p.metric.id);
      }
      return sel.length >= 2 ? [sel[1], p] : [...sel, p];
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-medium">Body</h1>

      <section className="card p-5 space-y-4">
        <span className="label">Today's entry</span>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="label block mb-1.5">Weight (kg)</span>
            <input
              className="field"
              inputMode="decimal"
              placeholder="—"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </label>
          <label>
            <span className="label block mb-1.5">Body fat (%)</span>
            <input
              className="field"
              inputMode="decimal"
              placeholder="—"
              value={bf}
              onChange={(e) => setBf(e.target.value)}
            />
          </label>
        </div>
        <button className="btn-primary" onClick={saveMetrics} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadPhoto(f);
          }}
        />
        <button
          className="btn-ghost"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : "Add progress photo"}
        </button>
      </section>

      {(weightMA !== null || bfMA !== null) && (
        <section className="card px-5 py-4 flex justify-between">
          <div>
            <div className="stat text-2xl">{weightMA ?? "—"}</div>
            <div className="label mt-0.5">7-day avg weight</div>
          </div>
          <div className="text-right">
            <div className="stat text-2xl">{bfMA ?? "—"}</div>
            <div className="label mt-0.5">7-day avg body fat</div>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="label">Photo timeline</span>
          {photos.length >= 2 && (
            <button
              className={`text-sm font-medium ${compareMode ? "text-over" : "text-accent"}`}
              onClick={() => {
                setCompareMode(!compareMode);
                setCompareSel([]);
              }}
            >
              {compareMode ? "Cancel" : "Compare"}
            </button>
          )}
        </div>
        {photos.length === 0 ? (
          <div className="card px-6 py-10 text-center">
            <p className="text-muted text-sm">No photos yet — add your first above.</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6">
            {photos.map((p) => {
              const selected = compareSel.some((s) => s.metric.id === p.metric.id);
              return (
                <button
                  key={p.metric.id}
                  className="shrink-0"
                  onClick={() => (compareMode ? toggleCompare(p) : setViewer(p))}
                >
                  <div
                    className={`w-24 h-32 rounded-xl overflow-hidden border ${
                      selected ? "border-accent border-2" : "border-line"
                    }`}
                  >
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="label block mt-1.5 text-center">
                    {shortDate(p.metric.logged_date)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {compareMode && compareSel.length === 2 && (
          <div className="grid grid-cols-2 gap-3">
            {[...compareSel]
              .sort((a, b) => a.metric.logged_date.localeCompare(b.metric.logged_date))
              .map((p) => (
                <figure key={p.metric.id}>
                  <div className="rounded-card overflow-hidden border border-line">
                    <img src={p.url} alt="" className="w-full object-cover" />
                  </div>
                  <figcaption className="label text-center mt-2">
                    {shortDate(p.metric.logged_date)}
                    {p.metric.weight_kg ? ` · ${p.metric.weight_kg} kg` : ""}
                    {p.metric.body_fat_pct ? ` · ${p.metric.body_fat_pct}%` : ""}
                  </figcaption>
                </figure>
              ))}
          </div>
        )}
      </section>

      <Sheet
        open={viewer !== null}
        onClose={() => setViewer(null)}
        title={viewer ? shortDate(viewer.metric.logged_date) : ""}
      >
        {viewer && (
          <div>
            <img src={viewer.url} alt="" className="w-full rounded-card" />
            <p className="label text-center mt-3">
              {viewer.metric.weight_kg ? `${viewer.metric.weight_kg} kg` : ""}
              {viewer.metric.weight_kg && viewer.metric.body_fat_pct ? " · " : ""}
              {viewer.metric.body_fat_pct ? `${viewer.metric.body_fat_pct}% body fat` : ""}
            </p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
