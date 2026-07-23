export const enterFullscreen = async (el = document.documentElement) => {
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
  } catch {
    // Fullscreen can be rejected (e.g. not triggered by direct user gesture,
    // or unsupported on the device) — the game still works windowed, so we
    // just swallow this rather than blocking play.
  }
};

export const exitFullscreen = async () => {
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
      await document.webkitExitFullscreen();
    }
  } catch {
    // ignore
  }
};

export const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
