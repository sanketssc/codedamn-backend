// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const { spawn } = require("child_process");

const projects = {};
const ports = {
  0: { frontend: 3001, backend: 5001 },
  1: { frontend: 3002, backend: 5002 },
  2: { frontend: 3003, backend: 5003 },
  3: { frontend: 3004, backend: 5004 },
  4: { frontend: 3005, backend: 5005 },
  5: { frontend: 3006, backend: 5006 },
  6: { frontend: 3007, backend: 5007 },
  7: { frontend: 3008, backend: 5008 },
  8: { frontend: 3009, backend: 5009 },
  9: { frontend: 3010, backend: 5010 },
};

const app = express();
app.use(express.json());
app.use(cors());

app.post("/api/project", (req, res) => {
  try {
    const { project, skeleton } = req.body;

    const index = Object.keys(projects).findIndex((p) => p === project);
    if (index !== -1) {
      res.json({ status: "success", message: "Project already exists" });
      return;
    }

    if (Object.keys(projects).length >= 10) {
      res.json({ status: "error", message: "Maximum projects reached" });
      return;
    }
    projects[project] = {
      skeleton: skeleton,
      running: false,
      port: ports[Object.keys(projects).length],
    };
    console.log("req received");
    res.json({ status: "success", message: "Project created" });
  } catch (error) {
    res.json({ status: "error", message: "Error creating project" });
  }
});

app.post("/api/project/run", (req, res) => {
  console.log(projects);
  try {
    const { project } = req.body;
    if (!projects[project]) {
      res.json({ status: "error", message: "Project not found" });
      return;
    }
    if (!projects[project].running) {
      console.log("running container");
      projects[project].running = true;
      console.log(projects);

      const docker = spawn("docker", [
        "run",
        "-dp",
        `${projects[project].port.frontend}:3000`,
        "-p",
        `${projects[project].port.backend}:5000`,
        "--name",
        `${project}-${projects[project].skeleton}-con`,
        `${projects[project].skeleton}-full:latest`,
      ]);

      docker.stdout.on("data", (data) => {
        console.log(data.toString());
      });

      docker.stderr.on("data", (data) => {
        console.log(data.toString());
        const docker2 = spawn("docker", [
          "start",
          `${project}-${projects[project].skeleton}-con`,
        ]);
        docker2.stdout.on("data", (data) => {
          console.log(data.toString());
        });
        docker2.stderr.on("data", (data) => {
          console.log(data.toString());
        });
        docker2.on("close", (code) => {
          console.log(`child process2 exited with code ${code}`);
        });
      });

      docker.on("close", (code) => {
        console.log(`child process exited with code ${code}`);
        res.json({ status: "success", ports: projects[project].port });
      });
    } else {
      const docker3 = spawn("docker", [
        "start",
        `${project}-${projects[project].skeleton}-con`,
      ]);
      docker3.stdout.on("data", (data) => {
        console.log(data.toString());
      });
      docker3.stderr.on("data", (data) => {
        console.log(data.toString());
      });
      docker3.on("close", (code) => {
        console.log(`child process3 exited with code ${code}`);
      });
      res.json({
        status: "success",
        message: "Project already running",
        ports: projects[project].port,
      });
    }
    // res.json({ status: "error", message: "Project already running" });
  } catch (error) {
    console.log(error);
    res.json({ status: "error", message: "Error running project" });
  }
});

app.post("/api/project/stop", (req, res) => {
  try {
    const { project } = req.body;
    if (!projects[project]) {
      res.json({ status: "error", message: "Project not found" });
      return;
    }
    console.log(projects);
    if (projects[project].running) {
      console.log("stopping container");
      const docker = spawn("docker", [
        "stop",
        `${project}-${projects[project].skeleton}-con`,
      ]);

      docker.stdout.on("data", (data) => {
        console.log(data.toString());
      });

      docker.stderr.on("data", (data) => {
        console.log(data.toString());
      });

      docker.on("close", (code) => {
        console.log(`child process exited with code ${code}`);
        projects[project].running = false;
        res.json({ status: "success" });
      });
    } else {
      res.json({ status: "error", message: "Project not running" });
    }
  } catch (error) {
    res.json({ status: "error", message: "Error stopping project" });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
