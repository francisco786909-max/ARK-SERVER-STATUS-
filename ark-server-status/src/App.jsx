import React, { useEffect, useMemo, useState } from "react";
import { Search, Plus, RefreshCw, Trash2, Users, Wifi, AlertTriangle, CheckCircle2, Activity, RadioTower, Gauge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "ark-official-pop-viewer-servers-v1";

const defaultServers = [
  "1220",
  "1286",
  "1138",
];

function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

function extractShortName(name) {
  return String(name || "")
    .replace(/\[NO WIPE\]/gi, "")
    .replace(/FIBERCRAFT/gi, "")
    .trim();
}

async function fetchBattleMetricsServer(serverName) {
  const pingStart = performance.now();
  const query = encodeURIComponent(serverName);
  const url = `https://api.battlemetrics.com/servers?filter[search]=${query}&filter[game]=arksa&page[size]=10`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`BattleMetrics error ${response.status}`);
  }

  const json = await response.json();
  const pingMs = Math.round(performance.now() - pingStart);
  const results = json?.data || [];

  if (!results.length) {
    return {
      id: null,
      searchedName: serverName,
      name: serverName,
      status: "not_found",
      players: 0,
      maxPlayers: 0,
      address: "",
      country: "",
      rank: null,
      pingMs,
      updatedAt: new Date().toISOString(),
    };
  }

  const exact = results.find((item) => {
    const bmName = normalizeName(item?.attributes?.name).toLowerCase();
    return bmName.includes(normalizeName(serverName).toLowerCase());
  });

  const selected = exact || results[0];
  const attr = selected.attributes || {};

  return {
    id: selected.id,
    searchedName: serverName,
    name: attr.name || serverName,
    status: attr.status || "unknown",
    players: Number(attr.players || 0),
    maxPlayers: Number(attr.maxPlayers || 0),
    address: attr.address || "",
    country: attr.country || "",
    rank: attr.rank || null,
    pingMs,
    updatedAt: new Date().toISOString(),
  };
}

export default function ArkOfficialServerPopViewer() {
  const [servers, setServers] = useState(defaultServers);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshMinutes, setRefreshMinutes] = useState(5);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (Array.isArray(saved) && saved.length) setServers(saved);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
  }, [servers]);

  async function refreshAll() {
    if (!servers.length) return;
    setLoading(true);

    const next = { ...status };

    for (const serverName of servers) {
      try {
        next[serverName] = {
          ...(next[serverName] || {}),
          loading: true,
          error: null,
        };
        setStatus({ ...next });

        const data = await fetchBattleMetricsServer(serverName);
        next[serverName] = {
          ...data,
          loading: false,
          error: null,
        };
        setStatus({ ...next });

        await new Promise((resolve) => setTimeout(resolve, 450));
      } catch (error) {
        next[serverName] = {
          searchedName: serverName,
          name: serverName,
          status: "error",
          players: 0,
          maxPlayers: 0,
          loading: false,
          error: error.message || "Error desconocido",
          pingMs: null,
          updatedAt: new Date().toISOString(),
        };
        setStatus({ ...next });
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const ms = Math.max(1, Number(refreshMinutes || 5)) * 60 * 1000;
    const interval = setInterval(refreshAll, ms);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshMinutes, servers]);

  function addServer() {
    const name = normalizeName(input);
    if (!name) return;
    if (servers.some((x) => x.toLowerCase() === name.toLowerCase())) {
      setInput("");
      return;
    }
    setServers((prev) => [...prev, name]);
    setInput("");
  }

  function removeServer(serverName) {
    setServers((prev) => prev.filter((x) => x !== serverName));
    setStatus((prev) => {
      const next = { ...prev };
      delete next[serverName];
      return next;
    });
  }

  const serverCards = useMemo(() => {
    return servers
      .map((serverName) => status[serverName] || { searchedName: serverName, name: serverName, status: "pending" })
      .filter((item) => {
        const q = search.toLowerCase();
        return !q || item.name?.toLowerCase().includes(q) || item.searchedName?.toLowerCase().includes(q);
      })
      .sort((a, b) => Number(b.players || 0) - Number(a.players || 0));
  }, [servers, status, search]);

  const totalPop = serverCards.reduce((sum, item) => sum + Number(item.players || 0), 0);
  const totalSlots = serverCards.reduce((sum, item) => sum + Number(item.maxPlayers || 0), 0);
  const onlineServers = serverCards.filter((x) => x.status === "online").length;
  const pingValues = serverCards.map((x) => Number(x.pingMs)).filter((x) => !Number.isNaN(x) && x > 0);
  const averagePing = pingValues.length ? Math.round(pingValues.reduce((sum, value) => sum + value, 0) / pingValues.length) : 0;

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.22),transparent_30%),linear-gradient(135deg,#020617,#09090b,#111827)] p-4 text-zinc-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="relative overflow-hidden rounded-[34px] border border-cyan-400/30 bg-zinc-950/80 p-6 shadow-[0_0_60px_rgba(34,211,238,0.16)] backdrop-blur md:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
            <div className="absolute -bottom-24 left-16 h-72 w-72 rounded-full bg-blue-700/20 blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.08)_1px,transparent_1px)] bg-[size:34px_34px]" />
          </div>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-cyan-200 shadow-[0_0_22px_rgba(34,211,238,0.18)]">
                <Activity className="h-4 w-4" /> ARK CONTROL CENTER
              </div>

              <h1 className="text-5xl font-black leading-none tracking-tight text-white md:text-7xl">
                SERVER
                <span className="block bg-gradient-to-r from-cyan-200 via-sky-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(56,189,248,0.35)]">
                  STATUS
                </span>
              </h1>

              <p className="mt-4 max-w-3xl text-base font-medium leading-relaxed text-zinc-300 md:text-lg">
                Centro de control para vigilar la población de tus servidores oficiales. Añade servidores, actualiza la pop y controla todo desde un panel estilo sci-fi.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={refreshAll} disabled={loading} className="rounded-2xl border border-cyan-300/30 bg-cyan-400 px-5 py-3 font-black text-zinc-950 shadow-[0_0_28px_rgba(34,211,238,0.35)] hover:bg-cyan-300">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                ACTUALIZAR
              </Button>
              <Button
                onClick={() => setAutoRefresh((v) => !v)}
                variant="secondary"
                className="rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3 font-black text-zinc-100 hover:bg-zinc-800"
              >
                <Wifi className="mr-2 h-4 w-4" />
                AUTO {autoRefresh ? "ON" : "OFF"}
              </Button>
            </div>
          </div>

          <div className="relative mt-8 grid gap-4 md:grid-cols-4">
            <StatBox label="POP TOTAL" value={`${totalPop} / ${totalSlots || "?"}`} icon={Users} />
            <StatBox label="SERVERS ONLINE" value={`${onlineServers} / ${serverCards.length}`} icon={RadioTower} />
            <StatBox label="AUTO REFRESH" value={`${refreshMinutes} min`} icon={RefreshCw} />
            <StatBox label="PING MEDIO" value={averagePing ? `${averagePing} ms` : "-- ms"} icon={Gauge} />
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-[30px] border border-cyan-400/20 bg-zinc-950/75 shadow-[0_0_35px_rgba(34,211,238,0.08)] backdrop-blur">
            <CardContent className="space-y-4 p-5">
              <h2 className="text-2xl font-black tracking-tight text-white">Añadir servidor</h2>
              <div className="flex flex-col gap-2 md:flex-row">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addServer()}
                  className="w-full rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-base font-semibold text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="Ejemplo: 1220, 1286, 1138 o nombre completo del servidor"
                />
                <Button onClick={addServer} className="rounded-2xl">
                  <Plus className="mr-2 h-4 w-4" /> Añadir
                </Button>
              </div>
              <p className="text-sm text-zinc-500">
                Consejo: puedes poner solo el número del servidor oficial, por ejemplo 1220, 1286 o 1138. Si no lo encuentra bien, usa el nombre completo que aparece en BattleMetrics.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border border-cyan-400/20 bg-zinc-950/75 shadow-[0_0_35px_rgba(34,211,238,0.08)] backdrop-blur">
            <CardContent className="space-y-4 p-5">
              <h2 className="text-2xl font-black tracking-tight text-white">Opciones del panel</h2>
              <div className="flex items-center gap-3">
                <label className="text-sm text-zinc-400">Refrescar cada</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={refreshMinutes}
                  onChange={(e) => setRefreshMinutes(e.target.value)}
                  className="w-24 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-2 outline-none focus:border-cyan-400"
                />
                <span className="text-sm text-zinc-400">minutos</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-2xl border border-cyan-400/20 bg-black/40 py-3 pl-10 pr-4 text-base font-semibold text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="Buscar servidor..."
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {serverCards.map((item) => (
            <ServerCard key={item.searchedName} item={item} onRemove={() => removeServer(item.searchedName)} />
          ))}
        </section>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon }) {
  return (
    <div className="rounded-[26px] border border-cyan-400/20 bg-gradient-to-b from-zinc-900/90 to-black/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_30px_rgba(34,211,238,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300/80">{label}</p>
          <p className="mt-2 text-4xl font-black tracking-tight text-white">{value}</p>
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 shadow-[0_0_25px_rgba(34,211,238,0.18)]">
          <Icon className="h-8 w-8 text-cyan-200" />
        </div>
      </div>
    </div>
  );
}

function ServerCard({ item, onRemove }) {
  const isOnline = item.status === "online";
  const isError = item.status === "error" || item.status === "not_found";
  const maxPlayers = Number(item.maxPlayers || 0);
  const players = Number(item.players || 0);
  const percent = maxPlayers > 0 ? Math.min(100, Math.round((players / maxPlayers) * 100)) : 0;

  return (
    <Card className="group overflow-hidden rounded-[30px] border border-cyan-400/15 bg-gradient-to-b from-zinc-900/95 to-black/85 shadow-[0_0_35px_rgba(34,211,238,0.08)] transition hover:-translate-y-1 hover:border-cyan-300/40 hover:shadow-[0_0_45px_rgba(34,211,238,0.16)]">
      <div className="h-1.5 w-full bg-gradient-to-r from-cyan-300 via-blue-500 to-indigo-600" />
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {item.loading ? (
                <RefreshCw className="h-5 w-5 animate-spin text-cyan-300" />
              ) : isError ? (
                <AlertTriangle className="h-5 w-5 text-orange-300" />
              ) : (
                <CheckCircle2 className={`h-5 w-5 ${isOnline ? "text-green-400" : "text-zinc-500"}`} />
              )}
              <span className={`h-3 w-3 rounded-full ${isOnline ? "bg-green-400" : isError ? "bg-orange-400" : "bg-zinc-600"}`} />
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">{item.status || "pending"}</p>
            </div>
            <h3 className="mt-3 break-words text-2xl font-black leading-tight tracking-tight text-white">{extractShortName(item.name)}</h3>
          </div>
          <button onClick={onRemove} className="rounded-xl bg-zinc-800 p-2 text-zinc-400 hover:bg-red-500/20 hover:text-red-200">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div>
          <div className="flex items-end justify-between">
            <p className="text-6xl font-black tracking-tight text-white drop-shadow-[0_0_14px_rgba(34,211,238,0.22)]">{players} <span className="text-2xl font-bold text-zinc-500">/ {maxPlayers || "?"}</span></p>
            <p className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm font-black text-cyan-200">{percent}%</p>
          </div>
          <div className="mt-4 h-4 overflow-hidden rounded-full border border-zinc-700 bg-zinc-900">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-600 shadow-[0_0_18px_rgba(34,211,238,0.45)] transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className="grid gap-2 rounded-2xl border border-zinc-800 bg-black/35 p-4 text-sm text-zinc-300">
          <p><span className="text-zinc-500">Buscado:</span> {item.searchedName}</p>
          {item.address ? <p><span className="text-zinc-500">IP:</span> {item.address}</p> : null}
          {item.rank ? <p><span className="text-zinc-500">Rank:</span> #{item.rank}</p> : null}
          {item.pingMs ? <p><span className="text-zinc-500">Ping:</span> <span className="font-black text-cyan-200">{item.pingMs} ms</span></p> : null}
          {item.error ? <p className="text-orange-300">Error: {item.error}</p> : null}
          {item.updatedAt ? <p className="text-xs text-zinc-600">Actualizado: {new Date(item.updatedAt).toLocaleString()}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
