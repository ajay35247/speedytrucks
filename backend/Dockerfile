FROM node:20-alpine

WORKDIR /app

COPY . .

RUN npm ci
RUN npx prisma generate
RUN npm run build

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
