FROM node:22-alpine

WORKDIR /usr/src/app/backend
ENV NODE_ENV=production

COPY --chown=node:node package*.json ./

# Install ffmpeg/ffprobe and create shared upload dir
RUN apk add --no-cache ffmpeg \
    && mkdir -p /shared/uploads \
    && chown -R node:node /usr/src/app/backend /shared/uploads

ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe
ENV UPLOAD_TEMP_DIR=/shared/uploads

USER node

RUN --mount=type=cache,target=/home/node/.npm-backend npm ci

COPY --chown=node:node . .

EXPOSE 10000
CMD ["npm", "start"]