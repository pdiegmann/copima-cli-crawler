import getPort from "get-port";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer } from "node:http";
import { URL } from "node:url";
import { createLogger } from "../logging/logger.js";
import type { AuthServerConfig, OAuth2CallbackParams } from "./types.js";

const logger = createLogger("OAuth2Server");

export class OAuth2Server {
  private server: any = null;
  private port: number;
  private timeout: number;
  private callbackPath: string;
  private useHttps: boolean;
  private httpsOptions?: { key?: string; cert?: string };
  private callbackPromise: Promise<OAuth2CallbackParams> | null = null;
  private callbackResolve: ((params: OAuth2CallbackParams) => void) | null = null;

  constructor(config: AuthServerConfig) {
    this.port = config.port;
    this.timeout = config.timeout;
    this.callbackPath = config.callbackPath;
    // Default to HTTP for localhost OAuth2 callback (standard practice)
    // Allow HTTPS when certificates are provided
    this.useHttps = config.useHttps === true && !!config.httpsOptions?.key && !!config.httpsOptions?.cert;
    this.httpsOptions = config.httpsOptions;
  }

  async start(): Promise<void> {
    if (this.server) {
      throw new Error("Server is already running");
    }

    // Find available port
    this.port = await this.findAvailablePort(this.port);
    logger.info(`Starting OAuth2 callback server on port ${this.port}`);

    // Create server - use HTTPS if certificates are provided, otherwise HTTP
    if (this.useHttps && this.httpsOptions?.key && this.httpsOptions?.cert) {
      // Import https dynamically to avoid bundling when not used
      const https = await import("node:https");
      this.server = https.createServer(
        {
          key: this.httpsOptions.key,
          cert: this.httpsOptions.cert,
        },
        (req, res) => {
          this.handleRequest(req, res);
        }
      );
      logger.info("Created HTTPS server for OAuth2 callback");
    } else {
      // Use HTTP for localhost OAuth2 callback (standard practice for OAuth2 flows)
      this.server = createServer((req, res) => {
        this.handleRequest(req, res);
      });
      this.useHttps = false; // Ensure we track the actual protocol being used
      if (this.httpsOptions) {
        logger.info("HTTPS requested but using HTTP for localhost OAuth2 callback (this is standard practice for OAuth2 flows)");
      }
    }

    // Start server
    await new Promise<void>((resolve, reject) => {
      this.server!.listen(this.port, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const protocol = this.useHttps ? "https" : "http";
    logger.info(`OAuth2 callback server started at ${protocol}://localhost:${this.port}${this.callbackPath}`);
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    logger.info("Stopping OAuth2 callback server");

    await new Promise<void>((resolve) => {
      this.server!.close(() => {
        resolve();
      });
    });

    this.server = null;
    this.callbackPromise = null;
    this.callbackResolve = null;

    logger.info("OAuth2 callback server stopped");
  }

  async findAvailablePort(preferredPort?: number): Promise<number> {
    return await getPort({
      port: preferredPort ? [preferredPort, 3000, 3001, 3002, 3003, 3004, 3005] : [3000, 3001, 3002, 3003, 3004, 3005],
    });
  }

  waitForCallback(): Promise<OAuth2CallbackParams> {
    if (!this.callbackPromise) {
      this.callbackPromise = new Promise<OAuth2CallbackParams>((resolve, reject) => {
        this.callbackResolve = resolve;

        // Set timeout
        const timeoutId = setTimeout(() => {
          reject(new Error(`OAuth2 callback timeout after ${this.timeout}ms`));
        }, this.timeout);

        // Clear timeout when resolved
        const originalResolve = resolve;
        this.callbackResolve = (params: OAuth2CallbackParams): void => {
          clearTimeout(timeoutId);
          originalResolve(params);
        };
      });
    }

    return this.callbackPromise;
  }

  getCallbackUrl(): string {
    const protocol = this.useHttps ? "https" : "http";
    return `${protocol}://localhost:${this.port}${this.callbackPath}`;
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const protocol = this.useHttps ? "https" : "http";
    const url = new URL(req.url || "", `${protocol}://localhost:${this.port}`);

    // Only handle callback path
    if (url.pathname !== this.callbackPath) {
      this.sendErrorResponse(res, 404, "Not Found");
      return;
    }

    // Extract callback parameters
    const params: OAuth2CallbackParams = {
      code: url.searchParams.get("code") || undefined,
      state: url.searchParams.get("state") || undefined,
      error: url.searchParams.get("error") || undefined,
      error_description: url.searchParams.get("error_description") || undefined,
    };

    logger.info("Received OAuth2 callback", { hasCode: !!params.code, hasError: !!params.error });

    // Send response to browser
    if (params.error) {
      // Send plain text error response to prevent XSS
      this.sendErrorResponse(res, 400, "Authorization failed");
    } else if (params.code) {
      this.sendSuccessResponse(res);
    } else {
      this.sendErrorResponse(res, 400, "Invalid callback - missing authorization code");
    }

    // Resolve the promise
    if (this.callbackResolve) {
      this.callbackResolve(params);
    }
  }

  private sendSuccessResponse(res: ServerResponse): void {
    // Static HTML response with no user input to prevent XSS
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authorization Successful</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background-color: #f8f9fa;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 400px;
        }
        .icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            color: #28a745;
        }
        h1 {
            color: #28a745;
            margin-bottom: 1rem;
        }
        p {
            color: #6c757d;
            line-height: 1.5;
        }
        .close-button {
            margin-top: 1rem;
            padding: 0.5rem 1rem;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✅</div>
        <h1>Authorization Successful</h1>
        <p>Authorization successful! You can close this window.</p>
        <button class="close-button" onclick="window.close()">Close Window</button>
    </div>
    <script>
        setTimeout(() => window.close(), 3000);
    </script>
</body>
</html>`;

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": Buffer.byteLength(html),
    });
    res.end(html);
  }

  private sendErrorResponse(res: ServerResponse, status: number, message: string): void {
    res.writeHead(status, {
      "Content-Type": "text/plain",
      "Content-Length": Buffer.byteLength(message),
    });
    res.end(message);
  }
}
