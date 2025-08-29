#https://hub.docker.com/_/node/
#https://github.com/GoogleContainerTools/distroless/blob/main/README.md
FROM node:24.7-alpine3.21 AS build
WORKDIR /wikiless
COPY . /wikiless
RUN npm install --omit=optional
FROM gcr.io/distroless/nodejs22-debian12
COPY --from=build /wikiless /wikiless
WORKDIR /wikiless
COPY wikiless.config config.js
CMD ["src/wikiless.js"]
