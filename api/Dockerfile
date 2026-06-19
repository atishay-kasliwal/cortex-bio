FROM node:22-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY db/package.json db/package-lock.json* ./db/
COPY db/prisma ./db/prisma/
COPY db/src ./db/src/
COPY db/tsconfig.json ./db/

COPY api/package.json api/package-lock.json* ./api/
COPY api/tsconfig.json ./api/
COPY api/src ./api/src/

COPY website ./website/
COPY playground ./playground/

WORKDIR /app/db
RUN npm install && npx prisma generate

WORKDIR /app/api
RUN npm install

EXPOSE 8000

CMD ["npx", "tsx", "src/index.ts"]
