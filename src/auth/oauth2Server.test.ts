import { OAuth2Server } from "./oauth2Server.js";
import type { AuthServerConfig, OAuth2CallbackParams } from "./types.js";

// Mock get-port
jest.mock("get-port", () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve(3001)),
}));

// Mock createLogger
jest.mock("../logging/logger.js", () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe("OAuth2Server", () => {
  let server: OAuth2Server;
  let config: AuthServerConfig;

  beforeEach(() => {
    config = {
      port: 3000,
      timeout: 10000,
      callbackPath: "/callback",
    };
    server = new OAuth2Server(config);
  });

  afterEach(async () => {
    try {
      await server.stop();
    } catch {
      // Server might not be running
    }
  });

  describe("Server Lifecycle", () => {
    it("should start server successfully", async () => {
      await server.start();

      const url = server.getCallbackUrl();
      expect(url).toMatch(/^http:\/\/localhost:\d+\/callback$/);
    });

    it("should stop server successfully", async () => {
      await server.start();
      await server.stop();

      // Starting again should work after stopping
      await server.start();
      await server.stop();
    });

    it("should throw error when starting already running server", async () => {
      await server.start();

      await expect(server.start()).rejects.toThrow("Server is already running");
    });

    it("should handle stop gracefully when server not running", async () => {
      await expect(server.stop()).resolves.not.toThrow();
    });
  });

  describe("Port Selection", () => {
    it("should find available port", async () => {
      const port = await server.findAvailablePort(3000);
      expect(typeof port).toBe("number");
      expect(port).toBeGreaterThan(0);
      expect(port).toBeLessThan(65536);
    });

    it("should find available port without preferred port", async () => {
      const port = await server.findAvailablePort();
      expect(typeof port).toBe("number");
      expect(port).toBeGreaterThan(0);
    });
  });

  describe("Callback Handling", () => {
    beforeEach(async () => {
      await server.start();
    });

    it("should handle successful callback", (done) => {
      const callbackPromise = server.waitForCallback();

      // Simulate callback request
      const mockRequest = {
        url: "/callback?code=test_code&state=test_state",
      } as any;
      const mockResponse = {
        writeHead: jest.fn(),
        end: jest.fn(),
      } as any;

      // Access private method through reflection
      (server as any).handleRequest(mockRequest, mockResponse);

      callbackPromise.then((params: OAuth2CallbackParams) => {
        expect(params.code).toBe("test_code");
        expect(params.state).toBe("test_state");
        expect(params.error).toBeUndefined();
        done();
      }).catch(done);
    });

    it("should handle error callback", (done) => {
      const callbackPromise = server.waitForCallback();

      const mockRequest = {
        url: "/callback?error=access_denied&error_description=User%20denied%20access",
      } as any;
      const mockResponse = {
        writeHead: jest.fn(),
        end: jest.fn(),
      } as any;

      (server as any).handleRequest(mockRequest, mockResponse);

      callbackPromise.then((params: OAuth2CallbackParams) => {
        expect(params.error).toBe("access_denied");
        expect(params.error_description).toBe("User denied access");
        expect(params.code).toBeUndefined();
        done();
      }).catch(done);
    });

    it("should handle invalid path", () => {
      const mockRequest = {
        url: "/invalid",
      } as any;
      const mockResponse = {
        writeHead: jest.fn(),
        end: jest.fn(),
      } as any;

      (server as any).handleRequest(mockRequest, mockResponse);

      expect(mockResponse.writeHead).toHaveBeenCalledWith(404, expect.any(Object));
    });

    it("should handle callback timeout", async () => {
      const shortTimeoutConfig = {
        ...config,
        timeout: 100, // Very short timeout
      };
      const shortTimeoutServer = new OAuth2Server(shortTimeoutConfig);

      try {
        await shortTimeoutServer.start();

        const callbackPromise = shortTimeoutServer.waitForCallback();

        await expect(callbackPromise).rejects.toThrow("OAuth2 callback timeout after 100ms");
      } finally {
        await shortTimeoutServer.stop();
      }
    });
  });

  describe("URL Generation", () => {
    beforeEach(async () => {
      await server.start();
    });

    it("should generate correct callback URL", () => {
      const url = server.getCallbackUrl();
      expect(url).toMatch(/^http:\/\/localhost:\d+\/callback$/);
    });
  });

  describe("Response Generation", () => {
    beforeEach(async () => {
      await server.start();
    });

    it("should send success response", () => {
      const mockResponse = {
        writeHead: jest.fn(),
        end: jest.fn(),
      } as any;

      (server as any).sendCallbackResponse(mockResponse, true, "Success message");

      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
        "Content-Type": "text/html; charset=utf-8",
      }));
      expect(mockResponse.end).toHaveBeenCalledWith(expect.stringContaining("Success message"));
      expect(mockResponse.end).toHaveBeenCalledWith(expect.stringContaining("Authorization Successful"));
    });

    it("should send error response", () => {
      const mockResponse = {
        writeHead: jest.fn(),
        end: jest.fn(),
      } as any;

      (server as any).sendCallbackResponse(mockResponse, false, "Error message");

      expect(mockResponse.writeHead).toHaveBeenCalledWith(400, expect.objectContaining({
        "Content-Type": "text/html; charset=utf-8",
      }));
      expect(mockResponse.end).toHaveBeenCalledWith(expect.stringContaining("Error message"));
      expect(mockResponse.end).toHaveBeenCalledWith(expect.stringContaining("Authorization Failed"));
    });
  });
});
