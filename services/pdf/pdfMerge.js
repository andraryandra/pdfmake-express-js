require("dotenv").config();
const PdfPrinter = require("pdfmake");
const { PDFDocument } = require("pdf-lib");
const path = require("path");
const fs = require("fs");
const {
  convertValueHtml,
  textHeaderTitle,
  textHeader,
  textLocales,
  formatDate,
  textContent,
  textContentValue,
} = require("../../utils/pdf/pdfUtils");

// ROOT folder project, sesuaikan jika perlu
const rootPath = path.resolve(__dirname, "..", ".."); // contoh: dari /services ke root proyek

/**
 * Membaca file aset secara async dan mengembalikan buffer-nya.
 * Path harus RELATIF dari root project, misal: "assets/fonts/Universe/UniversRegular.ttf"
 * @param {string} relativePath - Path relatif dari root project
 * @returns {Promise<Buffer>}
 */
const readAsset = async (relativePath) => {
  const fullPath = path.resolve(rootPath, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File tidak ditemukan: ${fullPath}`);
  }
  return fs.promises.readFile(fullPath);
};

// Fonts config
const fontsPath = "assets/fonts/Universe";

const fonts = {
  Universe: {
    normal: path.join(fontsPath, "UniversRegular.ttf"),
    bold: path.join(fontsPath, "UniversBold.ttf"),
    italics: path.join(fontsPath, "UniversLTStd-Obl.otf"),
    bolditalics: path.join(fontsPath, "UniversLTStd-BoldObl.otf"),
  },
};
const profile = {};

// Ambil path logo dari profile yang kosong
const logoPathFromProfile = profile.logoPath || "";
const secondLogoPathFromProfile = profile.secondLogoPath || "";

const logoExist =
  logoPathFromProfile && fs.existsSync(path.resolve(logoPathFromProfile));
const secondLogoExist =
  secondLogoPathFromProfile &&
  fs.existsSync(path.resolve(secondLogoPathFromProfile));

const logoPath = logoExist
  ? logoPathFromProfile
  : process.env.LOGO_PATH
  ? path.resolve(process.env.LOGO_PATH)
  : path.resolve("assets/images/default/logo.png");

const secondLogoPath = secondLogoExist
  ? secondLogoPathFromProfile
  : process.env.LOGO_KAB_PATH
  ? path.resolve(process.env.LOGO_KAB_PATH)
  : path.resolve("assets/images/default/logo2.png");

// Fungsi async membuat objek vfs
async function createVfs() {
  return {
    "assets/fonts/Universe/UniversRegular.ttf": await readAsset(
      "assets/fonts/Universe/UniversRegular.ttf"
    ),
    "assets/fonts/Universe/UniversBold.ttf": await readAsset(
      "assets/fonts/Universe/UniversBold.ttf"
    ),
    "assets/fonts/Universe/UniversLTStd-Obl.otf": await readAsset(
      "assets/fonts/Universe/UniversLTStd-Obl.otf"
    ),
    "assets/fonts/Universe/UniversLTStd-BoldObl.otf": await readAsset(
      "assets/fonts/Universe/UniversLTStd-BoldObl.otf"
    ),

    "logo.png": await fs.promises.readFile(logoPath),
    "logo2.png": await fs.promises.readFile(secondLogoPath),
    "signature.png": await readAsset(
      process.env.SIGNATURE_PATH || "assets/signatures/default/signature.png"
    ),
  };
}

async function createPdfPrinter() {
  const vfs = await createVfs();
  const printer = new PdfPrinter(fonts, { vfs });
  return { printer, vfs };
}

/**
 * Menghasilkan PDF dari data pemeriksaan (examData).
 * @param {Object} examData - Data pemeriksaan yang akan diubah menjadi PDF.
 * @param {number} index - Indeks pemeriksaan dalam daftar (opsional).
 * @returns {Promise<Buffer>} - Buffer PDF yang dihasilkan.
 */

function getHeader(
  departmentType,
  currentPage,
  pageCount,
  images,
  demography,
  data
) {
  const doctorName = data?.doctor?.name
    ? data.doctor.name
    : demography?.doctor
    ? demography.doctor
    : "";

  const commonHeader = [
    {
      margin: [0, 35, 0, 0],
      table: {
        widths: ["*"],
        body: [
          [
            {
              margin: [0, 0, 20, 0],
              alignment: "right",
              image: images?.logo,
              width: 220,
              height: 50,
            },
          ],
          [
            {
              margin: [0, 30, 40, 0],
              text: "",
              width: 200,
              height: 50,
            },
          ],
          [
            {
              margin: [0, 0, 0, 0],
              alignment: "center",
              fontSize: 12,
              bold: true,
              text:
                "LAPORAN HASIL " +
                (data?.nameTest?.toUpperCase() ?? "MEDICAL CHECK UP"),
            },
          ],
        ],
      },
      layout: "noBorders",
    },
  ];

  const commonDemography = [
    {
      table: {
        widths: ["*"],
        body: [
          [
            {
              ...textHeaderTitle("id", { fontSize: 12, bold: false }),
              alignment: "left",
              margin: [0, 0, 0, -5],
            },
          ],
          [
            {
              table: {
                widths: ["50%", "50%"],
                body: [
                  [
                    {
                      table: {
                        widths: [100, 3, "*"],
                        body: [
                          [
                            textLocales("noRM"),
                            { text: ":" },
                            textHeader(demography?.patientMrn || ""),
                          ],
                          [
                            textLocales("noReg"),
                            { text: ":" },
                            textHeader(demography?.noReg || ""),
                          ],
                          [
                            textLocales("nama"),
                            { text: ":" },
                            textHeader(demography?.name || ""),
                          ],
                          [
                            textLocales("tglLahir"),
                            { text: ":" },
                            textHeader(formatDate(demography?.dob) || "-"),
                          ],
                          [
                            textLocales("perusahaan"),
                            { text: ":" },
                            textHeader(demography?.company || ""),
                          ],
                        ],
                      },
                      layout: "noBorders",
                    },
                    {
                      table: {
                        widths: [103, 3, "*"],
                        body: [
                          [
                            textLocales("umur"),
                            { text: ":" },
                            textHeader(demography?.age || ""),
                          ],
                          [
                            textLocales("jenisKelamin"),
                            { text: ":" },
                            textHeader(
                              demography?.gender === "M" ? "Male" : "Female"
                            ),
                          ],
                          [
                            textLocales("tglPeriksa"),
                            { text: ":" },
                            textHeader(
                              formatDate(demography?.examDate, "monthName") ||
                                "-"
                            ),
                          ],
                          [
                            textLocales("dokter"),
                            { text: ":" },
                            textHeader(doctorName || ""),
                          ],
                        ],
                      },
                      layout: "noBorders",
                    },
                  ],
                ],
              },
              layout: "noBorders",
            },
          ],
        ],
      },
      margin: [85, 10, 43, 0],
      layout: {
        hLineWidth: (i) => (i === 1 ? 0 : 1),
        vLineWidth: () => 1,
        hLineColor: (i) => (i === 1 ? "white" : "black"),
        vLineColor: () => "black",
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 2,
        paddingBottom: () => 2,
      },
    },
  ];

  const commonHeaderDefault = [
    ...commonHeader,
    ...commonDemography,
    //
  ];

  switch (departmentType) {
    default:
      return commonHeaderDefault;
  }
}

function getFooter(
  departmentType,
  currentPage,
  pageCount,
  signatureImage,
  data,
  demography,
  doctors
) {
  const commonFooterDefault = [];
  const doctorName = data?.doctor?.name
    ? data.doctor.name
    : demography?.doctor
    ? demography.doctor
    : "";

  const doctorId = data?.doctor?.id
    ? data?.doctor?.id
    : demography?.doctorId
    ? demography?.doctorId
    : null;

  const doctorData = Array.isArray(doctors)
    ? doctors.find((doc) => doc._id === doctorId)
    : null;

  const doctorSignature = doctorData?.signature;

  const signature = {
    absolutePosition: { x: 350, y: -20 },
    table: {
      widths: ["auto"],
      body: [
        [
          textLocales("doctorInchargeLab", {
            fontSize: 12,
            bold: false,
            alignment: "center",
          }),
        ],
        doctorSignature
          ? [
              {
                margin: [0, 0, 0, 0],
                alignment: "center",
                image: `data:image/png;base64,${doctorSignature}`,
                width: 110,
                height: 40,
              },
            ]
          : [
              {
                margin: [0, 0, 0, 0],
                alignment: "center",
                image: signatureImage.signatureImage,
                width: 110,
                height: 40,
              },
            ],
        [
          {
            margin: [0, 0, 0, 0],
            fontSize: 12,
            text: doctorName,
            alignment: "center",
          },
        ],
      ],
    },
    layout: "noBorders",
  };

  if (currentPage === pageCount) {
    commonFooterDefault.push(signature);
  }

  const informationSite = {
    absolutePosition: { x: 40, y: 80 },
    margin: [0, 10, 0, 0],
    alignment: "center",
    stack: [
      {
        text: "KLINIK UTAMA TÜV RHEINLAND MEDIKA INDONESIA",
        fontSize: 16,
        color: "#336ca4",
        bold: true,
        font: "Universe",
      },
      {
        text: "Mampang Business Park Ruko, JI. Hj Tutty Alawiyah No.301 Blok B",
        fontSize: 12,
        color: "#336ca4",
        font: "Universe",
      },
      {
        text: "No. 08 & 09, Duren Tiga, Pancoran, South Jakarta City, Jakarta 12760",
        fontSize: 12,
        color: "#336ca4",
        font: "Universe",
      },
    ],
  };
  const contentSVG = [
    {
      id: "svg1",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path fill="#fafafa" d="M352 256c0 22.2-1.2 43.6-3.3 64l-185.3 0c-2.2-20.4-3.3-41.8-3.3-64s1.2-43.6 3.3-64l185.3 0c2.2 20.4 3.3 41.8 3.3 64zm28.8-64l123.1 0c5.3 20.5 8.1 41.9 8.1 64s-2.8 43.5-8.1 64l-123.1 0c2.1-20.6 3.2-42 3.2-64s-1.1-43.4-3.2-64zm112.6-32l-116.7 0c-10-63.9-29.8-117.4-55.3-151.6c78.3 20.7 142 77.5 171.9 151.6zm-149.1 0l-176.6 0c6.1-36.4 15.5-68.6 27-94.7c10.5-23.6 22.2-40.7 33.5-51.5C239.4 3.2 248.7 0 256 0s16.6 3.2 27.8 13.8c11.3 10.8 23 27.9 33.5 51.5c11.6 26 20.9 58.2 27 94.7zm-209 0L18.6 160C48.6 85.9 112.2 29.1 190.6 8.4C165.1 42.6 145.3 96.1 135.3 160zM8.1 192l123.1 0c-2.1 20.6-3.2 42-3.2 64s1.1 43.4 3.2 64L8.1 320C2.8 299.5 0 278.1 0 256s2.8-43.5 8.1-64zM194.7 446.6c-11.6-26-20.9-58.2-27-94.6l176.6 0c-6.1 36.4-15.5 68.6-27 94.6c-10.5 23.6-22.2 40.7-33.5 51.5C272.6 508.8 263.3 512 256 512s-16.6-3.2-27.8-13.8c-11.3-10.8-23-27.9-33.5-51.5zM135.3 352c10 63.9 29.8 117.4 55.3 151.6C112.2 482.9 48.6 426.1 18.6 352l116.7 0zm358.1 0c-30 74.1-93.6 130.9-171.9 151.6c25.5-34.2 45.2-87.7 55.3-151.6l116.7 0z"/></svg>`,
    },
    {
      id: "svg2",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path fill="#ffffff" d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48L48 64zM0 176L0 384c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-208L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"/></svg>`,
    },
    {
      id: "svg3",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="#ffffff">
  <g transform="scale(-1,1) translate(-512,0)">
    <path d="M493.4 24.6l-104-24C375.8-2.1 360.2 5.4 352 18.5L288 128c-8.3 13.1-4.3 30.4 9 39.6l56 40c-36.5 71.5-97.4 132.5-168.9 168.9l-40-56c-9.2-13.3-26.5-17.3-39.6-9L18.5 352c-13.1 8.3-20.6 23.8-18.1 37.4l24 104C28.6 506.3 41.4 512 54.1 512c256.5 0 464-207.5 464-464 0-12.7-5.7-25.5-24.7-23.4z"/>
  </g>
</svg>`,
    },
    {
      id: "svgGradientColor",
      svg: `<svg width="724.6347" height="40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#65d8e0" /> <!-- Warna awal -->
          <stop offset="100%" stop-color="#2061ac" /> <!-- Warna akhir -->
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="724.6347" height="40" fill="url(#blueGradient)" />
    </svg>
    `,
    },
  ];

  commonFooterDefault.push(
    informationSite,
    {
      svg: contentSVG[3].svg,
      absolutePosition: { x: 0, y: 140 },
    },
    {
      absolutePosition: { x: 0, y: 150 },
      columns: [
        {
          margin: [20, 0, 0, 0],
          width: "33%",
          columns: [
            {
              margin: [0, 2, 0, 0],
              svg: contentSVG[0].svg,
              width: 14,
              height: 14,
              color: "white",
            },
            {
              text: "www.tuv.com/id",
              color: "white",
              fontSize: 14,
              font: "Universe",
              margin: [10, 0, 0, 1],
            },
          ],
        },
        {
          margin: [15, 0, 0, 0],
          width: "34%",
          columns: [
            {
              margin: [0, 2, 0, 0],
              svg: contentSVG[1].svg,
              width: 14,
              height: 14,
              color: "white",
            },
            {
              text: "TRMedika@idn.tuv.com",
              color: "white",
              font: "Universe",
              fontSize: 14,
              margin: [10, 0, 0, 1],
            },
          ],
        },
        {
          margin: [30, 0, 0, 0],
          width: "33%",
          columns: [
            {
              margin: [0, 2, 0, 0],
              svg: contentSVG[2].svg,
              width: 14,
              height: 14,
              color: "white",
            },
            {
              text: "(021) 3970 1770",
              color: "white",
              font: "Universe",
              fontSize: 14,
              margin: [10, 0, 0, 1],
            },
          ],
        },
      ],
    }
  );

  switch (departmentType) {
    default:
      return commonFooterDefault;
  }
}

function generateExamContentGlobal(departmentType, exam) {
  const { MCUAnamnesa, MCUPhysicalExam } = exam?.data || {};

  const { finalResult } = exam || {};

  const defaultMarginSubQuery = [10, 0, 0, 0];

  const contents = [
    ...getContentResultHistoryTaking(defaultMarginSubQuery, MCUAnamnesa),
    ...getContentResultHabit(defaultMarginSubQuery, MCUAnamnesa),
    ...getContentResultHazard(
      defaultMarginSubQuery,
      MCUPhysicalExam?.hazardTuv
    ),
    ...getContentResultPhysicalExaminations(
      defaultMarginSubQuery,
      MCUPhysicalExam
    ),
    ...getContentResultEyes(defaultMarginSubQuery, MCUPhysicalExam?.eye),
    ...getContentResultEars(defaultMarginSubQuery, MCUPhysicalExam?.ear),
    ...getContentResultNose(defaultMarginSubQuery, MCUPhysicalExam?.nose),
    ...getContentResultMouth(defaultMarginSubQuery, MCUPhysicalExam?.mouth),
    ...getContentResultNeck(defaultMarginSubQuery, MCUPhysicalExam?.neck),
    ...getContentResultRaspiratory(
      defaultMarginSubQuery,
      MCUPhysicalExam?.raspiratory
    ),
    ...getContentResultCardioVaskular(
      defaultMarginSubQuery,
      MCUPhysicalExam?.cardioVaskular
    ),
    ...getContentResultDigestivus(
      defaultMarginSubQuery,
      MCUPhysicalExam?.digestivus
    ),
    ...getContentResultEtc(
      defaultMarginSubQuery,
      MCUPhysicalExam?.etcPemeriksaanFisik
    ),
    ...getContentResultGenitourinaria(
      defaultMarginSubQuery,
      MCUPhysicalExam?.genitourinaria
    ),
    ...getContentResultLimbSystem(
      defaultMarginSubQuery,
      MCUPhysicalExam?.limbSystem
    ),
    ...getContentResultSummary(defaultMarginSubQuery, MCUPhysicalExam?.result),
    ...getContentResultDoctorDemographySuggestionAndFinallyResult(
      defaultMarginSubQuery,
      MCUPhysicalExam?.suggestion,
      finalResult
    ),
  ];

  switch (departmentType) {
    default:
      return contents;
  }
}

function getContentResultHistoryTaking(defaultMarginSubQuery, anamnesa) {
  return [
    {
      text: textContent(
        "ANAMNESA",
        "HISTORY TAKING",
        { bold: true, fontSize: 10 },
        { italics: true }
      ),
      layout: "noBorders",
      margin: [0, 0, 0, 3],
    },
    {
      table: {
        widths: [455],
        body: [
          [
            {
              table: {
                widths: [220, 5, 210],
                body: [
                  [
                    {
                      text: textContent(
                        "Tekanan darah tinggi",
                        "High blood pressure",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(anamnesa?.highBloodPressure || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Keluhan Sekarang",
                        "Present Medical Issue",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(anamnesa?.perceivedDisease || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Riwayat Penyakit Keluarga",
                        "Family Medical History",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(anamnesa?.diseaseFamilyHistory || ""),
                  ],
                ],
              },
              margin: defaultMarginSubQuery || [10, 0, 0, 0],
              layout: "noBorders",
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 5],
    },
  ];
}

function getContentResultHabit(defaultMarginSubQuery, anamnesa) {
  return [
    {
      text: textContent(
        "KEBIASAAN",
        "HABIT",
        { bold: true, fontSize: 10 },
        { italics: true }
      ),
      layout: "noBorders",
      margin: [0, 0, 0, 3],
    },
    {
      table: {
        widths: [455],
        body: [
          [
            {
              table: {
                widths: [220, 5, 210],
                body: [
                  [
                    {
                      text: textContent(
                        "Minum Kopi",
                        "Coffee",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(anamnesa?.amountCoffee || ""),
                  ],
                ],
              },
              margin: defaultMarginSubQuery || [10, 0, 0, 0],
              layout: "noBorders",
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 5],
    },
  ];
}

function getContentResultHazard(defaultMarginSubQuery, hazardTuv) {
  return [
    {
      text: textContent(
        "RESIKO BAHAYA",
        "HAZARD",
        { bold: true, fontSize: 10 },
        { italics: true }
      ),
      layout: "noBorders",
      margin: [0, 0, 0, 3],
    },
    {
      table: {
        widths: [455],
        body: [
          [
            {
              table: {
                widths: [220, 5, 210],
                body: [
                  [
                    {
                      text: textContent(
                        "Kebisingan",
                        "Noise",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(hazardTuv?.noisePekerja || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Getaran seluruh tubuh",
                        "Full body vibrate",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(hazardTuv?.fullBodyVibrate || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Logam berat",
                        "Heavy metal",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(hazardTuv?.heavyMetal || ""),
                  ],

                  [
                    {
                      text: textContent("Pestisida", "", {}, { italics: true }),
                    },
                    ":",
                    textContentValue(hazardTuv?.pesticide || ""),
                  ],

                  [
                    {
                      text: textContent(
                        "Batuk - batuk",
                        "Coughing",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(hazardTuv?.coughing || ""),
                  ],

                  [
                    {
                      text: textContent(
                        "Suhu sangat rendah",
                        "Low temperature",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(hazardTuv?.lowTempWorker || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Tekanan udara rendah",
                        "Low Air Pressure",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(hazardTuv?.lowAirPressure || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Bahan iritan",
                        "Irritant ingredients",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(hazardTuv?.irritantIngredient || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Berdiri lama 4 jam terus menerus",
                        "Long time standing",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(hazardTuv?.longTimeStanding || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Perubahan perilaku",
                        "Behaviour change",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(hazardTuv?.behaviourChange || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Lain Lain Fisik",
                        "Etc",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(hazardTuv?.otherHazardFisik || "-"),
                  ],
                ],
              },
              margin: defaultMarginSubQuery || [10, 0, 0, 0],
              layout: "noBorders",
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 5],
    },
  ];
}

function getContentResultPhysicalExaminations(
  defaultMarginSubQuery,
  physicalExam
) {
  return [
    // Header DITARUH TERPISAH DI ATAS
    {
      text: textContent(
        "PEMERIKSAAN FISIK",
        "PHYSICAL EXAMINATION",
        { bold: true, fontSize: 10 },
        { italics: true }
      ),
      margin: [0, 0, 0, 3],
    },
    {
      table: {
        widths: [210, "*"], // Dua kolom besar
        body: [
          [
            {
              table: {
                widths: [100, 5, "*"],
                body: [
                  [
                    {
                      text: textContent(
                        "Tinggi Badan",
                        "Height",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(
                      physicalExam?.height ? physicalExam?.height + " cm" : ""
                    ),
                  ],
                  [
                    {
                      text: textContent(
                        "Berat Badan",
                        "Weight",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(
                      physicalExam?.weight ? physicalExam?.weight + " kg" : ""
                    ),
                  ],
                  [
                    {
                      text: textContent(
                        "BMI",
                        "Body Mass Index",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(
                      physicalExam?.BMI ? physicalExam?.BMI + " kg/m²" : ""
                    ),
                  ],
                ],
              },
              margin: defaultMarginSubQuery || [10, 0, 0, 0],
              layout: "noBorders",
            },
            {
              table: {
                widths: [132, 5, "*"],
                body: [
                  [
                    {
                      text: textContent(
                        "Tekanan Darah",
                        "Blood Pressure",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(
                      `${physicalExam?.systole}/${physicalExam?.dyastole}` +
                        " mmHg"
                    ),
                  ],
                  [
                    {
                      text: textContent(
                        "Denyut Nadi",
                        "Pulse",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(
                      physicalExam?.heartRate
                        ? physicalExam.heartRate + " x/menit"
                        : ""
                    ),
                  ],
                  [
                    {
                      text: textContent(
                        "Suhu",
                        "Temperature",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(
                      physicalExam?.temperatur
                        ? physicalExam.temperatur + " °C"
                        : ""
                    ),
                  ],
                  [
                    {
                      text: textContent(
                        "Pernapasan",
                        "Respiration",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(
                      physicalExam?.spo2 ? physicalExam.spo2 + " x/menit" : ""
                    ),
                  ],
                  [
                    {
                      text: textContent(
                        "Lingkar Pinggang",
                        "Waist",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(
                      physicalExam?.waist ? physicalExam?.waist + " cm" : ""
                    ),
                  ],
                ],
              },
              // margin: defaultMarginSubQuery || [10, 0, 0, 0],
              layout: "noBorders",
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 5],
    },
  ];
}

function getContentResultEyes(defaultMarginSubQuery, eye) {
  return [
    {
      table: {
        widths: [230, 5, 105, 100],
        body: [
          [
            {
              text: textContent(
                "Mata",
                "Eyes",
                { bold: true, fontSize: 10 },
                { italics: true }
              ),
            },
            { text: "" },
            {
              text: textContent(
                "Kanan",
                "Right",
                { bold: true, fontSize: 10 },
                { italics: true }
              ),
            },
            {
              text: textContent(
                "Kiri",
                "Left",
                { bold: true, fontSize: 10 },
                { italics: true }
              ),
            },
          ],
          [
            {
              text: textContent("Visus Dekat", "Near", {}, { italics: true }),
              margin: defaultMarginSubQuery,
            },
            ":",
            textContentValue(eye?.rightNearVisus || ""),
            textContentValue(eye?.leftNearVisus || ""),
          ],
          [
            {
              text: textContent(
                "Visus Dekat dgn Kacamata",
                "Near With Glasses",
                {},
                { italics: true }
              ),
              margin: defaultMarginSubQuery,
            },
            ":",
            textContentValue(eye?.rightNearVisusWithGlasses || ""),
            textContentValue(eye?.leftNearVisusWithGlasses || ""),
          ],
          [
            {
              text: textContent("Visus Jauh", "Far", {}, { italics: true }),
              margin: defaultMarginSubQuery,
            },
            ":",
            textContentValue(eye?.rightFarVisus || ""),
            textContentValue(eye?.leftFarVisus || ""),
          ],
          [
            {
              text: textContent(
                "Visus Jauh dgn Kacamata",
                "Far With Glasses",
                {},
                { italics: true }
              ),
              margin: defaultMarginSubQuery,
            },
            ":",
            textContentValue(eye?.rightFarVisusWithGlasses || ""),
            textContentValue(eye?.leftFarVisusWithGlasses || ""),
          ],
          [
            {
              text: textContent("Sklera", "Sclera", {}, { italics: true }),
              margin: defaultMarginSubQuery,
            },
            ":",
            textContentValue(eye?.rightSklera || ""),
            textContentValue(eye?.leftSklera || ""),
          ],
          [
            {
              text: textContent(
                "Konjungtiva",
                "Conjunctiva",
                {},
                {
                  italics: true,
                }
              ),
              margin: defaultMarginSubQuery,
            },
            ":",
            textContentValue(eye?.rightKonjungtiva || ""),
            textContentValue(eye?.leftKonjungtiva || ""),
          ],
          [
            {
              text: textContent("Pupil", "", {}, { italics: true }),
              margin: defaultMarginSubQuery,
            },
            ":",
            textContentValue(eye?.rightPupil || ""),
            textContentValue(eye?.leftPupil || ""),
          ],
          [
            {
              text: textContent("Lensa", "Lens", {}, { italics: true }),
              margin: defaultMarginSubQuery,
            },
            ":",
            textContentValue(eye?.rightLensa || ""),
            textContentValue(eye?.leftLensa || ""),
          ],
          [
            {
              text: textContent(
                "Buta Warna",
                "Colour Blind",
                {},
                {
                  italics: true,
                }
              ),
              margin: defaultMarginSubQuery,
            },
            ":",
            textContentValue(eye?.colorBlind || ""),
            textContentValue(),
          ],
          [
            {
              text: textContent(
                "Lain - Lain",
                "Other",
                {},
                {
                  italics: true,
                }
              ),
              margin: defaultMarginSubQuery,
            },
            ":",
            textContentValue(eye?.other || ""),
            textContentValue(),
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 5],
    },
  ];
}

function getContentResultEars(defaultMarginSubQuery, ear) {
  return [
    {
      table: {
        widths: [230, 5, 105, 100],
        body: [
          [
            {
              text: textContent(
                "Telinga",
                "Ears",
                { bold: true, fontSize: 10 },
                { italics: true }
              ),
            },
            { text: "" },
            {
              text: textContent(
                "Kanan",
                "Right",
                { bold: true, fontSize: 10 },
                { italics: true }
              ),
            },
            {
              text: textContent(
                "Kiri",
                "Left",
                { bold: true, fontSize: 10 },
                { italics: true }
              ),
            },
          ],
          [
            {
              text: textContent(
                "Telinga Luar",
                "External Ear",
                {},
                { italics: true }
              ),
              margin: defaultMarginSubQuery,
            },
            ":",
            textContentValue(ear?.rightHearingFunction || ""),
            textContentValue(ear?.leftHearingFunction || ""),
          ],
          [
            {
              text: textContent(
                "Membran Timpani",
                "Tympanic Membrane",
                {},
                { italics: true }
              ),
              margin: defaultMarginSubQuery,
            },
            ":",
            textContentValue(ear?.rightMembranTimpani || ""),
            textContentValue(ear?.leftMembranTimpani || ""),
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 5],
    },
  ];
}

function getContentResultNose(defaultMarginSubQuery, nose) {
  return [
    {
      text: textContent(
        "Hidung",
        "Nose",
        { bold: true, fontSize: 10 },
        { italics: true }
      ),
      layout: "noBorders",
      margin: [0, 0, 0, 3],
    },
    {
      table: {
        widths: [455],
        body: [
          [
            {
              table: {
                widths: [220, 5, 210],
                body: [
                  [
                    {
                      text: textContent(
                        "Mukosa",
                        "Mucose",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(nose?.mukosa || ""),
                  ],
                  [
                    {
                      text: textContent("Septum", "", {}, { italics: true }),
                    },
                    ":",
                    textContentValue(nose?.septum || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Konka",
                        "Conchae",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(nose?.konka || ""),
                  ],
                ],
              },
              margin: defaultMarginSubQuery || [10, 0, 0, 0],
              layout: "noBorders",
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 5],
    },
  ];
}

function getContentResultMouth(defaultMarginSubQuery, mouth) {
  const toothTranslations = {
    karangGigi: "tartar",
    tanggal: "missing tooth",
    gigiPalsu: "denture",
    // bisa ditambah sesuai kebutuhan
  };

  function translateTeeth(teethArray) {
    return teethArray
      .map((tooth) => {
        const translation = toothTranslations[tooth];
        if (translation) {
          return `${tooth} / ${translation}\n`;
        }
        return tooth; // kalau gak ada terjemahan, tampilkan aslinya saja
      })
      .join(", ");
  }

  return [
    {
      text: textContent(
        "Mulut",
        "Mouth",
        { bold: true, fontSize: 10 },
        { italics: true }
      ),
      layout: "noBorders",
      margin: [0, 0, 0, 3],
    },
    {
      table: {
        widths: [455], // Dua kolom besar
        body: [
          [
            {
              table: {
                widths: [220, 5, 210],
                body: [
                  [
                    {
                      text: textContent(
                        "Lidah",
                        "Tongue",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(mouth?.tongue || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Faring",
                        "Pharynx",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(mouth?.faring || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Tonsil",
                        "Tonsils",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(mouth?.tonsil || ""),
                  ],
                  [
                    {
                      text: textContent("Gigi", "Teeth", {}, { italics: true }),
                    },
                    ":",
                    ...textContentValue(translateTeeth(mouth?.tooth || [])),
                  ],
                ],
              },
              margin: defaultMarginSubQuery || [10, 0, 0, 0],
              layout: "noBorders",
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 5],
    },
  ];
}

function getContentResultNeck(defaultMarginSubQuery, neck) {
  return [
    {
      text: textContent(
        "Leher",
        "Neck",
        { bold: true, fontSize: 10 },
        { italics: true }
      ),
      layout: "noBorders",
      margin: [0, 0, 0, 3],
    },
    {
      table: {
        widths: [455], // Dua kolom besar
        body: [
          [
            {
              table: {
                widths: [220, 5, 210],
                body: [
                  [
                    {
                      text: textContent(
                        "Kelenjar Getah Bening",
                        "Lymph Glands",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(neck?.kelenjarGetahBening || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Kelenjar Tiroid",
                        "Lymph Glands",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(neck?.kelenjarTiroid || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Lain - lain",
                        "Etc",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    convertValueHtml(neck?.otherNeck || ""),
                  ],
                ],
              },
              margin: defaultMarginSubQuery || [10, 0, 0, 0],
              layout: "noBorders",
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 5],
    },
  ];
}

function getContentResultRaspiratory(defaultMarginSubQuery, raspiratory) {
  return [
    {
      text: textContent(
        "Sistem Pernapasan",
        "Respiratory System",
        { bold: true, fontSize: 10 },
        { italics: true }
      ),
      layout: "noBorders",
      margin: [0, 0, 0, 3],
    },
    {
      table: {
        widths: [455], // Dua kolom besar
        body: [
          [
            {
              table: {
                widths: [220, 5, 210],
                body: [
                  [
                    {
                      text: textContent(
                        "Inspeksi",
                        "Inspection",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(raspiratory?.inspeksi || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Auskultasi",
                        "Auscultation",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(raspiratory?.auskultasi || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Palpasi",
                        "Palpation",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(raspiratory?.palpasi || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Perkusi",
                        "Percussion",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(raspiratory?.perkusi || ""),
                  ],
                ],
              },
              margin: defaultMarginSubQuery || [10, 0, 0, 0],
              layout: "noBorders",
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 0],
    },
  ];
}

function getContentResultCardioVaskular(defaultMarginSubQuery, cardioVaskular) {
  return [
    {
      text: textContent(
        "Sistem Cardiovaskular",
        "Cardiovascular System",
        { bold: true, fontSize: 10 },
        { italics: true }
      ),
      layout: "noBorders",
      margin: [0, 0, 0, 3],
    },
    {
      table: {
        widths: [455], // Dua kolom besar
        body: [
          [
            {
              table: {
                widths: [220, 5, 210],
                body: [
                  [
                    {
                      text: textContent(
                        "Inspeksi",
                        "Inspection",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(cardioVaskular?.inspeksi || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Perkusi",
                        "Percussion",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(cardioVaskular?.perkusi || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Palpasi Ictus Cordis",
                        "Palpasi Ictus Cordis",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(cardioVaskular?.palpasi || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Auskultasi",
                        "Auscultation",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(cardioVaskular?.auskultasi || ""),
                  ],
                ],
              },
              margin: defaultMarginSubQuery || [10, 0, 0, 0],
              layout: "noBorders",
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 0],
    },
  ];
}

function getContentResultDigestivus(defaultMarginSubQuery, digestivus) {
  return [
    {
      text: textContent(
        "Sistem Digestivus",
        "Digestivus System",
        { bold: true, fontSize: 10 },
        { italics: true }
      ),
      layout: "noBorders",
      margin: [0, 0, 0, 3],
    },
    {
      table: {
        widths: [455], // Dua kolom besar
        body: [
          [
            {
              table: {
                widths: [220, 5, 210],
                body: [
                  [
                    {
                      text: textContent(
                        "Inspeksi",
                        "Inspection",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(digestivus?.inspeksi || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Perkusi",
                        "Percussion",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(digestivus?.perkusi || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Palpasi Ictus Cordis",
                        "Palpasi Ictus Cordis",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(digestivus?.palpasi || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Auskultasi",
                        "Auscultation",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(digestivus?.auskultasi || ""),
                  ],
                ],
              },
              margin: defaultMarginSubQuery || [10, 0, 0, 0],
              layout: "noBorders",
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 5],
    },
  ];
}

function getContentResultEtc(defaultMarginSubQuery, etcPemeriksaanFisik) {
  return [
    {
      text: textContent(
        "Lain - Lain",
        "Etc",
        { bold: true, fontSize: 10 },
        { italics: true }
      ),
      layout: "noBorders",
      margin: [0, 0, 0, 3],
    },
    {
      table: {
        widths: ["*"],
        body: [
          [
            {
              table: {
                widths: ["*"],
                body: [[convertValueHtml(etcPemeriksaanFisik || "")]],
              },
              margin: defaultMarginSubQuery || [10, 0, 0, 0],
              layout: "noBorders",
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 5],
    },
  ];
}

function getContentResultGenitourinaria(defaultMarginSubQuery, genitourinaria) {
  return [
    {
      text: textContent(
        "Sistem Genitourinaria ",
        "Genitourinary System",
        { bold: true, fontSize: 10 },
        { italics: true }
      ),
      layout: "noBorders",
      margin: [0, 0, 0, 3],
    },
    {
      table: {
        widths: [455], // Dua kolom besar
        body: [
          [
            {
              table: {
                widths: [220, 5, 210],
                body: [
                  [
                    {
                      text: textContent("Anus", "", {}, { italics: true }),
                    },
                    ":",
                    textContentValue(genitourinaria?.anus || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Ginjal",
                        "Kidney",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(genitourinaria?.kidney || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Kandung Kemih",
                        "Bladder",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(genitourinaria?.bladder || ""),
                  ],
                ],
              },
              margin: defaultMarginSubQuery || [10, 0, 0, 0],
              layout: "noBorders",
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 5],
    },
  ];
}

function getContentResultLimbSystem(defaultMarginSubQuery, limbSystem) {
  return [
    {
      text: textContent(
        "Sistem Anggota Gerak ",
        "Movement System",
        { bold: true, fontSize: 10 },
        { italics: true }
      ),
      layout: "noBorders",
      margin: [0, 0, 0, 3],
    },
    {
      table: {
        widths: [455], // Dua kolom besar
        body: [
          [
            {
              table: {
                widths: [220, 5, 210],
                body: [
                  [
                    {
                      text: textContent(
                        "Anggota Gerak Atas",
                        "Upper Limb",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(limbSystem?.upper || ""),
                  ],
                  [
                    {
                      text: textContent("Sensorik", "", {}, { italics: true }),
                    },
                    ":",
                    textContentValue(limbSystem?.sensoric || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Tulang Belakang",
                        "",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(limbSystem?.spine || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Anggota Gerak Bawah",
                        "Bottom Limb",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(limbSystem?.bottom || ""),
                  ],
                  [
                    {
                      text: textContent("Edema", "", {}, { italics: true }),
                    },
                    ":",
                    textContentValue(limbSystem?.edema || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Refleks Fisiologis",
                        "Physiologycal reflex",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(limbSystem?.fisiologis || ""),
                  ],
                  [
                    {
                      text: textContent(
                        "Refleks Patologis",
                        "Pathologycal reflex",
                        {},
                        { italics: true }
                      ),
                    },
                    ":",
                    textContentValue(limbSystem?.patologis || ""),
                  ],
                ],
              },
              margin: defaultMarginSubQuery || [10, 0, 0, 0],
              layout: "noBorders",
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 5],
    },
  ];
}

function getContentResultSummary(defaultMarginSubQuery, result) {
  return [
    {
      text: textContent(
        "KESIMPULAN",
        "SUMMARY",
        { bold: true, fontSize: 10 },
        { italics: true }
      ),
      layout: "noBorders",
      margin: [0, 0, 0, 3],
      pageBreak: "before",
    },
    {
      table: {
        widths: ["*"],
        body: [
          [
            {
              table: {
                widths: ["*"],
                body: [[convertValueHtml(result || "")]],
              },
              margin: defaultMarginSubQuery || [10, 0, 0, 0],
              layout: "noBorders",
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 5],
    },
  ];
}

function getContentResultDoctorDemographySuggestionAndFinallyResult(
  defaultMarginSubQuery,
  suggestion,
  finalResult
) {
  return [
    {
      text: "",
      pageBreak: "before",
    },
    {
      text: textContent(
        "SARAN",
        "SUGGESTION",
        { bold: true, fontSize: 10 },
        { italics: true }
      ),
      layout: "noBorders",
      margin: [0, 0, 0, 3],
    },
    {
      table: {
        widths: ["*"],
        body: [
          [
            {
              table: {
                widths: ["*"],
                body: [[convertValueHtml(suggestion || "")]],
              },
              margin: defaultMarginSubQuery || [10, 0, 0, 0],
              layout: "noBorders",
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 5],
    },
    {
      text: textContent(
        "HASIL AKHIR ",
        "FINAL RESULT",
        { bold: true, fontSize: 10 },
        { italics: true }
      ),
      layout: "noBorders",
      margin: [0, 0, 0, 3],
    },
    {
      table: {
        widths: ["*"],
        body: [
          [
            {
              table: {
                widths: ["*"],
                body: [[textContentValue(finalResult?.finalExam || "")]],
              },
              margin: defaultMarginSubQuery || [10, 0, 0, 0],
              layout: "noBorders",
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 5],
    },
    {
      text: "",
      margin: [0, 0, 0, 50],
    },
  ];
}

function generateExamContentTestResult(departmentType, exam) {
  const result = exam?.data?.result || "";
  const suggestion = exam?.data?.suggestion || "";
  const contents = [];

  if (result) {
    contents.push({
      text: textContent(
        "HASIL AKHIR",
        "FINAL RESULT",
        { bold: true, fontSize: 10 },
        { italics: true }
      ),
      layout: "noBorders",
      margin: [0, 0, 0, 3],
    });
    contents.push({
      table: {
        widths: ["*"],
        body: [
          [
            {
              table: {
                widths: ["*"],
                body: [[convertValueHtml(result)]],
              },
              margin: [10, 0, 0, 0],
              layout: "noBorders",
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 5],
    });
  }

  if (suggestion) {
    contents.push({
      text: textContent(
        "SARAN",
        "SUGGESTION",
        { bold: true, fontSize: 10 },
        { italics: true }
      ),
      layout: "noBorders",
      margin: [0, 0, 0, 3],
    });
    contents.push({
      table: {
        widths: ["*"],
        body: [
          [
            {
              table: {
                widths: ["*"],
                body: [[convertValueHtml(suggestion)]],
              },
              margin: [10, 0, 0, 0],
              layout: "noBorders",
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 5],
    });
  }

  switch (departmentType) {
    default:
      return contents;
  }
}

async function generatePdfFromExam(rawData, index = 0, options = {}) {
  const { query = {} } = options;
  const departmentType = (query.departmentType || "default").toLowerCase();

  const { demography, finalResult, doctors, data, examination } = rawData;

  const { printer, vfs } = await createPdfPrinter();

  const signatureImage = {
    signatureImage:
      "data:image/png;base64," + vfs["signature.png"].toString("base64"),
  };

  const images = {
    logo: "data:image/png;base64," + vfs["logo.png"].toString("base64"),
    logo2: "data:image/png;base64," + vfs["logo2.png"].toString("base64"),
  };

  const isGlobal = examination?.isGlobal || false;

  const content = [];

  if (isGlobal) {
    const globalContent = generateExamContentGlobal(departmentType, {
      ...examination,
      data,
      finalResult,
    });

    if (Array.isArray(globalContent)) {
      content.push(...globalContent);
    }
  } else if (examination?.type === "testResult") {
    const doctorContentTestResult = generateExamContentTestResult(
      departmentType,
      {
        ...examination,
        data,
      }
    );

    if (Array.isArray(doctorContentTestResult)) {
      content.push(...doctorContentTestResult);
    }
  }

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [85, 270, 43, 180],
    defaultStyle: {
      font: "Universe",
      fontSize: 9,
    },
    header: (currentPage, pageCount) =>
      getHeader(
        departmentType,
        currentPage,
        pageCount,
        images,
        demography,
        data || examination?.data || {}
      ),
    footer: (currentPage, pageCount) =>
      getFooter(
        departmentType,
        currentPage,
        pageCount,
        signatureImage,
        data || examination?.data || {},
        demography,
        doctors
      ),
    content,
  };

  return new Promise((resolve, reject) => {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks = [];
    pdfDoc.on("data", (chunk) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
}

async function mergePdfBuffers(buffers) {
  const mergedPdf = await PDFDocument.create();

  for (const pdfBytes of buffers) {
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedPdfFile = await mergedPdf.save();
  return Buffer.from(mergedPdfFile);
}

async function generateFullPdfFromExaminations(rawData, options = {}) {
  try {
    const buffers = [];

    const examinations = Array.isArray(rawData.examination)
      ? rawData.examination
      : [];

    // Pisahkan testResult dan non-testResult
    const testResultExams = examinations.filter(
      (exam) => exam?.type === "testResult" && exam?.data
    );

    const nonTestResultExams = examinations.filter(
      (exam) => exam?.type !== "testResult"
    );

    // Gabungkan semua data dari nonTestResultExams
    const combinedNonTestResultData = nonTestResultExams.reduce((acc, exam) => {
      const type = exam?.type;
      if (type && exam?.data) {
        acc[type] = exam.data;
      }
      return acc;
    }, {});

    // Buat 1 exam gabungan untuk non-testResult
    if (nonTestResultExams.length > 0) {
      const combinedExam = {
        type: "combined",
        isGlobal: true,
        data: combinedNonTestResultData,
        originalTypes: nonTestResultExams.map((e) => e.type),
      };

      const fullExamData = {
        demography: rawData.demography,
        finalResult: rawData.finalResult,
        doctors: rawData.doctors,
        examination: combinedExam,
        data: combinedNonTestResultData,
      };

      const pdfBuffer = await generatePdfFromExam(fullExamData, 0, options);
      buffers.push(pdfBuffer);
    }

    // Process testResult exams per page (1 exam = 1 page)
    for (const [index, exam] of testResultExams.entries()) {
      const fullExamData = {
        demography: rawData.demography,
        finalResult: rawData.finalResult,
        doctors: rawData.doctors,
        data: exam.data,
        examination: exam,
      };

      const pdfBuffer = await generatePdfFromExam(
        fullExamData,
        index + 1,
        options
      );
      buffers.push(pdfBuffer);
    }

    return await mergePdfBuffers(buffers);
  } catch (err) {
    console.error("Error generating full PDF from examinations:", err);
    throw err;
  }
}

module.exports = {
  generatePdfFromExam,
  mergePdfBuffers,
  generateFullPdfFromExaminations,
};
