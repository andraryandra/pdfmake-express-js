const htmlToPdfMake = require("html-to-pdfmake");
const { JSDOM } = require("jsdom");
const window = new JSDOM("").window;
const locales = require("../../services/pdf/locale/tuv-locale");

function cleanInvisibleChars(str) {
  return str.replace(/[\u200B-\u200D\uFEFF]/g, "");
}

function convertValueHtml(value, option = {}) {
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

function formatDate(dateString, formatType = "default", separator = "-") {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("T")[0].split("-");

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
    const monthIndex = parseInt(month, 10) - 1;
    return `${day} ${months[monthIndex]} ${year}`;
  }

  return `${day}${separator}${month}${separator}${year}`;
}

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
      { text: english, ...optionsEnglish, color: "gray", fontSize: 11 },
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

function textContentValue(value, option = {}) {
  if (!value || typeof value !== "string") value = "";

  const text = stripHtmlToText(value);
  return [{ text, fontSize: 12, ...option }];
}

module.exports = {
  convertValueHtml,
  cleanInvisibleChars,
  textHeaderTitle,
  textHeader,
  textLocales,
  formatDate,
  textContent,
  textContentValue,
};
