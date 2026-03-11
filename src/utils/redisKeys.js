export const getVideoRedisKey = (videoId) => {
  return `video:detail:${videoId}`;
};

export const getVideoCommentsVersionKey = (videoId) =>
  `video:${videoId}:comments:version`;

export const getVideoCommentKey = (videoId, page, limit, version) =>
  `video:${videoId}:comments:v:${version}:page:${page}:limit:${limit}`;
