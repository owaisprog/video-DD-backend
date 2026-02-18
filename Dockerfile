FROM node:22-alpine

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy package files with correct ownership
COPY --chown=node:node package*.json ./

USER node

# Use node's home for npm cache (no npm set cache needed)
RUN --mount=type=cache,target=/home/node/.npm npm ci

COPY --chown=node:node . .

# Build needs dev deps; then remove dev deps for runtime
RUN npm run build && npm prune --omit=dev

EXPOSE 4000
CMD ["npm","start"]
