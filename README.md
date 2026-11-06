# 📱 Qwen AI Mobile Studio (Vercel + Hugging Face)

Aplicación web móvil (PWA) optimizada para celulares para generar imágenes con el modelo **Qwen-Image-2.1** ejecutándose en el Space de Hugging Face [`FelyaHuhing/qwen-image-21-uncensored`](https://huggingface.co/spaces/FelyaHuhing/qwen-image-21-uncensored).

---

## 🚀 Cómo desplegar en Vercel (Paso a Paso)

### Opción A: Desplegar desde GitHub (Recomendado)
1. Crea un nuevo repositorio en tu [GitHub](https://github.com/new) llamado `qwen-mobile-app`.
2. Sube esta carpeta al repositorio:
   ```bash
   cd qwen-mobile-app
   git init
   git add .
   git commit -m "Initial commit Qwen mobile app"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/qwen-mobile-app.git
   git push -u origin main
   ```
3. Ve a [Vercel](https://vercel.com/new).
4. Selecciona tu repositorio y haz clic en **Import**.
5. *(Opcional)* En **Environment Variables**, añade:
   - `HF_TOKEN`: tu token de Hugging Face de [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) (si el Space lo requiere o para mayor velocidad).
6. Haz clic en **Deploy**. ¡Listo! Tendrás tu enlace `https://tu-app.vercel.app`.

---

## 📲 Cómo instalarla en tu Celular (iOS / Android)

Una vez que tengas tu URL de Vercel:

### En iPhone (iOS - Safari):
1. Abre el enlace de Vercel en **Safari**.
2. Presiona el botón **Compartir** (icono de cuadrado con flecha hacia arriba).
3. Desplázate hacia abajo y selecciona **"Añadir a la pantalla de inicio"** (Add to Home Screen).
4. Dale a **Añadir**. Ahora se abrirá como una aplicación nativa sin barras de navegación.

### En Android (Chrome):
1. Abre el enlace en **Google Chrome**.
2. Toca los tres puntos del menú superior derecho.
3. Toca **"Instalar aplicación"** o **"Añadir a pantalla de inicio"**.
4. ¡Listo! La app quedará instalada con su propio icono.

---

## ✨ Características
- ⚡ **100% Mobile-first:** Diseñado específicamente para pantallas táctiles de celulares.
- 🎨 **Estilos rápidos:** Realista, Anime, Cyberpunk, Pintura al óleo, 3D Render y Fantasía.
- 💾 **Historial local:** Guarda tus imágenes generadas en el teléfono.
- 📥 **Descarga y compartir nativo:** Botón para guardar directo en la galería o compartir por WhatsApp, Instagram, etc.
- ⚙️ **Configuración flexible:** Permite cambiar el Space o ingresar un Token de Hugging Face personal.
