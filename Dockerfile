# Estagio 1: Build da aplicacao React com Node
FROM node:20-alpine AS builder

WORKDIR /app

# Instala as dependencias do projeto
COPY package*.json ./
RUN npm ci

# Copia o codigo-fonte e compila os arquivos estaticos
COPY . .
RUN npm run build

# Estagio 2: Servidor web leve com Nginx para servir os arquivos estaticos (HTML/CSS/JS)
FROM nginx:alpine

# Configuracao para Single Page Application (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia o build estatico gerado para o diretorio padrao do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Expõe a porta 80 padrao do Nginx
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
