FROM node:20-alpine

WORKDIR /app

# Copy ONLY package files first
COPY package.json package-lock.json ./

# Now run npm ci (has lock file, no other files needed)
RUN npm ci

# Then copy the rest of your source code
COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
