FROM node:22.23.2-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS dependencies
WORKDIR /app
RUN npm install --global npm@10.9.8
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM node:22.23.2-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_MODE=prod
ARG NEXT_PUBLIC_DEV_API_URL
ARG NEXT_PUBLIC_PROD_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_MODE=$NEXT_PUBLIC_MODE \
    NEXT_PUBLIC_DEV_API_URL=$NEXT_PUBLIC_DEV_API_URL \
    NEXT_PUBLIC_PROD_API_URL=$NEXT_PUBLIC_PROD_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN node --input-type=module -e "import('./config/securityHeaders.mjs').then(({validatePublicBuildConfig}) => validatePublicBuildConfig())" \
    && npm run build \
    && npm run verify:client-config

FROM node:22.23.2-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS runner
WORKDIR /app
ENV HOSTNAME=0.0.0.0 \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=4000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
