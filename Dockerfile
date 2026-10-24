# Dockerfile para quipu-server (NestJS Backend)

FROM node:24.22.1-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Instalar pnpm
RUN npm install -g pnpm@11.24.0

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Compilar la aplicación
RUN pnpm run build

# Imagen de producción
FROM node:24.22.1-alpine

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm@11.24.0

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Instalar solo dependencias de producción
RUN pnpm install --prod --frozen-lockfile

# Copiar código compilado desde el builder
COPY --from=builder /app/dist ./dist

# Exponer puerto
EXPOSE 3070

# Comando para iniciar la aplicación
CMD ["node", "dist/src/main.js"]
