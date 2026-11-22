FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY server ./server
RUN corepack enable && pnpm install --frozen-lockfile && pnpm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --prod --frozen-lockfile
COPY --from=build /app/dist-server ./dist-server
COPY index.html style.css app.js manus-routes.json ./
COPY img ./img
EXPOSE 3000
CMD ["node", "dist-server/server/index.js"]
