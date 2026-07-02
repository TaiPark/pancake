FROM node:22-alpine AS deps
WORKDIR /workspace
COPY package.json package-lock.json* ./
RUN npm ci --include=dev

FROM node:22-alpine AS builder
WORKDIR /workspace
COPY --from=deps /workspace/node_modules ./node_modules
COPY . .
RUN node -e "console.log('next', require('next/package.json').version); console.log('tailwindcss', require('tailwindcss/package.json').version); console.log('@tailwindcss/postcss', require.resolve('@tailwindcss/postcss'))"
RUN npx prisma generate
RUN npm run build && \
    if ! test -d .next/static/css || ! find .next/static/css -type f -name "*.css" | grep -q .; then \
      echo "ERROR: Next build did not emit CSS assets."; \
      echo "Contents of .next/static:"; \
      find .next/static -maxdepth 4 -type f | sort | sed -n '1,160p'; \
      exit 1; \
    fi

FROM node:22-alpine AS runner
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=builder /workspace/public ./public
COPY --from=builder /workspace/.next/standalone ./
COPY --from=builder /workspace/.next/static ./.next/static
RUN if ! test -d .next/static/css || ! find .next/static/css -type f -name "*.css" | grep -q .; then \
      echo "ERROR: CSS assets were not copied into the runner image."; \
      echo "Contents of .next/static:"; \
      find .next/static -maxdepth 4 -type f | sort | sed -n '1,160p'; \
      exit 1; \
    fi
COPY --from=builder /workspace/prisma ./prisma
COPY --from=builder /workspace/lib ./lib
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/package.json ./package.json
COPY --from=builder /workspace/tsconfig.json ./tsconfig.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
