import http from "http";
import { Server } from "socket.io";
import pty from "node-pty";

const shell = "bash";

import fs from "fs";
import path from "path";

const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const details = {};

function getFiles(fPath, f) {
  // console.log(fPath, f);
  try {
    const files = fs.readdirSync(fPath);
    files.map((file) => {
      if (file === ".git") return;
      const filePath = path.join(fPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        const idx = f.findIndex((o) => o.name === file);
        if (idx !== -1) {
          f[idx].files.push({
            name: file,
            type: "folder",
            isOpen: false,
            path: filePath,
            files: [],
          });
          getFiles(filePath, f[idx].files.files);
        } else {
          f.push({
            name: file,
            type: "folder",
            path: filePath,
            isOpen: false,
            files: [],
          });
          getFiles(filePath, f[f.length - 1].files);
        }
      } else {
        const idx = f.findIndex((o) => o.name === file);
        if (idx !== -1) {
          f[idx].files.push({ name: file, type: "file", path: filePath });
        } else {
          f.push({ name: file, type: "file", path: filePath });
        }
      }
      f.sort((a, b) => {
        if (a.type === "folder") {
          if (b.type === "folder") {
            return a.name > b.name;
          } else {
            return -1;
          }
        }
        return 1;
      });
    });
  } catch (err) {
    console.log(fPath, f);
    console.log(err);
  }
}

let userid = null;

io.on("connection", (socket) => {
  console.log(`a user connected: ${socket.id}`);
  if (userid === null) {
    userid = socket.id;
  } else if (userid !== socket.id) {
    io.to(userid).emit("secondconnection", "Another user connected");
    userid = socket.id;
  }

  const ptyProcess = pty.spawn(shell, [], {
    name: "xterm-color",
    cols: 80,
    rows: 30,
    cwd: "/react-app",
    env: process.env,
  });

  ptyProcess.write("npm run dev\r\n");

  ptyProcess.onData((data) => {
    socket.emit("terminal", data);
  });

  socket.on("terminal", (data) => {
    ptyProcess.write(data);
  });

  socket.on("resize", (data) => {
    ptyProcess.resize(data.cols, data.rows);
  });

  socket.on("file-content", (path) => {
    const data = fs.readFileSync(path, "utf8");
    socket.emit("file-content", data);
  });

  socket.on("info", (msg) => {
    details["project"] = msg.project;
    details["frontendPort"] = msg.frontendPort;
    details["backendPort"] = msg.backendPort;
    const files = [
      {
        name: "code",
        type: "folder",
        isOpen: true,
        path: "/react-app",
        files: [],
      },
    ];
    getFiles("/react-app", files[0].files);
    socket.emit("files", files);
  });

  socket.on("msg", (msg) => {
    console.log(`message: ${msg}`);
    socket.emit("msg", `You said: ${msg}`);
  });

  socket.on("file-save", (data) => {
    const { file, content } = JSON.parse(data);
    fs.writeFileSync(file, content);
  });

  socket.on("create-file", (data) => {
    console.log(data);
    const { path, type } = data;
    if (type === "file") {
      let pathArr = path.split("/");
      const _f = pathArr.pop();

      let pth = "/";
      for (const p of pathArr) {
        pth = `${pth}/${p}`;
        if (!fs.existsSync(pth)) {
          fs.mkdirSync(pth);
        }
      }

      fs.writeFileSync(path, "");
    } else {
      let pathArr = path.split("/");
      let pth = "/";
      for (const p of pathArr) {
        pth = `${pth}/${p}`;
        if (!fs.existsSync(pth)) {
          fs.mkdirSync(pth);
        }
      }
    }

    const files = [
      {
        name: "code",
        type: "folder",
        isOpen: true,
        path: "/react-app",
        files: [],
      },
    ];
    getFiles("/react-app", files[0].files);
    socket.emit("files", files);
  });

  socket.on("delete-file", (data) => {
    const { path, type } = data;
    if (type === "file") {
      fs.unlinkSync(path);
    }
    if (type === "folder") {
      fs.rmdirSync(path, { recursive: true });
    }

    const files = [
      {
        name: "code",
        type: "folder",
        isOpen: true,
        path: "/react-app",
        files: [],
      },
    ];

    getFiles("/react-app", files[0].files);
    socket.emit("files", files);
  });

  socket.on("disconnecting", async () => {
    console.log("user disconnecting");
    console.log(details);
  });
  socket.on("disconnect", async () => {
    console.log("user disconnected");
    console.log(details);
    ptyProcess.kill();

    if (userid === socket.id) {
      userid = null;
      await fetch(`http://localhost:8000/api/stop`);
    }
  });
});

server.listen(5000, () => {
  console.log("listening on *:5000");
});
