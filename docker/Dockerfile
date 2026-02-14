FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN apk add --no-cache dumb-init

EXPOSE 3000

USER node

ENV NODE_ENV=production

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "server.js"]
