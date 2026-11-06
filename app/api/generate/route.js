import { NextResponse } from "next/server";
import { Client } from "@gradio/client";

export const maxDuration = 120; // Vercel function timeout config (up to 120s if Pro, default 60s)
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      prompt, 
      negative_prompt = "", 
      aspect_ratio = "1:1",
      seed = Math.floor(Math.random() * 1000000),
      steps = 25,
      guidance_scale = 5.0,
      customSpace = "FelyaHuhing/qwen-image-21-uncensored",
      customToken = ""
    } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "El prompt es obligatorio" }, { status: 400 });
    }

    const token = customToken || process.env.HF_TOKEN || undefined;

    // Conectar al Space de Gradio
    const clientOptions = token ? { hf_token: token } : {};
    const client = await Client.connect(customSpace, clientOptions);

    let result;
    try {
      // Intentar predicción estándar por endpoint /predict o /generate
      result = await client.predict("/predict", [
        prompt,
        negative_prompt,
        seed,
        guidance_scale,
        steps,
      ]);
    } catch (predictErr) {
      // Si falla /predict, intentar con el primer endpoint disponible (índice 0 o named)
      try {
        result = await client.predict(0, [
          prompt,
          negative_prompt,
          seed,
        ]);
      } catch (fallbackErr) {
        // Intento con sólo el prompt
        result = await client.predict(0, [prompt]);
      }
    }

    // Extraer la imagen resultante
    let imageUrl = null;
    if (result && result.data) {
      const data = result.data;
      if (Array.isArray(data)) {
        for (const item of data) {
          if (typeof item === "string" && (item.startsWith("http") || item.startsWith("data:image"))) {
            imageUrl = item;
            break;
          } else if (item && typeof item === "object" && item.url) {
            imageUrl = item.url;
            break;
          }
        }
      } else if (typeof data === "string") {
        imageUrl = data;
      }
    }

    if (!imageUrl) {
      return NextResponse.json({ 
        error: "No se pudo recuperar la imagen generada por el Space.",
        raw: result ? result.data : null 
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      seed,
      prompt,
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { 
        error: error.message || "Error al conectar con Hugging Face Space",
        details: "Asegúrate de que el Space esté activo en Hugging Face o prueba configurando un HF_TOKEN."
      },
      { status: 500 }
    );
  }
}
