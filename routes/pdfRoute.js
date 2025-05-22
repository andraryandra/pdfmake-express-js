const express = require("express");
const router = express.Router();
const axios = require("axios");
const { generatePdf } = require("../services/pdfService");

/**
 * @swagger
 * /pdf/generate:
 *   get:
 *     summary: Generate PDF dari API eksternal berdasarkan regisId
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: regisId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID registrasi untuk mengambil data lab assessment
 *     responses:
 *       200:
 *         description: PDF berhasil dibuat dan ditampilkan inline
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Gagal membuat PDF
 */
router.get("/generate", async (req, res) => {
  const { regisId } = req.query;
  const authHeader = req.headers["authorization"];

  if (!regisId) {
    return res
      .status(400)
      .json({ message: "Parameter 'regisId' wajib diisi." });
  }

  try {
    // Ambil data dari API eksternal
    const response = await axios.get(
      `https://api-dev-clinic.medqcare.id/api/v1/assesments/lab_mcu_assesment/LabPreAssTUV/${regisId}`,
      {
        headers: {
          Authorization: process.env.TOKEN_USER,
          "x-secret": "123456",
          Service: "assesment",
        },
      }
    );

    if (!response.data || !response.data.data) {
      return res.status(502).json({
        message:
          "Data tidak ditemukan atau format data API eksternal tidak valid.",
      });
    }

    const rawData = response.data.data;

    // Generate PDF dengan rawData yang diambil dari API
    const pdfBuffer = await generatePdf(rawData, {
      query: req.query,
    });

    if (!pdfBuffer || !(pdfBuffer instanceof Buffer)) {
      return res.status(500).json({
        message: "Gagal membuat PDF: output generatePdf tidak valid.",
      });
    }

    // Kirim response PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=lab_preassessment_${regisId}.pdf`
    );

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Gagal generate PDF:", error);

    // Error dari axios request (API eksternal)
    if (error.response) {
      return res.status(error.response.status).json({
        message: `Gagal mengambil data dari API eksternal: ${error.response.statusText}`,
        details: error.response.data,
      });
    }

    // Error lain (misal error di generatePdf)
    return res.status(500).json({
      message: "Gagal membuat PDF karena kesalahan internal server.",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /pdf/data:
 *   get:
 *     summary: Ambil data lab assessment berdasarkan regisId
 *     description: Mengambil data lab MCU assessment dari API eksternal berdasarkan parameter regisId.
 *     parameters:
 *       - in: query
 *         name: regisId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID registrasi untuk mengambil data lab assessment
 *     responses:
 *       200:
 *         description: Data lab assessment berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Data hasil lab assessment
 *               example:
 *                 # Contoh struktur data bebas, sesuaikan dengan response API asli
 *                 patientName: "John Doe"
 *                 assessmentDate: "2025-05-22"
 *                 results:
 *                   - testName: "Spirometry"
 *                     value: "Normal"
 *       400:
 *         description: Parameter regisId tidak diisi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Parameter 'regisId' wajib diisi."
 *       502:
 *         description: Data dari API eksternal tidak ditemukan atau format tidak valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Data tidak ditemukan atau format data API eksternal tidak valid."
 *       default:
 *         description: Terjadi kesalahan saat pengambilan data dari API eksternal
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Gagal mengambil data dari API eksternal: Not Found"
 *                 details:
 *                   type: object
 *       500:
 *         description: Terjadi kesalahan pada server internal
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Terjadi kesalahan pada server."
 *                 error:
 *                   type: string
 *                   example: "Network Error"
 */
router.get("/data", async (req, res) => {
  const { regisId } = req.query;
  if (!regisId) {
    return res
      .status(400)
      .json({ message: "Parameter 'regisId' wajib diisi." });
  }

  try {
    // Ambil data dari API eksternal
    const response = await axios.get(
      `https://api-dev-clinic.medqcare.id/api/v1/assesments/lab_mcu_assesment/LabPreAssTUV/${regisId}`,
      {
        headers: {
          Authorization: process.env.TOKEN_USER,
          "x-secret": "123456",
          Service: "assesment",
        },
      }
    );

    if (!response.data || !response.data.data) {
      return res.status(502).json({
        message:
          "Data tidak ditemukan atau format data API eksternal tidak valid.",
      });
    }

    const rawData = response.data.data;

    // Kirim response ke client
    return res.json(rawData);
  } catch (error) {
    console.error("Gagal generate PDF:", error);

    if (error.response) {
      return res.status(error.response.status).json({
        message: `Gagal mengambil data dari API eksternal: ${error.response.statusText}`,
        details: error.response.data,
      });
    }

    // Error selain response error (network, timeout, dll)
    return res.status(500).json({
      message: "Terjadi kesalahan pada server.",
      error: error.message,
    });
  }
});

module.exports = router;
