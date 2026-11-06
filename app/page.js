"use client";

import { useState, useEffect } from "react";
import { 
  Sparkles, 
  Download, 
  Share2, 
  RefreshCw, 
  Settings, 
  Image as ImageIcon, 
  Sliders, 
  ExternalLink,
  ChevronDown,
  X,
  History,
  Check
} from "lucide-react";

const STYLES = [
  { name: "✨ Realista", promptSuffix: ", photorealistic, 8k resolution, cinematic lighting, ultra-detailed" },
  { name: "🎌 Anime", promptSuffix: ", anime art style, vibrant colors, makoto shinkai aesthetic, high quality" },
  { name: "🌆 Cyberpunk", promptSuffix: ", cyberpunk neon city style, futuristic, moody atmosphere, volumetric fog" },
  { name: "🎨 Óleo", promptSuffix: ", oil painting masterpiece, textured brushstrokes, classical fine art" },
  { name: "🧊 3D Render", promptSuffix: ", octane render 3d, unreal engine 5, cute clay render, hyper-detailed" },
  { name: "🧙 Fantasía", promptSuffix: ", epic fantasy digital art, magical glowing runes, ethereal concept art" },
];

const PRESET_PROMPTS = [
  "Un zorro místico con pelaje brillante en un bosque de cristales luminosos",
  "Retrato futurista de una mujer con implantes cibernéticos dorados",
  "Un astronauta navegando en un barco de vela sobre las nubes de Júpiter",
  "Café acogedor en una noche lluviosa de Tokio estilo acuarela",
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [hfToken, setHfToken] = useState("");
  const [spaceName, setSpaceName] = useState("FelyaHuhing/qwen-image-21-uncensored");
  const [toastMessage, setToastMessage] = useState("");

  // Cargar historial y configuración desde localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("qwen_gallery");
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      
      const savedToken = localStorage.getItem("qwen_hf_token");
      if (savedToken) setHfToken(savedToken);

      const savedSpace = localStorage.getItem("qwen_space_name");
      if (savedSpace) setSpaceName(savedSpace);
    } catch (e) {
      console.warn("Error leyendo localStorage:", e);
    }
  }, []);

  // Cronómetro durante generación
  useEffect(() => {
    let timer;
    if (loading) {
      setElapsedTime(0);
      timer = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [loading]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(40);
    }

    setLoading(true);
    setError(null);

    const fullPrompt = prompt + (selectedStyle ? selectedStyle.promptSuffix : "");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullPrompt,
          aspect_ratio: aspectRatio,
          customSpace: spaceName,
          customToken: hfToken,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Ocurrió un error al generar la imagen");
      }

      setCurrentImage(data.imageUrl);

      // Guardar en historial
      const newEntry = {
        id: Date.now(),
        url: data.imageUrl,
        prompt: fullPrompt,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const updatedHistory = [newEntry, ...history.slice(0, 19)];
      setHistory(updatedHistory);
      try {
        localStorage.setItem("qwen_gallery", JSON.stringify(updatedHistory));
      } catch (e) {}

      showToast("¡Imagen creada exitosamente!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (imgUrl) => {
    try {
      showToast("Preparando descarga...");
      const response = await fetch(imgUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `qwen-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      showToast("Guardado en descargas ✅");
    } catch (err) {
      // Fallback: abrir en nueva ventana
      window.open(imgUrl, "_blank");
    }
  };

  const handleShare = async (imgUrl) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Imagen creada con Qwen AI",
          text: prompt,
          url: imgUrl,
        });
      } catch (err) {
        console.log("Compartir cancelado");
      }
    } else {
      await navigator.clipboard.writeText(imgUrl);
      showToast("Enlace copiado al portapapeles 📋");
    }
  };

  const saveSettings = () => {
    try {
      localStorage.setItem("qwen_hf_token", hfToken);
      localStorage.setItem("qwen_space_name", spaceName);
      setShowSettings(false);
      showToast("Configuración guardada ✅");
    } catch (e) {}
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#070A11] text-slate-100 max-w-md mx-auto relative shadow-2xl overflow-hidden pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-indigo-600/95 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg backdrop-blur flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-slate-800/80 bg-[#0B101D]/80 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              Qwen Studio
              <span className="text-[10px] font-medium bg-indigo-950 text-indigo-400 border border-indigo-800/60 px-1.5 py-0.5 rounded-full">
                HF Space
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 truncate max-w-[170px]">
              {spaceName.split("/")[1] || spaceName}
            </p>
          </div>
        </div>

        <button 
          onClick={() => setShowSettings(true)}
          className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 active:scale-95 transition"
          aria-label="Configuración"
        >
          <Settings className="w-4 h-4" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        {/* Preview Container */}
        <div className="w-full aspect-square rounded-2xl bg-slate-900/90 border border-slate-800/80 overflow-hidden relative flex items-center justify-center shadow-inner group">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <Sparkles className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">Generando en la GPU de Hugging Face</p>
                <p className="text-xs text-indigo-400 font-mono">Tiempo transcurrido: {elapsedTime}s</p>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Qwen-Image procesa la descripción. El primer intento puede tardar unos segundos mientras el Space despierta.
                </p>
              </div>
            </div>
          ) : currentImage ? (
            <div className="w-full h-full relative group">
              <img 
                src={currentImage} 
                alt="Imagen generada" 
                className="w-full h-full object-cover select-none"
              />
              {/* Overlay Actions */}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-end gap-2">
                <button
                  onClick={() => handleDownload(currentImage)}
                  className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-white/30 active:scale-90 transition shadow-lg"
                  title="Descargar al carrete"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleShare(currentImage)}
                  className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-white/30 active:scale-90 transition shadow-lg"
                  title="Compartir"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleGenerate}
                  className="p-2.5 rounded-xl bg-indigo-600/90 backdrop-blur-md text-white hover:bg-indigo-500 active:scale-90 transition shadow-lg"
                  title="Regenerar con nueva semilla"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center text-slate-400 border border-slate-700/50">
                <ImageIcon className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-300">Tu lienzo está vacío</p>
                <p className="text-[11px] text-slate-500 max-w-[220px]">
                  Escribe un prompt abajo o elige una sugerencia para empezar a crear
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-start justify-between gap-2">
            <span className="leading-relaxed">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Style Chips Carousel */}
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-1">
            Estilos Rápidos
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {STYLES.map((st) => {
              const active = selectedStyle?.name === st.name;
              return (
                <button
                  key={st.name}
                  onClick={() => setSelectedStyle(active ? null : st)}
                  className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition active:scale-95 border ${
                    active 
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20 font-medium" 
                      : "bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {st.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input & Prompt Area */}
        <div className="space-y-2">
          <div className="relative rounded-2xl bg-slate-900 border border-slate-800 focus-within:border-indigo-500/80 transition p-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe lo que quieres ver en detalle..."
              rows={3}
              className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none"
            />
            
            {prompt && (
              <button 
                onClick={() => setPrompt("")}
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs text-slate-400">
              <span className="text-[11px]">
                {selectedStyle ? `Modo: ${selectedStyle.name}` : "Estilo libre"}
              </span>
              <div className="flex gap-1.5">
                {["1:1", "9:16", "16:9"].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      aspectRatio === ratio
                        ? "bg-indigo-950 text-indigo-300 border-indigo-700"
                        : "bg-slate-800/60 text-slate-400 border-transparent hover:text-slate-200"
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick inspiration chips */}
          {!prompt && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(p)}
                  className="text-[11px] text-slate-400 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/60 px-2.5 py-1 rounded-lg text-left truncate max-w-full active:scale-95 transition"
                >
                  💡 {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className={`w-full py-3.5 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-xl transition active:scale-[0.98] ${
            loading || !prompt.trim()
              ? "bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-800"
              : "bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-indigo-600/25 hover:opacity-95"
          }`}
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Procesando en Hugging Face ({elapsedTime}s)...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generar Imagen</span>
            </>
          )}
        </button>

        {/* Gallery / History */}
        {history.length > 0 && (
          <div className="pt-4 border-t border-slate-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                Creaciones recientes ({history.length})
              </span>
              <button
                onClick={() => {
                  setHistory([]);
                  localStorage.removeItem("qwen_gallery");
                }}
                className="text-[10px] text-slate-500 hover:text-red-400 transition"
              >
                Limpiar
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {history.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    setCurrentImage(item.url);
                    setPrompt(item.prompt);
                  }}
                  className="aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-800 relative group cursor-pointer active:scale-95 transition"
                >
                  <img src={item.url} alt="Historial" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#0E1422] border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Configuración del Space</h3>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  ID del Space de Hugging Face
                </label>
                <input
                  type="text"
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  placeholder="FelyaHuhing/qwen-image-21-uncensored"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Hugging Face Access Token (Opcional)
                </label>
                <input
                  type="password"
                  value={hfToken}
                  onChange={(e) => setHfToken(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  placeholder="hf_..."
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Útil para evitar límites de uso o si duplicas el Space a tu propia cuenta.
                </p>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={saveSettings}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs active:scale-95 transition"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
