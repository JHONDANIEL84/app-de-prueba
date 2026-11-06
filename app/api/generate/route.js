import { NextResponse } from "next/server";
import { Client, handle_file } from "@gradio/client";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

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

function mapRatioToSize(ratio) {
  switch (ratio) {
    case "16:9":
      return "1344x768 (16:9)";
    case "9:16":
      return "768x1344 (9:16)";
    case "4:3":
      return "1184x864 (4:3)";
    case "3:4":
      return "864x1184 (3:4)";
    default:
      return "1024x1024 (1:1)";
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      mode = "create", 
      prompt, 
      input_image = null, 
      aspect_ratio = "1:1",
      steps = 26,
      seed = 0,
      customSpace = "FelyaHuhing/qwen-image-21-uncensored",
      customToken = ""
    } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "El prompt es obligatorio" }, { status: 400 });
    }

    const token = customToken || process.env.HF_TOKEN || undefined;
    const client = await Client.connect(customSpace, token ? { hf_token: token } : {});

    let result;

    if (mode === "edit" && input_image) {
      const blob = dataURLtoBlob(input_image);
      const imgParam = typeof handle_file === "function" ? handle_file(blob) : blob;

      result = await client.predict("/edit", {
        prompt: prompt.trim(),
        input_image: imgParam,
        extra_images: [],
        steps: Math.min(Math.max(steps, 8), 40),
        seed: seed || 0,
        randomize_seed: true,
        lora_scale: 1.0,
      });
    } else {
      result = await client.predict("/generate", {
        prompt: prompt.trim(),
        size: mapRatioToSize(aspect_ratio),
        steps: Math.min(Math.max(steps, 8), 40),
        seed: seed || 0,
        randomize_seed: true,
        lora_scale: 1.0,
      });
    }

    let imageUrl = null;
    let usedSeed = seed;

    if (result && result.data) {
      const data = result.data;
      if (Array.isArray(data)) {
        const imgObj = data[0];
        if (typeof imgObj === "string") {
          imageUrl = imgObj;
        } else if (imgObj && typeof imgObj === "object") {
          imageUrl = imgObj.url || imgObj.path;
        }
        if (data.length > 1 && typeof data[1] === "number") {
          usedSeed = data[1];
        }
      }
    }

    if (!imageUrl) {
      return NextResponse.json({ 
        error: "El Space no devolvió una imagen válida.",
        raw: result ? result.data : null 
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      seed: usedSeed,
      prompt,
    });
  } catch (error) {
    console.error("Error en route.js:", error);
    return NextResponse.json(
      { 
        error: error.message || "Error al procesar en Hugging Face",
        details: "Hugging Face ZeroGPU puede estar ocupado. Intenta de nuevo en unos segundos."
      },
      { status: 500 }
    );
  }
}
