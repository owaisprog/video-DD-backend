FROM node:22-alpine

WORKDIR /usr/src/app/backend
ENV NODE_ENV=production

# Copy package files with correct ownership
COPY --chown=node:node package*.json ./

# Ensure the working directory and node_modules have correct permissions for the node user
RUN chown -R node:node /usr/src/app/backend

USER node

# Use node's home for npm cache (no npm set cache needed)
RUN --mount=type=cache,target=/home/node/.npm-backend npm ci

COPY --chown=node:node . .

# Build needs dev deps; then remove dev deps for runtime
RUN npm run build  

EXPOSE 4000
CMD ["npm","start"]