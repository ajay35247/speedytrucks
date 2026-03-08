FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN echo "=== Files ===" && ls -la /app && ls -la /app/src 2>/dev/null || echo "src NOT FOUND"
EXPOSE 5000
CMD ["sh", "-c", "SERVER=$(find /app -name 'server.js' | grep -v node_modules | head -1) && echo \"Starting: $SERVER\" && node $SERVER"]
