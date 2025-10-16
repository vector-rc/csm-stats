FROM oven/bun:1.3 AS base

WORKDIR /app

COPY package.json *.lock ./

RUN bun install

COPY src src
COPY tsconfig.json .

EXPOSE 3000
ENTRYPOINT [ "bun", "run", "src/index.ts" ]
