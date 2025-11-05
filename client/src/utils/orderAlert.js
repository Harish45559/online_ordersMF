let alertAudio = null;

export function startOrderAlert() {
  try {
    if (!alertAudio) {
      alertAudio = new Audio("/sounds/new-order-alert.mp3");
      alertAudio.loop = true;
      alertAudio.volume = 0.8;
    }
    alertAudio.play().catch(() => {
      console.warn("User interaction required before autoplay.");
    });
  } catch (err) {
    console.error("Audio error:", err);
  }
}

export function stopOrderAlert() {
  try {
    if (alertAudio) {
      alertAudio.pause();
      alertAudio.currentTime = 0;
    }
  } catch (err) {
    console.error("Stop audio error:", err);
  }
}
