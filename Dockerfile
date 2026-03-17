FROM node:22-alpine

WORKDIR /usr/src/app/backend
ENV NODE_ENV=production

COPY --chown=node:node package*.json ./

# Install system binaries needed by the worker
# Alpine's ffmpeg package includes both /usr/bin/ffmpeg and /usr/bin/ffprobe
RUN apk add --no-cache ffmpeg \
    && mkdir -p /usr/src/app/backend/public/temp \
    && chown -R node:node /usr/src/app/backend

# Make paths explicit for your worker code
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

USER node

RUN --mount=type=cache,target=/home/node/.npm-backend npm ci

COPY --chown=node:node . .

EXPOSE 10000
CMD ["npm", "start"]