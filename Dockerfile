# The MindSuite Guide server as a container, for dev.mindsuite.in or any Docker host.
#   docker build -t mindsuite-guide .
#   docker run -d --env-file .env -p 8787:8787 -v mindsuite-guide-data:/app/data mindsuite-guide
# Put HTTPS in front of it (Caddy, nginx or the host's proxy): the website is served over HTTPS
# and browsers block calls from it to a plain-HTTP server.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8787 USAGE_FILE=/app/data/usage.json
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node server ./server
COPY src ./src
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 8787
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8787/api/health || exit 1
CMD ["node", "server/index.js"]
