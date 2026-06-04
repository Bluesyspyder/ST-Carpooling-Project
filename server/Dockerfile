# Build environment
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (leverage cache)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]
