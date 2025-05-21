const express = require("express");
const router = express.Router();
const axios = require("axios");

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user dan dapatkan token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: superadmin@tuv.com
 *               password:
 *                 type: string
 *                 example: CbOfJO0TVe9Y
 *     responses:
 *       200:
 *         description: Login berhasil dan mengembalikan data token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Token autentikasi JWT
 *       400:
 *         description: Permintaan tidak valid (misal email/password kosong)
 *       401:
 *         description: Email atau password salah
 *       500:
 *         description: Kesalahan server saat login
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email dan password wajib diisi" });
    }

    const response = await axios.post(
      "https://api-dev-clinic.medqcare.id/api/v1/users/signin",
      { email, password }
    );

    // Anggap respons dari API eksternal berisi token atau data login
    res.status(200).json(response.data);
  } catch (error) {
    if (error.response) {
      // Tanggapi error dari API eksternal, misal 401 Unauthorized
      return res.status(error.response.status).json(error.response.data);
    }
    console.error("Error saat login:", error.message);
    res.status(500).json({ message: "Kesalahan server saat login" });
  }
});

module.exports = router;
