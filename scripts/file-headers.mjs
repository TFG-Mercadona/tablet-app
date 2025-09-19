#!/usr/bin/env node
// scripts/file-headers.mjs
import fs from "fs";
import path from "path";

const AUTHOR = "Juan José Ruiz Borao";
const CONTACT = "756640@unizar.es";

// Formato de fecha: YYYY-MM-DD HH:mm
function formatDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function buildHeader(fileName) {
  return `/**
 * Nombre del fichero: ${fileName}
 * Desarrollado por ${AUTHOR}
 * Contacto: ${CONTACT}
 * Modificado por última vez: ${formatDate()}
 */
`;
}

const exts = new Set([".ts", ".tsx", ".js", ".jsx"]);
const files = process.argv.slice(2).filter((f) => exts.has(path.extname(f)));

if (files.length === 0) process.exit(0);

for (const filePath of files) {
  try {
    let code = fs.readFileSync(filePath, "utf8");
    const fileName = path.basename(filePath);

    // Si hay shebang (#!/usr/bin/env node), mantenlo arriba
    let shebang = "";
    if (code.startsWith("#!")) {
      const nl = code.indexOf("\n");
      if (nl !== -1) {
        shebang = code.slice(0, nl + 1);
        code = code.slice(nl + 1);
      }
    }

    // Si ya hay nuestra cabecera, la quitamos (para regenerarla)
    const headerRegex = /^\/\*\*[\s\S]*?Desarrollado por Juan José Ruiz Borao[\s\S]*?\*\/\s*/;
    if (headerRegex.test(code)) {
      code = code.replace(headerRegex, "");
    }

    const newHeader = buildHeader(fileName);
    const newCode = shebang + newHeader + code;

    fs.writeFileSync(filePath, newCode, "utf8");
    // console.log(`Actualizado header: ${filePath}`);
  } catch (e) {
    console.error(`Error procesando ${filePath}:`, e.message);
    process.exitCode = 1;
  }
}
