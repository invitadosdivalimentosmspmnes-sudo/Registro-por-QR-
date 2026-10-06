/**
 * Utilidades QR compartidas.
 * Lectura: usa jsQR sobre frames de <video> capturados en un <canvas> oculto.
 * Generación: usa la librería "qrcode" (window.QRCode) para dibujar en <canvas> o generar dataURL.
 */

const QrScanner = (function () {
  let stream = null;
  let rafId = null;
  let canvasOculto = null;
  let ctxOculto = null;

  async function iniciar(videoEl, onDetectado, onEstado) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onEstado && onEstado('sin-camara');
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
    } catch (e) {
      onEstado && onEstado('permiso-denegado');
      return;
    }

    videoEl.srcObject = stream;
    await videoEl.play();

    canvasOculto = document.createElement('canvas');
    ctxOculto = canvasOculto.getContext('2d', { willReadFrequently: true });

    onEstado && onEstado('activo');
    loop(videoEl, onDetectado);
  }

  function loop(videoEl, onDetectado) {
    if (!stream) return;
    if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
      canvasOculto.width = videoEl.videoWidth;
      canvasOculto.height = videoEl.videoHeight;
      ctxOculto.drawImage(videoEl, 0, 0, canvasOculto.width, canvasOculto.height);
      const frame = ctxOculto.getImageData(0, 0, canvasOculto.width, canvasOculto.height);
      const codigo = window.jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' });
      if (codigo && codigo.data) {
        onDetectado(codigo.data);
        return; // el llamador decide si reinicia el loop
      }
    }
    rafId = requestAnimationFrame(function () { loop(videoEl, onDetectado); });
  }

  function reanudar(videoEl, onDetectado) {
    loop(videoEl, onDetectado);
  }

  function detener() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
  }

  return { iniciar: iniciar, detener: detener, reanudar: reanudar };
})();

async function dibujarQr(canvasEl, texto) {
  await window.QRCode.toCanvas(canvasEl, texto, {
    width: 168,
    margin: 1,
    color: { dark: '#0B1F3A', light: '#FFFFFF' }
  });
}

async function qrComoDataUrl(texto) {
  return window.QRCode.toDataURL(texto, {
    width: 480,
    margin: 1,
    color: { dark: '#0B1F3A', light: '#FFFFFF' }
  });
}

function descargarDataUrl(dataUrl, nombreArchivo) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
