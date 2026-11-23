FROM node:22-alpine
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps ./apps
COPY libs ./libs
RUN npm ci
COPY tsconfig.base.json ./
ARG APP
RUN rm -rf libs/contracts/dist libs/contracts/tsconfig.tsbuildinfo && npm run build -w @market/contracts && npm run build -w "@market/${APP}"
ENV APP=${APP}
CMD ["sh", "-c", "node apps/${APP}/dist/main.js"]
