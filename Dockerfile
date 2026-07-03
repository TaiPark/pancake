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
COPY --from=builder /workspace/node_modules/prisma ./node_modules/prisma
COPY --from=builder /workspace/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /workspace/node_modules/@standard-schema ./node_modules/@standard-schema
COPY --from=builder /workspace/node_modules/c12 ./node_modules/c12
COPY --from=builder /workspace/node_modules/chokidar ./node_modules/chokidar
COPY --from=builder /workspace/node_modules/citty ./node_modules/citty
COPY --from=builder /workspace/node_modules/confbox ./node_modules/confbox
COPY --from=builder /workspace/node_modules/consola ./node_modules/consola
COPY --from=builder /workspace/node_modules/deepmerge-ts ./node_modules/deepmerge-ts
COPY --from=builder /workspace/node_modules/defu ./node_modules/defu
COPY --from=builder /workspace/node_modules/destr ./node_modules/destr
COPY --from=builder /workspace/node_modules/dotenv ./node_modules/dotenv
COPY --from=builder /workspace/node_modules/effect ./node_modules/effect
COPY --from=builder /workspace/node_modules/empathic ./node_modules/empathic
COPY --from=builder /workspace/node_modules/exsolve ./node_modules/exsolve
COPY --from=builder /workspace/node_modules/fast-check ./node_modules/fast-check
COPY --from=builder /workspace/node_modules/giget ./node_modules/giget
COPY --from=builder /workspace/node_modules/jiti ./node_modules/jiti
COPY --from=builder /workspace/node_modules/node-fetch-native ./node_modules/node-fetch-native
COPY --from=builder /workspace/node_modules/nypm ./node_modules/nypm
COPY --from=builder /workspace/node_modules/ohash ./node_modules/ohash
COPY --from=builder /workspace/node_modules/pathe ./node_modules/pathe
COPY --from=builder /workspace/node_modules/perfect-debounce ./node_modules/perfect-debounce
COPY --from=builder /workspace/node_modules/pkg-types ./node_modules/pkg-types
COPY --from=builder /workspace/node_modules/pure-rand ./node_modules/pure-rand
COPY --from=builder /workspace/node_modules/rc9 ./node_modules/rc9
COPY --from=builder /workspace/node_modules/readdirp ./node_modules/readdirp
COPY --from=builder /workspace/node_modules/tinyexec ./node_modules/tinyexec
COPY --from=builder /workspace/package.json ./package.json
COPY --from=builder /workspace/tsconfig.json ./tsconfig.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
