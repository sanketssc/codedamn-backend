FROM node:20

WORKDIR /react-app

COPY react-app /react-app

RUN npm install

WORKDIR /app

COPY package*.json /app/

RUN npm install

COPY index.js /app

CMD ["npm", "run", "start"]