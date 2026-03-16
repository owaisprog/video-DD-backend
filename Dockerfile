FROM node:22-alpine

WORKDIR /usr/src/app/backend
ENV NODE_ENV=production

COPY --chown=node:node package*.json ./

# Create app dirs first, including temp upload dir
RUN mkdir -p /usr/src/app/backend/public/temp \
    && chown -R node:node /usr/src/app/backend

USER node

RUN --mount=type=cache,target=/home/node/.npm-backend npm ci

COPY --chown=node:node . .

EXPOSE 10000
CMD ["npm", "start"]