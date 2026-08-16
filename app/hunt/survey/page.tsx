"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { distanceMeters } from "@/lib/hunt/spawns";
import {
  appendSample,
  averagePosition,
  fixQuality,
  slugify,
  toSpawnSource,
  GOOD_SPREAD_METERS,
  MAX_SURVEY_ACCURACY_METERS,
  MIN_SAMPLES_FOR_FIX,
  type Capture,
  type Sample,
} from "@/lib/hunt/survey";
import "./survey.css";

/**
 * Spawn survey tool.
 *
 * Walk to a spot, stand still until the readings agree, name it, capture it.
 * Repeat, then paste the generated table into `lib/hunt/spawns.ts`.
 *
 * Everything stays on the phone — captures live in localStorage and nothing is
 * ever posted. That is deliberate: this grants nothing and reveals nothing, so
 * it needs no auth and adds no attack surface. The cost is that clearing the
 * browser loses the work, which is what the JSON backup button is for.
 */

const STORAGE_KEY = "hunt:survey:captures:v1";

const DEFAULTS = {
  radiusMeters: 120,
  capacity: 40,
  openHour: 9,
  closeHour: 18,
};

type GeoState =
  | { status: "idle" }
  | { status: "unsupported" }
  | { status: "insecure" }
  | { status: "watching" }
  | { status: "error"; message: string };

function loadCaptures(): Capture[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Capture[]) : [];
  } catch {
    return [];
  }
}

export default function SurveyPage() {
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const [samples, setSamples] = useState<Sample[]>([]);
  const [recording, setRecording] = useState(false);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [hint, setHint] = useState("");
  const [radius, setRadius] = useState(DEFAULTS.radiusMeters);
  const [capacity, setCapacity] = useState(DEFAULTS.capacity);
  const [openHour, setOpenHour] = useState(DEFAULTS.openHour);
  const [closeHour, setCloseHour] = useState(DEFAULTS.closeHour);

  const watchId = useRef<number | null>(null);

  /* ── Captures persist across the walk ── */

  useEffect(() => {
    setCaptures(loadCaptures());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(captures));
    } catch {
      // Private mode or a full quota. The export button still works.
    }
  }, [captures, loaded]);

  /* ── The GPS stream ── */

  useEffect(() => {
    if (!recording) return;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeo({ status: "unsupported" });
      setRecording(false);
      return;
    }
    // Geolocation is refused outside a secure context, which is the usual
    // reason this page looks broken when opened over plain http on a LAN.
    if (!window.isSecureContext) {
      setGeo({ status: "insecure" });
      setRecording(false);
      return;
    }

    setGeo({ status: "watching" });

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGeo({ status: "watching" });
        setSamples((prev) =>
          appendSample(prev, {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            at: pos.timestamp,
          }),
        );
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Allow it in the browser settings for this site."
            : err.code === err.POSITION_UNAVAILABLE
              ? "No position available. Step outside — indoors the phone often has nothing to work with."
              : err.code === err.TIMEOUT
                ? "Timed out waiting for a fix. Still trying."
                : err.message;
        setGeo({ status: "error", message });
      },
      // maximumAge 0 because a cached fix from wherever the phone was ten
      // minutes ago is exactly what this tool must never record.
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );

    watchId.current = id;
    return () => {
      navigator.geolocation.clearWatch(id);
      watchId.current = null;
    };
  }, [recording]);

  const fix = useMemo(() => averagePosition(samples), [samples]);
  const quality = fixQuality(fix);
  const latest = samples.length > 0 ? samples[samples.length - 1] : null;

  const startHere = useCallback(() => {
    setSamples([]);
    setRecording(true);
  }, []);

  const capture = useCallback(() => {
    if (!fix || !name.trim()) return;

    const id = slugify(name);
    const entry: Capture = {
      id,
      name: name.trim(),
      hint: hint.trim() || "TODO: write the riddle for this spot.",
      lat: fix.lat,
      lon: fix.lon,
      radiusMeters: radius,
      activeHours: [openHour, closeHour],
      capacity,
      surveyedAt: new Date().toISOString(),
      samples: fix.samples,
      spreadMeters: fix.spreadMeters,
      bestAccuracyMeters: fix.bestAccuracyMeters,
    };

    // Same id replaces — re-surveying a spot should correct it, not duplicate it.
    setCaptures((prev) => [...prev.filter((c) => c.id !== id), entry]);
    setName("");
    setHint("");
    setSamples([]);
    setRecording(false);
  }, [fix, name, hint, radius, capacity, openHour, closeHour]);

  const copy = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied("failed — select the text and copy it by hand");
      setTimeout(() => setCopied(null), 4000);
    }
  }, []);

  const source = useMemo(() => toSpawnSource(captures), [captures]);
  const hoursValid = closeHour > openHour;
  const canCapture =
    quality !== "waiting" && name.trim().length > 0 && hoursValid;

  return (
    <main className="survey">
      <header className="survey-head">
        <h1>Spawn survey</h1>
        <p>
          Walk to the spot. Stand still until the readings agree. Name it,
          capture it. When you have them all, paste the table into{" "}
          <code>lib/hunt/spawns.ts</code>.
        </p>
      </header>

      {/* ── Live fix ── */}

      <section className={`survey-fix quality-${quality}`}>
        {!recording ? (
          <div className="survey-idle">
            <p>Not reading. Stand where the spawn should be, then start.</p>
            <button className="survey-btn primary" onClick={startHere}>
              Start reading here
            </button>
          </div>
        ) : (
          <>
            <div className="survey-readout">
              <div>
                <span className="label">Latitude</span>
                <span className="value">{fix ? fix.lat.toFixed(6) : "—"}</span>
              </div>
              <div>
                <span className="label">Longitude</span>
                <span className="value">{fix ? fix.lon.toFixed(6) : "—"}</span>
              </div>
              <div>
                <span className="label">Samples</span>
                <span className="value">
                  {fix?.samples ?? 0}
                  <small> / {MIN_SAMPLES_FOR_FIX}</small>
                </span>
              </div>
              <div>
                <span className="label">Spread</span>
                <span className="value">
                  {fix ? `${Math.round(fix.spreadMeters)}m` : "—"}
                </span>
              </div>
              <div>
                <span className="label">Best fix</span>
                <span className="value">
                  {fix ? `${Math.round(fix.bestAccuracyMeters)}m` : "—"}
                </span>
              </div>
              <div>
                <span className="label">Last reading</span>
                <span className="value">
                  {latest ? `${Math.round(latest.accuracy)}m` : "—"}
                </span>
              </div>
            </div>

            <p className="survey-verdict">
              {quality === "waiting" &&
                `Waiting for ${MIN_SAMPLES_FOR_FIX} readings. Keep still.`}
              {quality === "rough" &&
                `Readings disagree by more than ${GOOD_SPREAD_METERS}m. Wait, or move away from walls and tree cover.`}
              {quality === "good" && "Settled. Good enough to capture."}
            </p>

            <button
              className="survey-btn ghost"
              onClick={() => setRecording(false)}
            >
              Stop
            </button>
          </>
        )}

        {geo.status === "error" && (
          <p className="survey-error">{geo.message}</p>
        )}
        {geo.status === "unsupported" && (
          <p className="survey-error">This browser has no geolocation.</p>
        )}
        {geo.status === "insecure" && (
          <p className="survey-error">
            Location needs https. Open this page on the deployed site, not over
            a plain http LAN address.
          </p>
        )}
        <p className="survey-note">
          Readings looser than {MAX_SURVEY_ACCURACY_METERS}m are ignored.
          Walking more than 100m from the running average starts the count over,
          so you cannot accidentally average two different corners into a spot
          that is neither.
        </p>
      </section>

      {/* ── Name it ── */}

      <section className="survey-form">
        <label>
          <span>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="El Mercado"
            maxLength={40}
          />
          {name.trim() && (
            <small className="survey-slug">id: {slugify(name)}</small>
          )}
        </label>

        <label>
          <span>Hint</span>
          <textarea
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="Follow the smell of breakfast before the morning is spent."
            rows={2}
            maxLength={160}
          />
        </label>

        <div className="survey-row">
          <label>
            <span>Radius (m)</span>
            <input
              type="number"
              value={radius}
              min={75}
              max={400}
              onChange={(e) => setRadius(Number(e.target.value))}
            />
          </label>
          <label>
            <span>Capacity</span>
            <input
              type="number"
              value={capacity}
              min={1}
              max={166}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
          </label>
          <label>
            <span>Open</span>
            <input
              type="number"
              value={openHour}
              min={0}
              max={23}
              onChange={(e) => setOpenHour(Number(e.target.value))}
            />
          </label>
          <label>
            <span>Close</span>
            <input
              type="number"
              value={closeHour}
              min={1}
              max={24}
              onChange={(e) => setCloseHour(Number(e.target.value))}
            />
          </label>
        </div>

        {!hoursValid && (
          <p className="survey-error">
            Close must be after open — windows do not wrap past midnight.
          </p>
        )}
        {radius < 75 && (
          <p className="survey-error">
            Under 75m, honest players standing in the right place will be told
            they are not there.
          </p>
        )}

        <button
          className="survey-btn primary"
          disabled={!canCapture}
          onClick={capture}
        >
          {quality === "waiting"
            ? "Waiting for a fix"
            : !name.trim()
              ? "Name it first"
              : `Capture ${name.trim()}`}
        </button>
      </section>

      {/* ── Captured ── */}

      <section className="survey-list">
        <h2>Captured ({captures.length})</h2>
        {captures.length === 0 && <p className="survey-note">Nothing yet.</p>}
        <ul>
          {captures.map((c) => {
            const away = fix
              ? Math.round(distanceMeters(fix.lat, fix.lon, c.lat, c.lon))
              : null;
            const overlaps = captures.filter(
              (o) =>
                o.id !== c.id &&
                distanceMeters(c.lat, c.lon, o.lat, o.lon) <
                  c.radiusMeters + o.radiusMeters,
            );
            return (
              <li key={c.id}>
                <div className="survey-item-head">
                  <strong>{c.name}</strong>
                  <button
                    className="survey-btn tiny"
                    onClick={() =>
                      setCaptures((p) => p.filter((x) => x.id !== c.id))
                    }
                  >
                    remove
                  </button>
                </div>
                <code>
                  {c.lat.toFixed(6)}, {c.lon.toFixed(6)}
                </code>
                <small>
                  {c.radiusMeters}m radius · {c.capacity} places ·{" "}
                  {c.activeHours[0]}:00–
                  {c.activeHours[1]}:00 · {c.samples} samples,{" "}
                  {Math.round(c.spreadMeters)}m spread
                  {away !== null && <> · {away}m from here</>}
                </small>
                {overlaps.length > 0 && (
                  <small className="survey-warn">
                    Claim zone overlaps {overlaps.map((o) => o.name).join(", ")}{" "}
                    — someone standing between them can claim from either.
                  </small>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Export ── */}

      <section className="survey-export">
        <h2>Paste into lib/hunt/spawns.ts</h2>
        <pre>{source}</pre>
        <div className="survey-row">
          <button className="survey-btn" onClick={() => copy(source, "table")}>
            Copy table
          </button>
          <button
            className="survey-btn ghost"
            onClick={() => copy(JSON.stringify(captures, null, 2), "backup")}
          >
            Copy JSON backup
          </button>
        </div>
        {copied && <p className="survey-note">Copied {copied}.</p>}
        <p className="survey-note">
          Captures live only in this browser. Copy the JSON backup before
          clearing site data or switching phones.
        </p>
      </section>
    </main>
  );
}
