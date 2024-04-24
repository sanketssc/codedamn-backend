FROM node:20

WORKDIR /next-app

COPY next-app /next-app

RUN npm install

WORKDIR /app

COPY package*.json /app/

RUN npm install

COPY index.js /app

CMD ["npm", "run", "start"]