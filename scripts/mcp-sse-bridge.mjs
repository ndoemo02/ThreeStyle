import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { parse } from "node:url";

const PORT = parseInt(process.env.PORT || "8000", 10);
const WRAPPER = "/home/frees/agentmemory-mcp-wrapper.sh";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization");
}

function sendSSE(res, data, event) {
  if (event) res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// Track active SSE connections so we can clean up
const activeSessions = new Map();

const server = createServer((req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = parse(req.url, true);
  const pathname = url.pathname;

  if ((pathname === "/sse" || pathname === "/mcp") && req.method === "GET") {
    const sessionId = randomUUID();
    console.log(`[bridge] SSE session start: ${sessionId}`);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    const child = spawn("/bin/bash", [WRAPPER], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    activeSessions.set(sessionId, child);

    let buffer = "";

    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const msg = JSON.parse(trimmed);
          // Only forward JSON-RPC messages as SSE
          if (msg.jsonrpc) {
            sendSSE(res, msg, "message");
          }
        } catch (e) {
          console.log(`[bridge] non-JSON stdout: ${trimmed.slice(0, 120)}`);
        }
      }
    });

    child.stderr.on("data", (d) => {
      const text = d.toString().trim();
      if (text) console.log(`[bridge] stderr: ${text}`);
    });

    child.on("close", (code) => {
      console.log(`[bridge] child exited (${code}), session: ${sessionId}`);
      activeSessions.delete(sessionId);
      if (!res.writableEnded) {
        res.end();
      }
    });

    req.on("close", () => {
      console.log(`[bridge] SSE client disconnected, session: ${sessionId}`);
      activeSessions.delete(sessionId);
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, 3000);
    });

    // Send endpoint info as first SSE event (raw URI, NOT JSON)
    res.write("event: endpoint\n");
    res.write(`data: /message?sessionId=${sessionId}\n\n`);
    return;
  }

  if ((pathname === "/message" || pathname === "/sse" || pathname === "/mcp") && req.method === "POST") {
    let body = "";
    req.on("data", (d) => { body += d; });
    req.on("end", () => {
      let msg;
      try {
        msg = JSON.parse(body);
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }

      const sessionId = url.query.sessionId || "nosession";
      const isNotification = !("id" in msg);
      console.log(`[bridge] POST message session=${sessionId}: ${msg.method || "init"}${isNotification ? " (notify)" : ""}`);

      // Notifications: no response expected — just forward and return 202
      if (isNotification) {
        const child = spawn("/bin/bash", [WRAPPER], {
          stdio: ["pipe", "pipe", "pipe"],
          env: { ...process.env },
        });
        child.stdin.write(JSON.stringify(msg));
        child.stdin.write("\n");
        child.stdin.end();
        child.stderr.on("data", (d) => {
          const text = d.toString().trim();
          if (text) console.log(`[bridge] notify stderr: ${text}`);
        });
        // Give the child a moment to process, then respond
        setTimeout(() => {
          res.writeHead(202, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ jsonrpc: "2.0", result: "accepted" }));
          child.kill("SIGTERM");
        }, 500);
        return;
      }

      // Requests: spawn child and wait for JSON-RPC response
      const child = spawn("/bin/bash", [WRAPPER], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env },
      });

      let responseBuffer = "";
      let responseSent = false;
      let timeout;

      const sendTimeout = () => {
        if (!responseSent) {
          responseSent = true;
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Timeout waiting for response" },
            id: msg.id || null,
          }));
          child.kill("SIGKILL");
        }
      };

      timeout = setTimeout(sendTimeout, 30000);

      child.stdout.on("data", (chunk) => {
        responseBuffer += chunk.toString();
        if (responseSent) return;

        const lines = responseBuffer.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          try {
            const response = JSON.parse(line);
            if (!responseSent && response.jsonrpc && ("id" in response || "result" in response || "error" in response)) {
              responseSent = true;
              clearTimeout(timeout);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(response));
              child.kill("SIGTERM");
              return;
            }
          } catch (e) { /* wait for more data */ }
        }
      });

      child.stderr.on("data", (d) => {
        const text = d.toString().trim();
        if (text) console.log(`[bridge] message stderr: ${text}`);
      });

      child.on("close", () => {
        clearTimeout(timeout);
        if (!res.writableEnded) {
          res.end();
        }
      });

      child.stdin.write(JSON.stringify(msg));
      child.stdin.write("\n");
      child.stdin.end();
    });
    return;
  }

  if (pathname === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", server: "agentmemory-mcp-bridge", version: "1.0" }));
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

// Cleanup handler
process.on("SIGTERM", () => {
  console.log("[bridge] Shutting down...");
  for (const [sid, child] of activeSessions) {
    child.kill("SIGTERM");
  }
  server.close();
  process.exit(0);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[bridge] MCP SSE bridge listening on http://127.0.0.1:${PORT}`);
  console.log(`[bridge] SSE: http://127.0.0.1:${PORT}/sse`);
  console.log(`[bridge] Msg: http://127.0.0.1:${PORT}/message`);
});
