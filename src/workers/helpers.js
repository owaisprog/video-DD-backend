import { setVideoProgress } from "../utils/videoProgress.js";

export function startProgressTicker({
  videoId,
  from = 15,
  max = 55,
  step = 1,
  intervalMs = 1500,
}) {
  let current = from;
  let stopped = false;

  const timer = setInterval(async () => {
    if (stopped) return;
    if (current >= max) return;

    current += step;
    try {
      await setVideoProgress(videoId, {
        progress: current,
        status: "uploading",
        message: "Uploading...",
      });
    } catch {
      // ignore ticker errors
    }
  }, intervalMs);

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
