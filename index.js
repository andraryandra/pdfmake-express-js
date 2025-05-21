const express = require("express");
const app = express();
const port = 3002;

const pdfRoute = require("./routes/pdfRoute");
const authRoute = require("./routes/authRoute");
const setupSwagger = require("./config/swagger");

app.use(express.json());

// Pasang route
app.use("/api/pdf", pdfRoute);
app.use("/api/auth", authRoute);

setupSwagger(app, {
  persistAuthorization: true,
}); // pasang swagger di app

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
  console.log(`Dokumentasi Swagger: http://localhost:${port}/api-docs`);
});
