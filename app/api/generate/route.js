import { NextResponse } from "next/server";
import { Client, handle_file } from "@gradio/client";

export const maxDuration = 120; // Vercel function timeout config
export const dynamic = "force-dynamic";

// Convert base64 data URL to Blob for Gradio upload
function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      mode = "create", // "create" (text-to-image) or "edit" (image-to-image)
      prompt, 
      negative_prompt = "", 
      input_image = null, // base64 string
      strength = 0.75, // image modification strength
      aspect_ratio = "1:1",
      seed = Math.floor(Math.random() * 1000000),
      steps = 25,
      guidance_scale = 5.0,
      customSpace = "FelyaHuhing/qwen-image-21-uncensored",
      customToken = ""
    } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Describe lo que deseas generar o modificar" }, { status: 400 });
    }

    const token = customToken || process.env.HF_TOKEN || undefined;
    const clientOptions = token ? { hf_token: token } : {};
    const client = await Client.connect(customSpace, clientOptions);

    let result;

    if (mode === "edit" && input_image) {
      // Modo Edición / Modificación de Imagen existente
      const blob = dataURLtoBlob(input_image);
      const imageParam = typeof handle_file === "function" ? handle_file(blob) : blob;

      // Intentar diferentes formatos de endpoints de edición en Gradio
      try {
        result = await client.predict("/edit", [
          imageParam,
          prompt,
          negative_prompt,
          strength,
          seed,
        ]);
      } catch (e1) {
        try {
          result = await client.predict("/image_to_image", [
            imageParam,
            prompt,
            negative_prompt,
            strength,
          ]);
        } catch (e2) {
          try {
            // Intento con parámetros ordenados (prompt, image)
            result = await client.predict(0, [
              prompt,
              imageParam,
              negative_prompt,
              seed,
            ]);
          } catch (e3) {
            // Intento con (image, prompt)
            result = await client.predict(0, [
              imageParam,
              prompt,
              seed,
            ]);
          }
        }
      }
    } else {
      // Modo Creación (Texto a Imagen)
      try {
        result = await client.predict("/predict", [
          prompt,
          negative_prompt,
          seed,
          guidance_scale,
          steps,
        ]);
      } catch (predictErr) {
        try {
          result = await client.predict(0, [
            prompt,
            negative_prompt,
            seed,
          ]);
        } catch (fallbackErr) {
          result = await client.predict(0, [prompt]);
        }
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
        error: "No se pudo recuperar la imagen modificada por el Space.",
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
    console.error("Error en generación/edición:", error);
    return NextResponse.json(
      { 
        error: error.message || "Error al procesar con Hugging Face",
        details: "El Space puede estar en reposo temporal o procesando otra petición. Vuelve a intentarlo en unos segundos."
      },
      { status: 500 }
    );
  }
}
