import { useState } from "react";
import { bngToLatLon, toDMS } from "@/lib/bng";

interface Result {
  lat: number;
  lon: number;
}

function NavButton({
  label,
  href,
  color,
  icon,
}: {
  label: string;
  href: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white text-sm transition-all active:scale-95 hover:brightness-110 shadow-md ${color}`}
    >
      {icon}
      {label}
    </a>
  );
}

function GoogleMapsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
      <path d="M24 4C15.16 4 8 11.16 8 20c0 12 16 28 16 28s16-16 16-28c0-8.84-7.16-16-16-16z" fill="#ffffff" opacity="0.9"/>
      <circle cx="24" cy="20" r="6" fill="rgba(255,255,255,0.3)"/>
    </svg>
  );
}

function AppleMapsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
      <rect x="6" y="6" width="36" height="36" rx="8" fill="white" opacity="0.25"/>
      <path d="M14 24 L24 14 L34 24 L24 34 Z" fill="white" opacity="0.8"/>
    </svg>
  );
}

function WazeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="20" r="14" fill="white" opacity="0.25"/>
      <circle cx="19" cy="28" r="3" fill="white" opacity="0.9"/>
      <circle cx="29" cy="28" r="3" fill="white" opacity="0.9"/>
      <path d="M18 19 Q24 15 30 19" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

export default function Home() {
  const [easting, setEasting] = useState("");
  const [northing, setNorthing] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleConvert(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const E = parseFloat(easting.replace(/,/g, "").trim());
    const N = parseFloat(northing.replace(/,/g, "").trim());

    if (isNaN(E) || isNaN(N)) {
      setError("Please enter valid numeric values for both easting and northing.");
      return;
    }

    if (E < 0 || E > 700_000) {
      setError("Easting must be between 0 and 700,000 metres.");
      return;
    }

    if (N < 0 || N > 1_300_000) {
      setError("Northing must be between 0 and 1,300,000 metres.");
      return;
    }

    try {
      const { lat, lon } = bngToLatLon(E, N);
      setResult({ lat, lon });
    } catch {
      setError("Conversion failed. Please check your inputs.");
    }
  }

  function handleClear() {
    setEasting("");
    setNorthing("");
    setResult(null);
    setError(null);
  }

  async function handleCopy() {
    if (!result) return;
    const text = `${result.lat.toFixed(6)}, ${result.lon.toFixed(6)}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const googleMapsUrl = result
    ? `https://www.google.com/maps?q=${result.lat.toFixed(6)},${result.lon.toFixed(6)}`
    : "#";

  const appleMapsUrl = result
    ? `https://maps.apple.com/?ll=${result.lat.toFixed(6)},${result.lon.toFixed(6)}&q=Location`
    : "#";

  const wazeUrl = result
    ? `https://waze.com/ul?ll=${result.lat.toFixed(6)},${result.lon.toFixed(6)}&navigate=yes`
    : "#";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex flex-col items-center justify-start px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500 shadow-lg mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">GridPin</h1>
          <p className="text-slate-400 mt-1 text-sm">British National Grid to navigation apps</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleConvert} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Easting (metres)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={easting}
                onChange={(e) => setEasting(e.target.value)}
                placeholder="e.g. 530234.5"
                className="w-full bg-white/10 border border-white/25 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Northing (metres)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={northing}
                onChange={(e) => setNorthing(e.target.value)}
                placeholder="e.g. 181534.2"
                className="w-full bg-white/10 border border-white/25 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400/40 text-red-300 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold py-3 rounded-xl transition-all active:scale-95 shadow-md"
              >
                Convert
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-5 bg-white/10 hover:bg-white/20 text-slate-300 font-semibold py-3 rounded-xl border border-white/20 transition-all active:scale-95"
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        {result && (
          <div className="mt-5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Converted Coordinates</h2>
              <button
                onClick={handleCopy}
                className="text-xs text-indigo-300 hover:text-indigo-200 transition flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg border border-white/20"
              >
                {copied ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div className="bg-white/5 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-400 mb-0.5">Decimal Degrees (WGS84)</p>
                <p className="text-white font-mono text-sm font-medium">
                  {result.lat.toFixed(6)}, {result.lon.toFixed(6)}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-400 mb-0.5">Degrees, Minutes, Seconds</p>
                <p className="text-white font-mono text-sm font-medium">
                  {toDMS(result.lat, ["N", "S"])}
                </p>
                <p className="text-white font-mono text-sm font-medium">
                  {toDMS(result.lon, ["E", "W"])}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Open in Navigation App</p>
            <div className="grid grid-cols-1 gap-2.5">
              <NavButton
                label="Open in Google Maps"
                href={googleMapsUrl}
                color="bg-[#4285F4] hover:bg-[#3b78e7]"
                icon={<GoogleMapsIcon />}
              />
              <NavButton
                label="Open in Apple Maps"
                href={appleMapsUrl}
                color="bg-[#333333] hover:bg-[#444444]"
                icon={<AppleMapsIcon />}
              />
              <NavButton
                label="Open in Waze"
                href={wazeUrl}
                color="bg-[#33CCFF] hover:bg-[#22bbee]"
                icon={<WazeIcon />}
              />
            </div>
          </div>
        )}

        <p className="text-center text-slate-500 text-xs mt-8">
          Converts OSGB36 grid references to WGS84 using Helmert transformation
        </p>
      </div>
    </div>
  );
}
