// Mock for get-port module
import { jest } from "@jest/globals";

const getPort = jest.fn(() => Promise.resolve(3001));

export default getPort;
