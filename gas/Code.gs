/**
 * Portal Mata Pimpinan - Google Apps Script web app.
 *
 * Deploy this file as a Web app (Execute as: Me, access: anyone who uses the
 * portal). For a standalone script set Script Property SPREADSHEET_ID; for a
 * bound script it automatically uses the active spreadsheet.
 */
const SHEET_CONFIG = {
  retribusi: ['Retribusi PBG', 'Retribusi', 'PBG'],
  skm: ['SKM', 'Survei SKM', 'Monitoring SKM'],
  pegawai: ['Pegawai', 'Data Pegawai'],
  dispensasi: ['Dispensasi'],
  rapat: ['Rapat', 'Notulen Rapat'],
  investasi: ['Investasi', 'Realisasi Investasi']
};

function doGet(e) {
  return handleRequest_(requestParameters_(e));
}

function doPost(e) {
  return handleRequest_(requestParameters_(e));
}

function handleRequest_(params) {
  try {
    const action = String(params.action || '').trim();
    if (!action) throw new Error('Parameter action wajib diisi.');
    const module = moduleFromAction_(action);
    const sheet = getSheet_(module, params.sheet);

    if (/^get/i.test(action)) {
      const data = readRows_(sheet);
      return json_({ success: true, data: data, total: data.length });
    }
    if (/^create/i.test(action)) return createRow_(sheet, parseData_(params.data));
    if (/^update/i.test(action)) return updateRow_(sheet, params.id, parseData_(params.data));
    if (/^delete/i.test(action)) return deleteRow_(sheet, params.id);
    throw new Error('Action tidak dikenali: ' + action);
  } catch (error) {
    console.error(error);
    return json_({ success: false, message: error.message || 'Terjadi kesalahan pada server.' });
  }
}

function requestParameters_(e) {
  const parameters = (e && e.parameter) ? Object.assign({}, e.parameter) : {};
  if (e && e.postData && e.postData.contents) {
    const contentType = String(e.postData.type || '');
    if (contentType.indexOf('application/json') !== -1) Object.assign(parameters, JSON.parse(e.postData.contents));
    else {
      e.postData.contents.split('&').forEach(function(part) {
        const pair = part.split('=');
        if (pair[0]) parameters[decodeURIComponent(pair[0].replace(/\+/g, ' '))] = decodeURIComponent((pair.slice(1).join('=') || '').replace(/\+/g, ' '));
      });
    }
  }
  return parameters;
}

function moduleFromAction_(action) {
  const key = action.toLowerCase();
  if (key.indexOf('retribusi') !== -1 || key.indexOf('pbg') !== -1) return 'retribusi';
  if (key.indexOf('skm') !== -1) return 'skm';
  if (key.indexOf('pegawai') !== -1) return 'pegawai';
  if (key.indexOf('dispensasi') !== -1) return 'dispensasi';
  if (key.indexOf('rapat') !== -1) return 'rapat';
  if (key.indexOf('investasi') !== -1) return 'investasi';
  throw new Error('Action tidak memiliki modul spreadsheet: ' + action);
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet_(module, requestedSheet) {
  const ss = getSpreadsheet_();
  if (requestedSheet) {
    const requested = String(requestedSheet);
    const allowed = (module === 'investasi' && ['target', 'realisasi', 'historis_tahunan'].indexOf(requested) !== -1) || (module === 'dispensasi' && requested === 'log_dispensasi');
    if (!allowed) throw new Error('Sheet yang diminta tidak diizinkan.');
    const sheet = ss.getSheetByName(requested);
    if (!sheet) throw new Error('Sheet ' + requestedSheet + ' tidak ditemukan.');
    return sheet;
  }
  const names = SHEET_CONFIG[module] || [];
  for (let i = 0; i < names.length; i++) {
    const sheet = ss.getSheetByName(names[i]);
    if (sheet) return sheet;
  }
  // Each module may be deployed as a standalone Apps Script bound to one
  // spreadsheet. Preserve that setup even when its tab name differs from the
  // portal aliases above by using its first sheet as the final fallback.
  const fallbackSheet = ss.getSheets()[0];
  if (fallbackSheet) return fallbackSheet;
  throw new Error('Sheet untuk modul ' + module + ' tidak ditemukan.');
}

function tableLayout_(sheet) {
  if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) throw new Error('Sheet ' + sheet.getName() + ' belum memiliki baris header.');
  const rowCount = Math.min(sheet.getLastRow(), 20);
  const candidates = sheet.getRange(1, 1, rowCount, sheet.getLastColumn()).getDisplayValues();
  let headerRow = 0;
  let bestCount = 0;

  // A title row with merged cells normally has only one populated cell;
  // choose the first of the densest rows as the actual tabular header.
  candidates.forEach(function(row, index) {
    const count = row.filter(function(value) { return String(value).trim() !== ''; }).length;
    if (count > bestCount) {
      bestCount = count;
      headerRow = index + 1;
    }
  });
  if (!bestCount) throw new Error('Sheet ' + sheet.getName() + ' belum memiliki header tabel.');

  const sourceHeaders = candidates[headerRow - 1];
  const seen = {};
  const headers = sourceHeaders.map(function(header, index) {
    let value = String(header).trim() || ('Kolom ' + (index + 1));
    if (seen[value]) value += ' ' + (seen[value] + 1);
    seen[String(header).trim() || ('Kolom ' + (index + 1))] = (seen[String(header).trim() || ('Kolom ' + (index + 1))] || 0) + 1;
    return value;
  });
  return { headerRow: headerRow, headers: headers };
}

function headers_(sheet) {
  return tableLayout_(sheet).headers;
}

function readRows_(sheet) {
  const layout = tableLayout_(sheet);
  const headers = layout.headers;
  if (sheet.getLastRow() <= layout.headerRow) return [];
  return sheet.getRange(layout.headerRow + 1, 1, sheet.getLastRow() - layout.headerRow, headers.length).getValues().map(function(values, index) {
    const row = { _rowId: layout.headerRow + index + 1 };
    headers.forEach(function(header, col) {
      const value = values[col];
      row[header] = value instanceof Date ? Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss") : value;
    });
    return row;
  });
}

function parseData_(data) {
  const value = typeof data === 'string' ? JSON.parse(data) : data;
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Payload data tidak valid.');
  return value;
}

function createRow_(sheet, data) {
  const headers = headers_(sheet);
  const row = headers.map(function(header) { return data[header] === undefined ? '' : data[header]; });
  sheet.appendRow(row);
  return json_({ success: true, message: 'Data berhasil ditambahkan.', data: readRows_(sheet).slice(-1)[0] });
}

function updateRow_(sheet, id, data) {
  const rowId = Number(id);
  if (!Number.isInteger(rowId) || rowId < 2 || rowId > sheet.getLastRow()) throw new Error('ID baris tidak valid. Muat ulang data lalu coba lagi.');
  const headers = headers_(sheet);
  const range = sheet.getRange(rowId, 1, 1, headers.length);
  const current = range.getValues()[0];
  headers.forEach(function(header, index) { if (Object.prototype.hasOwnProperty.call(data, header)) current[index] = data[header]; });
  range.setValues([current]);
  return json_({ success: true, message: 'Data berhasil diperbarui.', data: readRows_(sheet).filter(function(row) { return row._rowId === rowId; })[0] });
}

function deleteRow_(sheet, id) {
  const rowId = Number(id);
  if (!Number.isInteger(rowId) || rowId < 2 || rowId > sheet.getLastRow()) throw new Error('ID baris tidak valid. Muat ulang data lalu coba lagi.');
  sheet.deleteRow(rowId);
  return json_({ success: true, message: 'Data berhasil dihapus.' });
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
