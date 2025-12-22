FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

# Tailwind build runs during postinstall; make sure inputs exist before `npm ci`
COPY tailwind.config.cjs ./
COPY index.html ./
COPY src/tailwind.css ./src/tailwind.css

RUN npm ci

COPY . .

RUN npm run build:css

RUN npm prune --omit=dev

EXPOSE 3000

CMD ["npm", "start"]
