const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PDF Generator API",
      version: "1.0.0",
      description: "API untuk generate dan download PDF",
    },
    servers: [
      {
        url: "http://localhost:3002/api",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Masukkan token JWT di sini (prefix `Bearer ` otomatis ditambahkan)",
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js"], // path ke route yang akan didokumentasi
};

const specs = swaggerJsdoc(options);

function setupSwagger(app, swaggerOptions = {}) {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      persistAuthorization: true, // default tetap true
      ...swaggerOptions, // merge opsi tambahan
    })
  );
}

module.exports = setupSwagger;
