/**
 * CMS de cartelería digital para colegio.
 *
 * Proyecto pensado para sincronización directa GitHub -> Google Apps Script.
 * Runtime Apps Script puro, sin toolchains ni dependencias Node.
 */

var SHEET_NAMES = {
  PANTALLAS: 'PANTALLAS',
  CONTENIDOS: 'CONTENIDOS',
  ASIGNACIONES: 'ASIGNACIONES'
};

var DEFAULT_REFRESH_SEG = 60;
var DEFAULT_SLIDE_DURATION_SEG = 10;
var DEFAULT_BG = '#000000';
var DEFAULT_IMAGE_FIT = 'contain';

function doGet(e) {
  e = e || { parameter: {} };
  var p = e.parameter || {};

  if (p.api === 'playlist') {
    return jsonOutput_(getPlaylistResponse_(p));
  }

  if (p.view === 'admin' || p.admin === '1') {
    return renderAdmin_(p);
  }

  return renderScreen_(p);
}

function renderScreen_(params) {
  var template = HtmlService.createTemplateFromFile('screen');
  template.bootConfig = {
    apiBase: getScriptUrl_(),
    screen: params.screen || '',
    token: params.token || ''
  };

  return template
    .evaluate()
    .setTitle('CMS Cartelería')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function renderAdmin_(params) {
  var template = HtmlService.createTemplateFromFile('admin');
  template.bootConfig = {
    scriptUrl: getScriptUrl_(),
    spreadsheetId: getSpreadsheetIdSafe_(),
    spreadsheetUrl: getSpreadsheetUrlSafe_(),
    mode: 'admin'
  };

  return template
    .evaluate()
    .setTitle('CMS Cartelería · Admin')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Crea las hojas base y carga algunos datos demo.
 *
 * Usa CARTELERIA_SPREADSHEET_ID en Script Properties si quieres apuntar
 * a una hoja concreta. Si no existe, intenta usar la hoja activa.
 */
function setupCarteleria() {
  var ss = getConfigSpreadsheet_();

  ensureSheet_(ss, SHEET_NAMES.PANTALLAS, [[
    'ID_PANTALLA', 'NOMBRE', 'UBICACION', 'TOKEN', 'ACTIVA', 'REFRESH_SEG', 'FONDO_HEX'
  ]]);

  ensureSheet_(ss, SHEET_NAMES.CONTENIDOS, [[
    'ID_CONTENIDO', 'TIPO', 'TITULO', 'TEXTO_HTML', 'FILE_ID', 'URL', 'DURACION_SEG', 'ACTIVO'
  ]]);

  ensureSheet_(ss, SHEET_NAMES.ASIGNACIONES, [[
    'ID_PANTALLA', 'ID_CONTENIDO', 'ORDEN', 'DESDE', 'HASTA', 'ACTIVA'
  ]]);

  seedDemoData_(ss);

  return {
    ok: true,
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    message: 'Estructura base creada correctamente.'
  };
}

function getPlaylistResponse_(params) {
  try {
    var screenId = trimSafe_(params.screen);
    var token = trimSafe_(params.token);

    if (!screenId) {
      return errorResponse_('Falta el parámetro screen.', 400);
    }

    if (!token) {
      return errorResponse_('Falta el parámetro token.', 400);
    }

    var data = readCarteleriaData_();
    var screen = getPantallaById_(data.pantallas, screenId);

    if (!screen) {
      return errorResponse_('Pantalla no encontrada.', 404);
    }

    if (!isYes_(screen.ACTIVA)) {
      return errorResponse_('Pantalla inactiva.', 403);
    }

    if (!isValidToken_(screen, token)) {
      return errorResponse_('Token no válido.', 403);
    }

    var playlist = buildPlaylist_(screen, data.contenidos, data.asignaciones);

    return {
      ok: true,
      serverTime: new Date().toISOString(),
      screen: {
        id: screen.ID_PANTALLA,
        nombre: screen.NOMBRE,
        ubicacion: screen.UBICACION,
        refreshSeg: toPositiveInt_(screen.REFRESH_SEG, DEFAULT_REFRESH_SEG),
        fondoHex: normalizeHexColor_(screen.FONDO_HEX) || DEFAULT_BG
      },
      playlist: playlist
    };
  } catch (err) {
    return errorResponse_(err && err.message ? err.message : 'Error inesperado.', 500);
  }
}

function getAdminDashboardData() {
  var data = readCarteleriaData_();
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    spreadsheetId: getSpreadsheetIdSafe_(),
    spreadsheetUrl: getSpreadsheetUrlSafe_(),
    driveFolderId: getDriveFolderId_(),
    counts: {
      pantallas: data.pantallas.length,
      contenidos: data.contenidos.length,
      asignaciones: data.asignaciones.length,
      pantallasActivas: data.pantallas.filter(function(row) { return isYes_(row.ACTIVA); }).length,
      contenidosActivos: data.contenidos.filter(function(row) { return isYes_(row.ACTIVO); }).length,
      asignacionesActivas: data.asignaciones.filter(function(row) { return isYes_(row.ACTIVA); }).length
    },
    pantallas: data.pantallas,
    contenidos: data.contenidos,
    asignaciones: data.asignaciones
  };
}

function savePantallaAdmin(payload) {
  payload = payload || {};
  var idPantalla = trimSafe_(payload.ID_PANTALLA);
  var nombre = trimSafe_(payload.NOMBRE);
  var token = trimSafe_(payload.TOKEN);

  if (!idPantalla) throw new Error('ID_PANTALLA es obligatorio.');
  if (!nombre) throw new Error('NOMBRE es obligatorio.');
  if (!token) throw new Error('TOKEN es obligatorio.');

  var cleaned = {
    ID_PANTALLA: idPantalla,
    NOMBRE: nombre,
    UBICACION: trimSafe_(payload.UBICACION),
    TOKEN: token,
    ACTIVA: normalizeYesNo_(payload.ACTIVA, true),
    REFRESH_SEG: toPositiveInt_(payload.REFRESH_SEG, DEFAULT_REFRESH_SEG),
    FONDO_HEX: normalizeHexColor_(payload.FONDO_HEX) || DEFAULT_BG
  };

  upsertByKey_(SHEET_NAMES.PANTALLAS, 'ID_PANTALLA', cleaned);
  return getAdminDashboardData();
}

function saveContenidoAdmin(payload) {
  payload = payload || {};
  var idContenido = trimSafe_(payload.ID_CONTENIDO);
  var tipo = trimSafe_(payload.TIPO).toUpperCase();

  if (!idContenido) throw new Error('ID_CONTENIDO es obligatorio.');
  if (!tipo || ['HTML', 'IMAGE', 'VIDEO'].indexOf(tipo) === -1) {
    throw new Error('TIPO debe ser HTML, IMAGE o VIDEO.');
  }

  var normalizedFileId = normalizeDriveFileId_(payload.FILE_ID || payload.URL);

  var cleaned = {
    ID_CONTENIDO: idContenido,
    TIPO: tipo,
    TITULO: trimSafe_(payload.TITULO),
    TEXTO_HTML: payload.TEXTO_HTML || '',
    FILE_ID: normalizedFileId,
    URL: trimSafe_(payload.URL),
    DURACION_SEG: toPositiveInt_(payload.DURACION_SEG, DEFAULT_SLIDE_DURATION_SEG),
    ACTIVO: normalizeYesNo_(payload.ACTIVO, true)
  };

  if (!cleaned.TITULO) throw new Error('TITULO es obligatorio.');

  if (tipo === 'HTML' && !trimSafe_(cleaned.TEXTO_HTML)) {
    cleaned.TEXTO_HTML = '<div><h2>' + escapeHtmlForTemplate_(cleaned.TITULO) + '</h2></div>';
  }

  if ((tipo === 'IMAGE' || tipo === 'VIDEO') && !cleaned.URL && !cleaned.FILE_ID) {
    throw new Error('Para IMAGE/VIDEO debes indicar URL o FILE_ID.');
  }

  upsertByKey_(SHEET_NAMES.CONTENIDOS, 'ID_CONTENIDO', cleaned);
  return getAdminDashboardData();
}

function saveAsignacionAdmin(payload) {
  payload = payload || {};
  var idPantalla = trimSafe_(payload.ID_PANTALLA);
  var idContenido = trimSafe_(payload.ID_CONTENIDO);

  if (!idPantalla) throw new Error('ID_PANTALLA es obligatorio.');
  if (!idContenido) throw new Error('ID_CONTENIDO es obligatorio.');

  validatePantallaExists_(idPantalla);
  validateContenidoExists_(idContenido);

  var cleaned = {
    ID_PANTALLA: idPantalla,
    ID_CONTENIDO: idContenido,
    ORDEN: toPositiveInt_(payload.ORDEN, 1),
    DESDE: normalizeDateText_(payload.DESDE),
    HASTA: normalizeDateText_(payload.HASTA),
    ACTIVA: normalizeYesNo_(payload.ACTIVA, true)
  };

  upsertAsignacion_(cleaned, payload._ROW);
  return getAdminDashboardData();
}

function setPantallaActivaAdmin(idPantalla, activa) {
  toggleByKey_(SHEET_NAMES.PANTALLAS, 'ID_PANTALLA', idPantalla, 'ACTIVA', activa);
  return getAdminDashboardData();
}

function setContenidoActivoAdmin(idContenido, activo) {
  toggleByKey_(SHEET_NAMES.CONTENIDOS, 'ID_CONTENIDO', idContenido, 'ACTIVO', activo);
  return getAdminDashboardData();
}

function setAsignacionActivaAdmin(rowNumber, activa) {
  var row = parseInt(rowNumber, 10);
  if (isNaN(row) || row < 2) throw new Error('Fila de asignación inválida.');

  var ss = getConfigSpreadsheet_();
  var sh = ss.getSheetByName(SHEET_NAMES.ASIGNACIONES);
  var headerMap = getHeaderMap_(sh);
  var col = headerMap.ACTIVA;

  if (!col) throw new Error('La hoja ASIGNACIONES no tiene columna ACTIVA.');
  sh.getRange(row, col).setValue(normalizeYesNo_(activa, true));
}

function getDriveResourcesAdmin() {
  var folderId = getDriveFolderId_();
  if (!folderId) {
    return {
      ok: true,
      folderId: '',
      folderUrl: '',
      files: [],
      note: 'Define CARTELERIA_DRIVE_FOLDER_ID en Script Properties para listar archivos de Drive.'
    };
  }

  var folder;
  try {
    folder = DriveApp.getFolderById(folderId);
  } catch (err) {
    throw new Error('No se pudo abrir la carpeta de Drive configurada. Revisa CARTELERIA_DRIVE_FOLDER_ID.');
  }

  var files = [];
  var iterator = folder.getFiles();
  var maxItems = 80;
  while (iterator.hasNext() && files.length < maxItems) {
    var file = iterator.next();
    var mime = file.getMimeType();
    if (!isSupportedDriveMime_(mime)) continue;

    var itemType = mime.indexOf('video/') === 0 ? 'VIDEO' : 'IMAGE';
    var fileId = file.getId();
    files.push({
      fileId: fileId,
      name: file.getName(),
      mimeType: mime,
      type: itemType,
      url: buildDriveMediaUrl_(fileId, itemType),
      previewUrl: buildDriveImageUrl_(fileId),
      updatedAt: file.getLastUpdated() ? file.getLastUpdated().toISOString() : ''
    });
  }

  return {
    ok: true,
    folderId: folderId,
    folderUrl: folder.getUrl(),
    files: files,
    note: 'Los archivos deben estar compartidos con acceso de lectura para los dispositivos de pantalla.'
  };
}

function buildPlaylist_(screen, contenidos, asignaciones) {
  var now = new Date();

  var activeAssignments = asignaciones
    .filter(function(row) {
      return row.ID_PANTALLA === screen.ID_PANTALLA && isYes_(row.ACTIVA) && isCurrentAssignment_(row, now);
    })
    .sort(function(a, b) {
      return toPositiveInt_(a.ORDEN, 999999) - toPositiveInt_(b.ORDEN, 999999);
    });

  var contentById = indexBy_(contenidos.filter(function(row) {
    return isYes_(row.ACTIVO);
  }), 'ID_CONTENIDO');

  return activeAssignments
    .map(function(assignment) {
      return contentById[assignment.ID_CONTENIDO];
    })
    .filter(Boolean)
    .map(function(content) {
      return normalizeContent_(content);
    });
}

function readCarteleriaData_() {
  var ss = getConfigSpreadsheet_();
  return {
    pantallas: getSheetObjects_(ss, SHEET_NAMES.PANTALLAS),
    contenidos: getSheetObjects_(ss, SHEET_NAMES.CONTENIDOS),
    asignaciones: getSheetObjects_(ss, SHEET_NAMES.ASIGNACIONES)
  };
}

function getPantallaById_(pantallas, idPantalla) {
  return pantallas.filter(function(row) {
    return row.ID_PANTALLA === idPantalla;
  })[0] || null;
}

function isValidToken_(screen, token) {
  var expected = trimSafe_(screen.TOKEN);
  var received = trimSafe_(token);
  return !!expected && expected === received;
}

function normalizeContent_(row) {
  var type = trimSafe_(row.TIPO).toUpperCase();
  var fileId = normalizeDriveFileId_(row.FILE_ID || row.URL);
  var fileUrl = fileId ? buildDriveMediaUrl_(fileId, type) : '';
  var finalUrl = trimSafe_(row.URL) || fileUrl;

  return {
    id: trimSafe_(row.ID_CONTENIDO),
    type: type,
    title: trimSafe_(row.TITULO),
    textHtml: row.TEXTO_HTML || '',
    fileId: fileId,
    url: finalUrl,
    durationSeg: toPositiveInt_(row.DURACION_SEG, DEFAULT_SLIDE_DURATION_SEG),
    imageFit: normalizeImageFit_(row.IMAGE_FIT || row.AJUSTE || row.MODO_IMAGEN)
  };
}

function buildDriveMediaUrl_(fileId, type) {
  if (!fileId) return '';
  return String(type || '').toUpperCase() === 'VIDEO'
    ? buildDriveVideoUrl_(fileId)
    : buildDriveImageUrl_(fileId);
}

function buildDriveImageUrl_(fileId) {
  return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w2200';
}

function buildDriveVideoUrl_(fileId) {
  return 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(fileId);
}

function normalizeDriveFileId_(value) {
  var raw = trimSafe_(value);
  if (!raw) return '';

  if (/^[a-zA-Z0-9_-]{10,}$/.test(raw)) return raw;

  var match = raw.match(/[-\w]{25,}/);
  return match ? match[0] : '';
}

function getDriveFolderId_() {
  return trimSafe_(PropertiesService.getScriptProperties().getProperty('CARTELERIA_DRIVE_FOLDER_ID'));
}

function isSupportedDriveMime_(mimeType) {
  return mimeType.indexOf('image/') === 0 || mimeType.indexOf('video/') === 0;
}

function validatePantallaExists_(idPantalla) {
  var ss = getConfigSpreadsheet_();
  var sh = ss.getSheetByName(SHEET_NAMES.PANTALLAS);
  var objects = getSheetObjects_(ss, SHEET_NAMES.PANTALLAS);
  var found = objects.some(function(row) { return row.ID_PANTALLA === idPantalla; });
  if (!found) throw new Error('La pantalla indicada no existe: ' + idPantalla);
  return sh;
}

function validateContenidoExists_(idContenido) {
  var objects = getSheetObjects_(getConfigSpreadsheet_(), SHEET_NAMES.CONTENIDOS);
  var found = objects.some(function(row) { return row.ID_CONTENIDO === idContenido; });
  if (!found) throw new Error('El contenido indicado no existe: ' + idContenido);
}

function upsertByKey_(sheetName, keyColumn, payload) {
  var ss = getConfigSpreadsheet_();
  var sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('No existe la hoja ' + sheetName + '.');

  var values = sh.getDataRange().getValues();
  if (!values.length) throw new Error('La hoja ' + sheetName + ' no tiene cabecera.');

  var headers = values[0].map(function(h) { return trimSafe_(h); });
  var keyIdx = headers.indexOf(keyColumn);
  if (keyIdx === -1) throw new Error('No existe la columna ' + keyColumn + ' en ' + sheetName + '.');

  var targetRow = -1;
  for (var i = 1; i < values.length; i++) {
    if (trimSafe_(values[i][keyIdx]) === trimSafe_(payload[keyColumn])) {
      targetRow = i + 1;
      break;
    }
  }

  var rowData = headers.map(function(header) {
    return payload.hasOwnProperty(header) ? payload[header] : '';
  });

  if (targetRow === -1) {
    sh.appendRow(rowData);
  } else {
    sh.getRange(targetRow, 1, 1, headers.length).setValues([rowData]);
  }
}

function upsertAsignacion_(payload, rowNumber) {
  var ss = getConfigSpreadsheet_();
  var sh = ss.getSheetByName(SHEET_NAMES.ASIGNACIONES);
  if (!sh) throw new Error('No existe la hoja ASIGNACIONES.');

  var values = sh.getDataRange().getValues();
  if (!values.length) throw new Error('La hoja ASIGNACIONES no tiene cabecera.');

  var headers = values[0].map(function(h) { return trimSafe_(h); });
  var targetRow = parseInt(rowNumber, 10);

  if (isNaN(targetRow) || targetRow < 2) {
    var idxPantalla = headers.indexOf('ID_PANTALLA');
    var idxContenido = headers.indexOf('ID_CONTENIDO');
    targetRow = -1;
    for (var i = 1; i < values.length; i++) {
      if (trimSafe_(values[i][idxPantalla]) === payload.ID_PANTALLA && trimSafe_(values[i][idxContenido]) === payload.ID_CONTENIDO) {
        targetRow = i + 1;
        break;
      }
    }
  }

  var rowData = headers.map(function(header) {
    return payload.hasOwnProperty(header) ? payload[header] : '';
  });

  if (!targetRow || targetRow === -1) {
    sh.appendRow(rowData);
  } else {
    sh.getRange(targetRow, 1, 1, headers.length).setValues([rowData]);
  }
}

function toggleByKey_(sheetName, keyColumn, keyValue, activeColumn, activeValue) {
  var key = trimSafe_(keyValue);
  if (!key) throw new Error('Clave vacía para actualizar ' + sheetName + '.');

  var ss = getConfigSpreadsheet_();
  var sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('No existe la hoja ' + sheetName + '.');

  var values = sh.getDataRange().getValues();
  var headers = values[0].map(function(h) { return trimSafe_(h); });
  var keyIdx = headers.indexOf(keyColumn);
  var activeIdx = headers.indexOf(activeColumn);

  if (keyIdx === -1 || activeIdx === -1) {
    throw new Error('Columnas inválidas en ' + sheetName + '.');
  }

  for (var i = 1; i < values.length; i++) {
    if (trimSafe_(values[i][keyIdx]) === key) {
      sh.getRange(i + 1, activeIdx + 1).setValue(normalizeYesNo_(activeValue, true));
      return;
    }
  }

  throw new Error('No se encontró el registro ' + key + ' en ' + sheetName + '.');
}

function getHeaderMap_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.reduce(function(acc, h, idx) {
    acc[trimSafe_(h)] = idx + 1;
    return acc;
  }, {});
}

function getConfigSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var spreadsheetId = trimSafe_(props.getProperty('CARTELERIA_SPREADSHEET_ID'));

  if (spreadsheetId) {
    return SpreadsheetApp.openById(spreadsheetId);
  }

  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    throw new Error('No se ha configurado CARTELERIA_SPREADSHEET_ID y no hay hoja activa disponible.');
  }
}

function getSpreadsheetIdSafe_() {
  try {
    return getConfigSpreadsheet_().getId();
  } catch (err) {
    return '';
  }
}

function getSpreadsheetUrlSafe_() {
  try {
    return getConfigSpreadsheet_().getUrl();
  } catch (err) {
    return '';
  }
}

function getSheetObjects_(ss, sheetName) {
  var sh = ss.getSheetByName(sheetName);
  if (!sh) {
    throw new Error('No existe la hoja ' + sheetName + '. Ejecuta setupCarteleria().');
  }

  var values = sh.getDataRange().getValues();
  if (!values.length) return [];

  var headers = values[0].map(function(h) {
    return trimSafe_(h);
  });

  return values.slice(1)
    .map(function(row, idx) {
      return { row: row, rowNum: idx + 2 };
    })
    .filter(function(item) {
      return item.row.some(function(cell) {
        return trimSafe_(cell) !== '';
      });
    })
    .map(function(item) {
      var obj = { _ROW: item.rowNum };
      headers.forEach(function(header, idx) {
        obj[header] = item.row[idx];
      });
      return obj;
    });
}

function ensureSheet_(ss, name, seedRows) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
  }

  if (sh.getLastRow() === 0 && seedRows && seedRows.length) {
    sh.getRange(1, 1, seedRows.length, seedRows[0].length).setValues(seedRows);
    sh.setFrozenRows(1);
  }

  return sh;
}

function seedDemoData_(ss) {
  var pantallas = ss.getSheetByName(SHEET_NAMES.PANTALLAS);
  var contenidos = ss.getSheetByName(SHEET_NAMES.CONTENIDOS);
  var asignaciones = ss.getSheetByName(SHEET_NAMES.ASIGNACIONES);

  if (pantallas.getLastRow() === 1) {
    pantallas.getRange(2, 1, 1, 7).setValues([[
      'ENTRADA_PRINCIPAL', 'Entrada principal', 'Hall', 'demo-token-001', 'SI', 30, '#101820'
    ]]);
  }

  if (contenidos.getLastRow() === 1) {
    contenidos.getRange(2, 1, 3, 8).setValues([
      ['C001', 'HTML', 'Bienvenida', '<div style="text-align:center"><h1>Bienvenidos</h1><p>Salesianos Sant Joan Bosco</p></div>', '', '', 10, 'SI'],
      ['C002', 'IMAGE', 'Imagen ejemplo', '', '', 'https://picsum.photos/1920/1080', 8, 'SI'],
      ['C003', 'VIDEO', 'Vídeo ejemplo', '<div style="text-align:center"><h2>Vídeo pendiente de recurso</h2></div>', '', '', 15, 'NO']
    ]);
  }

  if (asignaciones.getLastRow() === 1) {
    asignaciones.getRange(2, 1, 2, 6).setValues([
      ['ENTRADA_PRINCIPAL', 'C001', 1, '', '', 'SI'],
      ['ENTRADA_PRINCIPAL', 'C002', 2, '', '', 'SI']
    ]);
  }
}

function isCurrentAssignment_(row, now) {
  var from = parseDateLoose_(row.DESDE);
  var to = parseDateLoose_(row.HASTA);

  if (from && now < from) return false;

  if (to) {
    var end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (now > end) return false;
  }

  return true;
}

function parseDateLoose_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) return value;

  var parsed = new Date(value);
  return isNaN(parsed) ? null : parsed;
}

function normalizeDateText_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var text = trimSafe_(value);
  var parsed = new Date(text);
  if (!isNaN(parsed)) {
    return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return text;
}

function normalizeYesNo_(value, fallbackYes) {
  if (value == null || trimSafe_(value) === '') {
    return fallbackYes ? 'SI' : 'NO';
  }
  return isYes_(value) ? 'SI' : 'NO';
}

function normalizeHexColor_(value) {
  var text = trimSafe_(value).replace('#', '');
  if (!text) return '';
  if (/^[0-9A-Fa-f]{3}$/.test(text)) {
    text = text.split('').map(function(ch) { return ch + ch; }).join('');
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(text)) return '';
  return '#' + text.toUpperCase();
}

function normalizeImageFit_(value) {
  var text = trimSafe_(value).toLowerCase();
  if (text === 'cover') return 'cover';
  return DEFAULT_IMAGE_FIT;
}

function trimSafe_(value) {
  return String(value == null ? '' : value).trim();
}

function isYes_(value) {
  var normalized = trimSafe_(value).toUpperCase();
  return normalized === 'SI' || normalized === 'SÍ' || normalized === 'TRUE' || normalized === '1' || normalized === 'YES';
}

function toPositiveInt_(value, fallback) {
  var n = parseInt(value, 10);
  return isNaN(n) || n <= 0 ? fallback : n;
}

function indexBy_(rows, key) {
  return rows.reduce(function(acc, row) {
    acc[row[key]] = row;
    return acc;
  }, {});
}

function errorResponse_(message, status) {
  return {
    ok: false,
    status: status || 500,
    error: message || 'Error'
  };
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getScriptUrl_() {
  try {
    return ScriptApp.getService().getUrl();
  } catch (err) {
    return '';
  }
}

function escapeHtmlForTemplate_(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
