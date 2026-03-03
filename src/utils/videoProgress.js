import redis from "../config/redisConfig.js";

export const progressKey = (videoId) => `progress:video:${videoId}`;

export async function setVideoProgress(videoId, { progress, status, message }) {
  await redis.hset(progressKey(videoId), {
    progress: String(progress),
    status,
    message,
    updatedAt: new Date().toISOString(),
  });
}

export async function getVideoProgress(videoId) {
  const data = await redis.hgetall(progressKey(videoId));
  return data && Object.keys(data).length ? data : null;
}
