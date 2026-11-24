# Despliegue y ejecución – RutaSegura

## 1. Direcciones de acceso

- **Repositorio:** https://github.com/NicolasM2003/RutaSegura
- **Backend en Render:** https://rutasegura-0etp.onrender.com
- **Comprobación del backend:** https://rutasegura-0etp.onrender.com/health
- **Panel de Render:** https://dashboard.render.com/
- **Expo / EAS:** https://expo.dev/

## 2. Configuración necesaria

### Backend

El backend utiliza variables de entorno para conectarse a Supabase y OpenAI. En desarrollo local, se guardan en un archivo `.env` dentro de la carpeta del backend. Ejemplo de nombres y valores de configuración:

```env
PORT=3000
SUPABASE_URL=tu_supabase_url
SUPABASE_PUBLISHABLE_KEY=tu_clave
SUPABASE_SECRET_KEY=tu_clave_secreta
SUPABASE_JWKS_URL=tu_jwks_url

OPENAI_API_KEY=tu_clave_de_openai
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TIMEOUT_MS=12000
OPENAI_MAX_RETRIES=0
```

Reemplaza los valores de ejemplo por los de tu proyecto. En Render se configuran las variables necesarias desde **servicio del backend → Environment**. No subas el archivo `.env` ni compartas claves secretas.

### Aplicación móvil

La aplicación utiliza Expo/EAS. La clave `GOOGLE_MAPS_API_KEY` está configurada como variable sensible en el entorno `preview` de EAS. Mantén esa clave en la configuración de EAS y no dentro del código ni en el repositorio.

## 3. Ejecutar el proyecto localmente

Ejecuta los comandos desde la carpeta correspondiente, donde se encuentra el `package.json`.

**Backend**

```bash
npm install
node src/server.js
```

**Aplicación móvil**

```bash
npm install
npx expo start
```

Para probar desde un teléfono, la aplicación debe apuntar a una dirección del backend accesible desde el dispositivo. Para utilizar el backend publicado, configura la URL de Render indicada en la sección 1.

## 4. Desplegar y actualizar

### Backend en Render

1. Sube los cambios al repositorio y a la rama conectada al servicio de Render.
2. Render desplegará los cambios automáticamente si el despliegue automático está habilitado. De lo contrario, inicia un despliegue manual desde el panel.
3. Comprueba que el servicio aparezca como **Live** y revisa los logs.
4. Abre `https://rutasegura-0etp.onrender.com/health` y confirma que responde.

### Aplicación Android con EAS

Cuando haya cambios en la aplicación móvil, genera un nuevo APK de prueba desde la carpeta de la aplicación:

```bash
eas build --platform android --profile preview
```

Al finalizar, descarga el APK desde Expo/EAS e instálalo en el dispositivo para comprobar la nueva versión.

## 5. Comprobación final

Después de cada actualización:

- Verifica que el backend esté **Live** y que `/health` responda.
- Abre la aplicación y comprueba que se conecte al backend correcto.
- Calcula una ruta y confirma que se muestren las alternativas.
- Revisa los logs de Render si ocurre algún error.

**Nota:** La caché del backend se mantiene en memoria durante la ejecución del proceso y tiene un TTL de 24 horas. Se pierde al reiniciar o volver a desplegar el backend.
