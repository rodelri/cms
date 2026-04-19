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
        fondoHex: trimSafe_(screen.FONDO_HEX) || DEFAULT_BG
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
  var fileUrl = row.FILE_ID ? buildDriveFileUrl_(row.FILE_ID, type) : '';
  var finalUrl = trimSafe_(row.URL) || fileUrl;

  return {
    id: trimSafe_(row.ID_CONTENIDO),
    type: type,
    title: trimSafe_(row.TITULO),
    textHtml: row.TEXTO_HTML || '',
    fileId: trimSafe_(row.FILE_ID),
    url: finalUrl,
    durationSeg: toPositiveInt_(row.DURACION_SEG, DEFAULT_SLIDE_DURATION_SEG)
  };
}

function buildDriveFileUrl_(fileId, type) {
  var exportMode = type === 'VIDEO' ? 'download' : 'view';
  return 'https://drive.google.com/uc?export=' + exportMode + '&id=' + encodeURIComponent(fileId);
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
    .filter(function(row) {
      return row.some(function(cell) {
        return trimSafe_(cell) !== '';
      });
    })
    .map(function(row) {
      var obj = {};
      headers.forEach(function(header, idx) {
        obj[header] = row[idx];
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
