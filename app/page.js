"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Download, 
  Share2, 
  RefreshCw, 
  Settings, 
  Image as ImageIcon, 
  Upload,
  Camera,
  Wand2,
  X,
  History,
  Check,
  Eye,
  SlidersHorizontal,
  ArrowRight
} from "lucide-react";

const STYLES = [
  { name: "✨ Realista", promptSuffix: ", photorealistic, 8k resolution, cinematic lighting, ultra-detailed" },
  { name: "🎌 Anime", promptSuffix: ", anime art style, vibrant colors, makoto shinkai aesthetic, high quality" },
  { name: "🌆 Cyberpunk", promptSuffix: ", cyberpunk neon city style, futuristic, moody atmosphere, volumetric fog" },
  { name: "🎨 Óleo", promptSuffix: ", oil painting masterpiece, textured brushstrokes, classical fine art" },
  { name: "🧊 3D Render", promptSuffix: ", octane render 3d, unreal engine 5, cute clay render, hyper-detailed" },
  { name: "🧙 Fantasía", promptSuffix: ", epic fantasy digital art, magical glowing runes, ethereal concept art" },
];

const PRESET_CREATION_PROMPTS = [
  "Un zorro místico con pelaje brillante en un bosque de cristales luminosos",
  "Retrato futurista de una mujer con implantes cibernéticos dorados",
  "Un astronauta navegando en un barco sobre las nubes de Júpiter",
  "Café acogedor en una noche lluviosa de Tokio estilo acuarela",
];

const PRESET_EDIT_PROMPTS = [
  "Transforma esta foto al estilo anime japonés de Studio Ghibli",
  "Agrega ropa y accesorios estilo cyberpunk con luces de neón",
  "Convierte esta imagen en una pintura clásica al óleo renacentista",
  "Cambia el fondo actual por una playa paradisíaca al atardecer",
  "Transforma a la persona en un héroe medieval con armadura dorada",
  "Haz que parezca un póster de película cinematográfica en alta definición",
];

// Comprimir imagen usando Canvas para optimizar subidas desde móvil y evitar límites de Vercel
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_DIM = 1024;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round(height * (MAX_DIM / width));
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round(width * (MAX_DIM / height));
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

export default function Home() {
  const [mode, setMode] = useState("create"); // "create" | "edit"
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [inputImage, setInputImage] = useState(null); // Imagen base para editar
  const [showOriginal, setShowOriginal] = useState(false); // Comparador antes/después
  const [strength, setStrength] = useState(0.75); // Nivel de cambio
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);

  const fileInputRef = useRef(null);

  // Modal de ajustes
  const [showSettings, setShowSettings] = useState(false);
  const [hfToken, setHfToken] = useState("");
  const [spaceName, setSpaceName] = useState("FelyaHuhing/qwen-image-21-uncensored");
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("qwen_gallery");
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      
      const savedToken = localStorage.getItem("qwen_hf_token");
      if (savedToken) setHfToken(savedToken);

      const savedSpace = localStorage.getItem("qwen_space_name");
      if (savedSpace) setSpaceName(savedSpace);
    } catch (e) {
      console.warn(e);
    }
  }, []);

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

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast("Optimizando foto...");
      const compressedBase64 = await compressImage(file);
      setInputImage(compressedBase64);
      setMode("edit");
      showToast("Foto cargada con éxito 📸");
    } catch (err) {
      setError("No se pudo cargar la imagen seleccionada");
    }
  };

  const handleProcess = async () => {
    if (!prompt.trim() || loading) return;
    if (mode === "edit" && !inputImage) {
      setError("Por favor sube una imagen primero para poder modificarla");
      return;
    }

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(40);
    }

    setLoading(true);
    setError(null);
    setShowOriginal(false);

    const fullPrompt = prompt + (selectedStyle ? selectedStyle.promptSuffix : "");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          prompt: fullPrompt,
          input_image: mode === "edit" ? inputImage : null,
          strength,
          aspect_ratio: aspectRatio,
          customSpace: spaceName,
          customToken: hfToken,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Error al procesar la imagen");
      }

      setCurrentImage(data.imageUrl);

      const newEntry = {
        id: Date.now(),
        url: data.imageUrl,
        prompt: fullPrompt,
        mode,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const updatedHistory = [newEntry, ...history.slice(0, 19)];
      setHistory(updatedHistory);
      try {
        localStorage.setItem("qwen_gallery", JSON.stringify(updatedHistory));
      } catch (e) {}

      showToast(mode === "edit" ? "¡Imagen modificada con éxito! ✨" : "¡Imagen creada con éxito! 🎨");
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
      showToast("Guardado en tu celular ✅");
    } catch (err) {
      window.open(imgUrl, "_blank");
    }
  };

  const handleShare = async (imgUrl) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Imagen procesada con Qwen AI",
          text: prompt,
          url: imgUrl,
        });
      } catch (err) {}
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
      {/* Input oculto para subida de fotos / cámara */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Notificación Toast */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-600/95 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg backdrop-blur flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* Barra superior */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-slate-800/80 bg-[#0B101D]/80 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              Qwen Studio
              <span className="text-[10px] font-medium bg-indigo-950 text-indigo-400 border border-indigo-800/60 px-1.5 py-0.5 rounded-full">
                AI Pro
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

      {/* Selector de Modo (Crear vs Modificar Foto) */}
      <div className="px-4 pt-3">
        <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-2xl border border-slate-800">
          <button
            onClick={() => setMode("create")}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              mode === "create"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Crear Imagen
          </button>
          <button
            onClick={() => {
              setMode("edit");
              if (!inputImage) fileInputRef.current?.click();
            }}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              mode === "edit"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            Modificar Foto
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <main className="flex-1 px-4 py-3 space-y-3.5 overflow-y-auto">
        {/* Banner de imagen base cargada en modo edición */}
        {mode === "edit" && (
          <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
            {inputImage ? (
              <>
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <img 
                    src={inputImage} 
                    alt="Foto original" 
                    className="w-11 h-11 rounded-xl object-cover border border-indigo-500/50 flex-shrink-0" 
                  />
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-slate-200">Foto lista para editar</p>
                    <p className="text-[10px] text-indigo-400">Toca modificar abajo para aplicar cambios</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg border border-slate-700"
                    title="Cambiar foto"
                  >
                    Cambiar
                  </button>
                  <button
                    onClick={() => setInputImage(null)}
                    className="p-1.5 text-xs text-red-400 hover:text-white bg-slate-800 rounded-lg border border-slate-700"
                    title="Quitar foto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 border-2 border-dashed border-indigo-500/40 hover:border-indigo-500 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-indigo-300 active:scale-95 transition bg-indigo-950/20"
              >
                <Camera className="w-4 h-4 text-indigo-400" />
                <span>Tomar foto o subir desde tu galería</span>
              </button>
            )}
          </div>
        )}

        {/* Visor de Imagen / Pantalla de Resultados */}
        <div className="w-full aspect-square rounded-2xl bg-slate-900/90 border border-slate-800/80 overflow-hidden relative flex items-center justify-center shadow-inner group">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <Sparkles className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">
                  {mode === "edit" ? "Modificando tu foto con Qwen AI..." : "Generando en GPU de Hugging Face..."}
                </p>
                <p className="text-xs text-indigo-400 font-mono">Tiempo: {elapsedTime}s</p>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Procesando detalles con precisión. Si el Space estaba inactivo, el primer inicio toma unos segundos.
                </p>
              </div>
            </div>
          ) : (currentImage || (mode === "edit" && inputImage)) ? (
            <div className="w-full h-full relative group">
              <img 
                src={showOriginal && inputImage ? inputImage : (currentImage || inputImage)} 
                alt="Resultado" 
                className="w-full h-full object-cover select-none"
              />

              {/* Botón flotante para alternar y ver la foto Original vs Modificada */}
              {mode === "edit" && inputImage && currentImage && (
                <button
                  onMouseDown={() => setShowOriginal(true)}
                  onMouseUp={() => setShowOriginal(false)}
                  onTouchStart={() => setShowOriginal(true)}
                  onTouchEnd={() => setShowOriginal(false)}
                  className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-[11px] text-white px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1.5 active:scale-95 select-none"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{showOriginal ? "Mostrando: Original" : "Mantén para ver Original"}</span>
                </button>
              )}

              {/* Acciones sobre la imagen */}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-end gap-2">
                {currentImage && (
                  <>
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
                  </>
                )}
                <button
                  onClick={handleProcess}
                  className="p-2.5 rounded-xl bg-indigo-600/90 backdrop-blur-md text-white hover:bg-indigo-500 active:scale-90 transition shadow-lg"
                  title="Regenerar"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center text-slate-400 border border-slate-700/50">
                {mode === "edit" ? <Wand2 className="w-7 h-7 text-indigo-400" /> : <ImageIcon className="w-7 h-7" />}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-300">
                  {mode === "edit" ? "Sube una foto para comenzar a editar" : "Tu lienzo está vacío"}
                </p>
                <p className="text-[11px] text-slate-500 max-w-[220px]">
                  {mode === "edit" 
                    ? "Puedes usar la cámara o elegir una foto de tu galería para transformarla"
                    : "Escribe un prompt abajo o elige una sugerencia rápida"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-start justify-between gap-2">
            <span className="leading-relaxed">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Estilos o Sugerencias Rápidas */}
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-1 flex items-center justify-between">
            <span>{mode === "edit" ? "Ideas de Modificación" : "Estilos Rápidos"}</span>
            {mode === "edit" && (
              <span className="text-[10px] text-indigo-400 font-normal">Intensidad: {Math.round(strength * 100)}%</span>
            )}
          </label>

          {mode === "create" ? (
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
          ) : (
            <div className="space-y-2">
              {/* Slider de intensidad de cambio */}
              <div className="flex items-center gap-3 px-2 py-1 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400">
                <span className="text-[10px]">Sutil</span>
                <input 
                  type="range" 
                  min="0.3" 
                  max="0.95" 
                  step="0.05"
                  value={strength}
                  onChange={(e) => setStrength(parseFloat(e.target.value))}
                  className="flex-1 accent-indigo-500 cursor-pointer"
                />
                <span className="text-[10px]">Radical</span>
              </div>
            </div>
          )}
        </div>

        {/* Área del Prompt */}
        <div className="space-y-2">
          <div className="relative rounded-2xl bg-slate-900 border border-slate-800 focus-within:border-indigo-500/80 transition p-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === "edit"
                  ? "Describe los cambios (ej: 'cambia la ropa por un traje de astronauta', 'estilo cómic con fondo de Tokio')..."
                  : "Describe en detalle lo que quieres ver..."
              }
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
                {mode === "edit" ? "Modo: Edición de Imagen" : (selectedStyle ? `Modo: ${selectedStyle.name}` : "Estilo libre")}
              </span>
              {mode === "create" && (
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
              )}
            </div>
          </div>

          {/* Sugerencias Rápidas en chips */}
          {!prompt && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(mode === "edit" ? PRESET_EDIT_PROMPTS : PRESET_CREATION_PROMPTS).map((p, idx) => (
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

        {/* Botón de Acción Principal */}
        <button
          onClick={handleProcess}
          disabled={loading || !prompt.trim() || (mode === "edit" && !inputImage)}
          className={`w-full py-3.5 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-xl transition active:scale-[0.98] ${
            loading || !prompt.trim() || (mode === "edit" && !inputImage)
              ? "bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-800"
              : "bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-indigo-600/25 hover:opacity-95"
          }`}
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{mode === "edit" ? "Modificando foto" : "Generando imagen"} ({elapsedTime}s)...</span>
            </>
          ) : mode === "edit" ? (
            <>
              <Wand2 className="w-4 h-4" />
              <span>Modificar Foto con IA</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generar Imagen</span>
            </>
          )}
        </button>

        {/* Galería e Historial */}
        {history.length > 0 && (
          <div className="pt-4 border-t border-slate-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                Historial ({history.length})
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
                    if (item.mode) setMode(item.mode);
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

      {/* Modal de Configuración */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#0E1422] border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Configuración</h3>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  ID del Space en Hugging Face
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
                  Token de Hugging Face (Opcional)
                </label>
                <input
                  type="password"
                  value={hfToken}
                  onChange={(e) => setHfToken(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  placeholder="hf_..."
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Otorga mayor prioridad en Hugging Face.
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
