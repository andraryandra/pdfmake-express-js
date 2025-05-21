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
    return res.status(400).json({ message: "Parameter regisId wajib diisi" });
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
    const rawData = response.data.data;

    // Generate PDF dengan rawData yang diambil dari API
    const pdfBuffer = await generatePdf(rawData, {
      query: req.query,
    });

    // Kirim response PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=lab_preassessment_${regisId}.pdf`
    );

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Gagal generate PDF:", error.message);
    res.status(500).json({ message: "Gagal membuat PDF" });
  }
});

module.exports = router;
