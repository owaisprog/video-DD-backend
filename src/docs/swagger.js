import swaggerJSDoc from "swagger-jsdoc";
import path from "path";

const routesGlob = path
  .resolve(process.cwd(), "src/routes/**/*.js")
  .replace(/\\/g, "/"); // ✅ IMPORTANT (fix for windows/backslash)

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "YouTube Clone API",
      version: "1.0.0",
      description: "API documentation for YouTube clone backend",
    },
    servers: [{ url: "http://localhost:4000", description: "Local server" }],

    // ✅ ADD ONE DEFAULT PATH (so UI must show something)
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          tags: ["Test"],
          responses: {
            200: { description: "OK" },
          },
        },
      },
    },

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },

  apis: [routesGlob], // ✅ now swagger will scan your routes
};

export const swaggerSpec = swaggerJSDoc(options);

// ✅ Debug (see in terminal)
console.log("✅ Swagger scanning:", routesGlob);
console.log("✅ Swagger paths found:", Object.keys(swaggerSpec.paths || {}));
