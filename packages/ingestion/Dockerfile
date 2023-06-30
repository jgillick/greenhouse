FROM node:18-alpine
WORKDIR /app

COPY . .
RUN yarn install && yarn build

CMD ["yarn", "production"]
