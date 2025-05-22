require("dotenv").config();
const PdfPrinter = require("pdfmake");
const fs = require("fs");
const path = require("path");
const locales = require("./locale/tuv-locale");

const htmlToPdfMake = require("html-to-pdfmake");
const { JSDOM } = require("jsdom");
const window = new JSDOM("").window;
const dom = new JSDOM();

/**
 * Membaca file aset secara async dan mengembalikan buffer-nya.
 * @param {string} relativePath - Path relatif dari file asset.
 * @returns {Promise<Buffer>}
 */
const readAsset = async (relativePath) => {
  const fullPath = path.resolve(__dirname, "..", relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File tidak ditemukan: ${fullPath}`);
  }
  return fs.promises.readFile(fullPath);
};

/**
 * Membuat header PDF dinamis berdasarkan tipe departemen.
 * @param {string} departmentType - Tipe departemen (misal: 'default', 'hematology', dll).
 * @param {number} currentPage - Halaman saat ini.
 * @param {number} pageCount - Total halaman.
 * @param {object} query - Parameter query tambahan, misal { plain: true }.
 * @returns {Array|Object} - Definisi header pdfmake.
 */

function textLocales(fieldKey, options = {}) {
  const idText = locales.id.fields[fieldKey] || "";
  const enText = locales.en.fields[fieldKey];

  const textArray = [
    {
      text: idText,
      fontSize: options.fontSize || 9,
      bold: options.bold || false,
      italics: false,
    },
  ];

  if (enText) {
    textArray.push(
      {
        text: " / ",
        fontSize: options.fontSize || 9,
        bold: options.bold || false,
        italics: false,
      },
      {
        text: enText,
        fontSize: options.fontSize || 9,
        bold: options.bold || false,
        italics: true,
      }
    );
  }

  return {
    margin: [0, 0, 0, 0],
    text: textArray,
  };
}

function textHeaderTitle(lang = "id", options = {}) {
  return {
    margin: [0, 0, 0, 0],
    columns: [
      {
        text: locales[lang]?.headerTitle || locales.id.headerTitle,
        fontSize: options.fontSize || 12,
        bold: options.bold || false,
        italics: false,
        width: 110,
      },
      {
        text: " / ",
        fontSize: options.fontSize || 12,
        bold: options.bold || false,
        italics: false,
        width: 5,
      },
      {
        text: locales.en.headerTitle,
        fontSize: (options.fontSize || 12) - 2,
        bold: options.bold || false,
        italics: true,
        color: "gray",
        margin: [0, 4, 0, 0],
        width: 110,
      },
    ],
  };
}

function textHeader(
  indonesia,
  english,
  optionsIndonesia = {},
  optionsEnglish = {}
) {
  const hasEnglish = english && english.trim().length > 0;

  if (hasEnglish) {
    return [
      { text: indonesia + " / ", ...optionsIndonesia, fontSize: 9 },
      { text: english, ...optionsEnglish, color: "gray", fontSize: 9 },
    ];
  } else {
    return [{ text: indonesia, ...optionsIndonesia, fontSize: 9 }];
  }
}

function formatDate(dateString, formatType = "default") {
  if (!dateString) return "";

  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  if (formatType === "monthName") {
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const monthName = months[date.getMonth()];
    return `${day} ${monthName} ${year}`;
  }

  // default: dd-mm-yyyy
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${year}`;
}

function getHeader(departmentType, currentPage, pageCount, images, demography) {
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
              image: images?.tuv,
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
              text: "LAPORAN HASIL MEDICAL CHECK UP",
            },
          ],
        ],
      },
      layout: "noBorders",
    },
  ];

  const commonHeaderDefault = [
    ...commonHeader,
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
                            textHeader(demography?.doctor || ""),
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

  switch (departmentType) {
    default:
      return commonHeaderDefault;
  }
}

/**
 * Membuat footer PDF sesuai tipe departemen.
 * @param {string} departmentType - Tipe departemen.
 * @param {number} currentPage - Halaman saat ini.
 * @param {number} pageCount - Total halaman.
 * @returns {object} Definisi footer pdfmake.
 */

function getFooter(
  departmentType,
  currentPage,
  pageCount,
  signatureImage,
  examinationList,
  demography
) {
  const mappedData = mapExaminationByType(examinationList);
  const { testResults } = mappedData;

  if (!testResults?.length) return [];

  const groupedByDoctor = groupTestResultsByDoctor(testResults);
  const doctorEntries = Object.entries(groupedByDoctor);

  const commonFooterDefault = [];

  const totalDoctors = doctorEntries.length;
  const demographyDoctorPage = pageCount - totalDoctors;

  let doctorNameToShow = null;

  if (currentPage === demographyDoctorPage && demography?.doctor) {
    doctorNameToShow = demography.doctor;
  } else {
    const doctorIndex = totalDoctors - (pageCount - currentPage) - 1;
    if (doctorIndex >= 0 && doctorIndex < totalDoctors) {
      doctorNameToShow = doctorEntries[doctorIndex][0];
    }
  }
  const signature = {
    absolutePosition: { x: 350, y: -120 },
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
        [
          {
            margin: [0, 0, 0, 0],
            alignment: "center",
            image: signatureImage?.signatureImage,
            width: 110,
            height: 40,
          },
        ],
        [
          {
            margin: [0, 0, 0, 0],
            fontSize: 12,
            text: doctorNameToShow,
            alignment: "center",
          },
        ],
      ],
    },
    layout: "noBorders",
  };

  if (doctorNameToShow) {
    // commonFooterDefault.push(signature);
  }

  const informationSite = {
    absolutePosition: { x: 40, y: 20 },
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
      absolutePosition: { x: 0, y: 80 },
    },
    {
      absolutePosition: { x: 0, y: 90 },
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

/**
 * Fungsi untuk mengambil konten yang sesuai dengan tipe departemen.
 * @param {string} departmentType - Tipe departemen.
 * @returns {object} Definisi konten pdfmake.
 */
function textContent(
  indonesia,
  english,
  optionsIndonesia = {},
  optionsEnglish = {}
) {
  const hasEnglish = english && english.trim().length > 0;

  if (hasEnglish) {
    return [
      { text: indonesia + " / ", ...optionsIndonesia, fontSize: 12 },
      { text: english, ...optionsEnglish, color: "gray", fontSize: 10 },
    ];
  } else {
    return [{ text: indonesia, ...optionsIndonesia, fontSize: 12 }];
  }
}

function stripHtmlToText(value) {
  if (!value || typeof value !== "string") return "";

  // Hapus paragraf kosong yang isinya cuma <br> atau spasi
  value = value.replace(/<p>(\s|<br\s*\/?>)*<\/p>/gi, "");

  let text = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();

  // Kurangi multiple newline jadi satu newline supaya nggak terlalu jauh
  text = text.replace(/\n{2,}/g, "\n");

  return text;
}

function cleanInvisibleChars(str) {
  return str.replace(/[\u200B-\u200D\uFEFF]/g, "");
}

function convertHtmlToPdfMake(value, option = {}) {
  if (!value || typeof value !== "string") value = "";

  value = cleanInvisibleChars(value)
    .replace(/\*{4,}/g, "")
    .replace(/[^\x20-\x7E\s]/g, "")
    .replace(/<hr[^>]*>/gi, "<p>---</p>");

  let pdfmakeContent = htmlToPdfMake(value, {
    window,
    imageTagClass: true,
  });

  if (!Array.isArray(pdfmakeContent)) {
    pdfmakeContent = [pdfmakeContent];
  }

  const content = pdfmakeContent
    .map((item) => processItem(item, option))
    .filter((item) => item !== null);

  return content;
}

// Fungsi rekursif untuk cek ada gambar base64 di dalam item
function containsBase64Image(item, depth = 0, maxDepth = 5) {
  if (!item || typeof item !== "object" || depth > maxDepth) return false;

  if (typeof item.image === "string" && item.image.startsWith("data:image")) {
    return true;
  }

  if (Array.isArray(item.stack)) {
    return item.stack.some((i) => containsBase64Image(i, depth + 1, maxDepth));
  }

  if (Array.isArray(item.columns)) {
    return item.columns.some((i) =>
      containsBase64Image(i, depth + 1, maxDepth)
    );
  }

  if (item.table && Array.isArray(item.table.body)) {
    return item.table.body
      .flat()
      .some((i) => containsBase64Image(i, depth + 1, maxDepth));
  }

  return false;
}

// Modularisasi fungsi pemrosesan per item
function processItem(item, option) {
  const text = typeof item.text === "string" ? item.text.trim() : "";

  if (text === "" && item.class?.includes("ql-align-justify")) {
    return null;
  }

  if (text === "---") {
    return {
      canvas: [
        {
          type: "line",
          x1: 0,
          y1: 0,
          x2: 450,
          y2: 0,
          lineWidth: 0.5,
          lineColor: "#cccccc",
        },
      ],
      margin: [0, 10, 0, 10],
    };
  }

  // Hanya wrap jika ada gambar base64 di dalam item
  const shouldWrap = containsBase64Image(item);
  const wrappedItem = shouldWrap ? wrapImagesWithBorder(item) : item;

  const isJustify =
    wrappedItem.class?.includes("ql-align-justify") ||
    wrappedItem.style?.includes("text-align:justify");

  return {
    ...wrappedItem,
    fontSize: 12,
    alignment: isJustify ? "justify" : "left",
    lineHeight: 1.2,
    margin: [0, 2, 0, 2],
    ...option,
  };
}

// Rekursif membungkus semua gambar dengan border (dalam stack/columns/table)
function wrapImagesWithBorder(item) {
  if (Array.isArray(item)) {
    return item.map(wrapImagesWithBorder);
  }

  if (item.stack) {
    return {
      ...item,
      stack: wrapImagesWithBorder(item.stack),
    };
  }

  if (item.columns) {
    return {
      ...item,
      columns: wrapImagesWithBorder(item.columns),
    };
  }

  if (
    item.image &&
    typeof item.image === "string" &&
    item.image.startsWith("data:image")
  ) {
    return {
      table: {
        widths: [440],
        body: [
          [
            {
              image: item.image,
              width: 440,
              margin: [0, 0, 0, 0],
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 5, 0, 0],
    };
  }

  // Bila bukan gambar dan tidak punya stack/columns/table, return apa adanya
  return item;
}

function textContentValue(value, option = {}) {
  if (!value || typeof value !== "string") value = "";

  const text = stripHtmlToText(value);
  return [{ text, fontSize: 12, ...option }];
}

function groupTestResultsByDoctor(testResults = []) {
  return testResults.reduce((grouped, result) => {
    const doctorName = result?.doctor?.name || "Unknown Doctor";
    if (!grouped[doctorName]) {
      grouped[doctorName] = [];
    }
    grouped[doctorName].push(result);
    return grouped;
  }, {});
}

function mapExaminationByType(examinationList = []) {
  const mapped = {};

  examinationList.forEach((item) => {
    if (!item?.type || !item?.data) return;

    switch (item.type) {
      case "MCUPhysicalExam":
        mapped.physicalExam = item.data;
        break;

      case "MCUAnamnesa":
        mapped.anamnesa = item.data;
        break;

      case "testResult":
        if (!mapped.testResults) mapped.testResults = [];
        mapped.testResults.push(item.data);
        break;

      default:
        if (!mapped.others) mapped.others = [];
        mapped.others.push(item);
        break;
    }
  });

  return mapped;
}

function getContent(departmentType, examinationList, signatureImage) {
  const mappedData = mapExaminationByType(examinationList);

  const { physicalExam, anamnesa, testResults } = mappedData;

  const defaultMarginSubQuery = [10, 0, 0, 0];

  const content = [
    ...getContentResultPhysicalExaminations(
      defaultMarginSubQuery,
      physicalExam
    ),
    ...getContentResultEyes(defaultMarginSubQuery, physicalExam?.eye),
    ...getContentResultEars(defaultMarginSubQuery, physicalExam?.ear),
    ...getContentResultNose(defaultMarginSubQuery, physicalExam?.nose),
    ...getContentResultMouth(defaultMarginSubQuery, physicalExam?.mouth),
    ...getContentResultNeck(defaultMarginSubQuery, physicalExam?.neck),
    ...getContentResultRaspiratory(
      defaultMarginSubQuery,
      physicalExam?.raspiratory
    ),
    ...getContentResultCardioVaskular(
      defaultMarginSubQuery,
      physicalExam?.cardioVaskular
    ),
    ...getContentResultDigestivus(
      defaultMarginSubQuery,
      physicalExam?.digestivus
    ),
    ...getContentResultEtc(
      defaultMarginSubQuery,
      physicalExam?.etcPemeriksaanFisik
    ),
    ...getContentResultGenitourinaria(
      defaultMarginSubQuery,
      physicalExam?.genitourinaria
    ),
    ...getContentResultLimbSystem(
      defaultMarginSubQuery,
      physicalExam?.limbSystem
    ),
    ...getContentResultSummary(defaultMarginSubQuery, physicalExam?.result),
    ...getContentResultDoctorDemographySuggestionAndFinallyResult(
      defaultMarginSubQuery,
      physicalExam?.suggestion
    ),
    ...getContentResultDoctor(defaultMarginSubQuery, testResults),
  ];

  switch (departmentType) {
    default:
      return content;
  }
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
                    textContentValue(mouth?.tooth || ""),
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
                    textContentValue(neck?.otherNeck || ""),
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
                body: [[textContentValue(etcPemeriksaanFisik || "")]],
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
                body: [[convertHtmlToPdfMake(result || "")]],
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
  suggestion
) {
  return [
    {
      text: "", // Pemisah kosong
      pageBreak: "before", // Break sebelum blok ini dimulai
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
                body: [[convertHtmlToPdfMake(suggestion || "")]],
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
                body: [[convertHtmlToPdfMake("Fit to Work")]],
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

function getContentResultDoctor(defaultMarginSubQuery, testResults) {
  if (!testResults?.length) return [];

  const groupedByDoctor = groupTestResultsByDoctor(testResults);
  const doctorEntries = Object.entries(groupedByDoctor);
  const content = [];

  doctorEntries.forEach(([doctorName, results]) => {
    let resultValue = "";
    let suggestionValue = "";

    results.forEach((res) => {
      if (res.result) resultValue += res.result + "\n";
      if (res.suggestion) suggestionValue += res.suggestion + "\n";
    });

    const doctorBlock = {
      stack: [
        {
          text: `Doctor: ${doctorName}`,
          margin: [0, 10, 0, 5],
          bold: true,
          fontSize: 12,
        },
        {
          text: textContent(
            "HASIL ",
            "RESULT",
            { bold: true, fontSize: 10 },
            { italics: true }
          ),
          layout: "noBorders",
          margin: [0, 10, 0, 3],
        },
        {
          table: {
            widths: ["*"],
            body: [
              [
                {
                  table: {
                    widths: ["*"],
                    body: [[convertHtmlToPdfMake(resultValue.trim())]],
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
            "SARAN ",
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
                    body: [[convertHtmlToPdfMake(suggestionValue.trim())]],
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
      ],
      pageBreak: "before",
    };

    content.push(doctorBlock);
  });

  return content;
}

/**
 * Fungsi utama untuk generate PDF dari data mentah.
 * @param {object} rawData - Data mentah yang ingin dimasukkan ke PDF.
 * @param {object} options - Opsi tambahan, termasuk watermark dan query.
 * @returns {Promise<Buffer>} Buffer berisi PDF hasil generate.
 */
const generatePdf = async (rawData, options = {}) => {
  try {
    const { watermark, query = {} } = options;
    const departmentType = (query.departmentType || "default").toLowerCase();

    const { demography, examination } = rawData;

    const fonts = {
      Universe: {
        normal: path.resolve(
          __dirname,
          "..",
          "assets/fonts/Universe/UniversRegular.ttf"
        ),
        bold: path.resolve(
          __dirname,
          "..",
          "assets/fonts/Universe/UniversBold.ttf"
        ),
        italics: path.resolve(
          __dirname,
          "..",
          "assets/fonts/Universe/UniversLTStd-Obl.otf"
        ),
        bolditalics: path.resolve(
          __dirname,
          "..",
          "assets/fonts/Universe/UniversLTStd-BoldObl.otf"
        ),
      },
    };

    // Load semua asset font dan gambar sebagai Buffer untuk virtual file system (vfs)
    const vfs = {
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
      "logo.png": await readAsset(
        process.env.LOGO_PATH || "assets/images/default/logo.png"
      ),
      "logo2.png": await readAsset(
        process.env.LOGO_KAB_PATH || "assets/images/default/logo2.png"
      ),
      "tuv.png": await readAsset(
        process.env.LOGO_KAB_PATH || "assets/images/tuv/tuv.png"
      ),
      "signature.png": await readAsset(
        process.env.SIGNATURE_PATH || "assets/signatures/default/signature.png"
      ),
    };

    const printer = new PdfPrinter(fonts, { vfs });

    const signatureImage = {
      signatureImage:
        "data:image/png;base64," + vfs["signature.png"].toString("base64"),
    };

    const images = {
      logo: "data:image/png;base64," + vfs["logo.png"].toString("base64"),
      logo2: "data:image/png;base64," + vfs["logo2.png"].toString("base64"),
      tuv: "data:image/png;base64," + vfs["tuv.png"].toString("base64"),
    };

    const content = getContent(departmentType, examination, signatureImage);

    const docDefinition = {
      // watermark: watermark
      //   ? {
      //       text: "COPY",
      //       color: "black",
      //       opacity: 0.1,
      //       bold: true,
      //       italics: false,
      //     }
      //   : undefined,
      pageSize: "A4",
      defaultStyle: {
        font: "Universe",
        fontSize: 9,
      },
      pageMargins: [85, 275, 43, 120], // 3cm left, 1.5cm right
      header: (currentPage, pageCount) =>
        getHeader(departmentType, currentPage, pageCount, images, demography),
      footer: (currentPage, pageCount) =>
        getFooter(
          departmentType,
          currentPage,
          pageCount,
          signatureImage,
          examination,
          demography
        ),
      content: content,
      styles: {
        header: { fontSize: 18, bold: true },
      },
      // Show border PDF to check margins
      // background: function (currentPage, pageSize) {
      //   return {
      //     canvas: [
      //       {
      //         type: "rect",
      //         x: 85, // left margin (3cm)
      //         y: 265, // top margin
      //         w: pageSize.width - 85 - 43, // width dikurangi margin kiri dan kanan
      //         h: pageSize.height - 265 - 190, // height dikurangi margin atas dan bawah
      //         r: 0, // corner radius
      //         lineWidth: 1,
      //         lineColor: "#000000",
      //       },
      //     ],
      //   };
      // },
    };

    // Generate PDF sebagai Buffer dengan PdfKit
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks = [];

    return new Promise((resolve, reject) => {
      pdfDoc.on("data", (chunk) => chunks.push(chunk));
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDoc.on("error", (err) => reject(err));
      pdfDoc.end();
    });
  } catch (err) {
    console.error("Error saat generate PDF:", err.message);
    throw err;
  }
};

module.exports = { generatePdf };
