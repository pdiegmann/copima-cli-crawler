import { hostname } from "os";

export class TemplateUtils {
  static interpolate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key]?.toString() || match;
    });
  }

  static interpolateDeep(obj: any, variables: Record<string, any>): any {
    if (typeof obj === "string") {
      return this.interpolate(obj, variables);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.interpolateDeep(item, variables));
    }

    if (typeof obj === "object" && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateDeep(value, variables);
      }
      return result;
    }

    return obj;
  }

  static getDefaultVariables(): Record<string, string> {
    return {
      HOME: process.env["HOME"] || process.env["USERPROFILE"] || "~",
      USER: process.env["USER"] || process.env["USERNAME"] || "unknown",
      CWD: process.cwd(),
      NODE_ENV: process.env["NODE_ENV"] || "development",
      PLATFORM: process.platform,
      ARCH: process.arch,
      HOSTNAME: hostname(),
      TIMESTAMP: new Date().toISOString(),
      DATE: new Date().toISOString().split("T")[0] || "",
      TIME: new Date().toTimeString().split(" ")[0] || "",
    };
  }

  static extractVariables(template: string): string[] {
    const matches = template.match(/\{(\w+)\}/g);
    return matches ? matches.map((match) => match.slice(1, -1)) : [];
  }

  static validateTemplate(template: string, requiredVars: string[]): string[] {
    const templateVars = this.extractVariables(template);
    return requiredVars.filter((variable) => !templateVars.includes(variable));
  }
}
