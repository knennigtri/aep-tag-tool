const path = require("path");

const useColor =
  Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

function paint(code, text) {
  if (!useColor) {
    return text;
  }
  return "\x1b[" + code + "m" + text + "\x1b[0m";
}

const c = {
  bold: (t) => paint("1", t),
  dim: (t) => paint("2", t),
  green: (t) => paint("32", t),
  yellow: (t) => paint("33", t),
  cyan: (t) => paint("36", t),
  red: (t) => paint("31", t)
};

const STEP_LABELS = {
  auth: "Authenticate with Adobe IMS",
  exportTag: "Download property from Reactor API",
  deleteTags: "Delete properties matching filter",
  createProp: "Create tag property",
  installExts: "Install extensions",
  installDataElements: "Import data elements",
  publishLibDev: "Publish library to Development",
  publishLibProd: "Publish library to Production"
};

const MODE_META = {
  export: { title: "Export tag property", icon: "↓" },
  import: { title: "Import tag property", icon: "↑" },
  delete: { title: "Delete tag properties", icon: "×" }
};

let stepIndex = 0;

function resetSteps() {
  stepIndex = 0;
}

function blank() {
  console.log("");
}

function divider() {
  console.log(c.dim("────────────────────────────────────────"));
}

function banner(mode, subtitle) {
  const meta = MODE_META[mode] || { title: mode, icon: "•" };
  blank();
  console.log(c.bold(meta.icon + "  " + meta.title));
  if (subtitle) {
    console.log(c.dim("   " + subtitle));
  }
  divider();
}

function field(label, value) {
  if (value === undefined || value === null || value === "") {
    return;
  }
  console.log("  " + c.cyan(label + ":") + " " + value);
}

function stepLabel(cmdName, folder) {
  if (folder && folder !== "") {
    return folder;
  }
  if (STEP_LABELS[cmdName]) {
    return STEP_LABELS[cmdName];
  }
  if (cmdName && cmdName.length > 2) {
    return "Import rule: " + cmdName;
  }
  return cmdName || "Run collection";
}

function stepStart(cmdName, folder) {
  stepIndex += 1;
  const label = stepLabel(cmdName, folder);
  const prefix = c.dim("[" + stepIndex + "]");
  console.log(prefix + " " + label + " …");
  return label;
}

function stepDone(cmdName, folder) {
  const label = stepLabel(cmdName, folder);
  console.log("    " + c.green("✓") + " " + label);
}

function stepFail(cmdName, folder, message) {
  const label = stepLabel(cmdName, folder);
  console.log("    " + c.red("✗") + " " + label);
  if (message) {
    console.log("      " + c.dim(message));
  }
}

function authOk(method) {
  blank();
  console.log("  " + c.green("✓") + " Authentication ready (" + (method || "oauth") + ")");
}

function authStart(method) {
  stepStart("auth");
  return method;
}

function exportStart(options) {
  resetSteps();
  banner("export", "Pull a property from Adobe Experience Platform Tags");
  field("Property ID", options.pid);
  if (options.outputDir && options.outputDir !== ".") {
    field("Output folder", path.resolve(options.outputDir));
  }
  blank();
}

function exportDone(summary) {
  blank();
  divider();
  console.log(c.green("✓ Export complete"));
  field("Property", summary.propertyName);
  field("File", path.resolve(summary.outputFile));
  if (summary.counts) {
    field("Extensions", String(summary.counts.extensions));
    field("Data elements", String(summary.counts.dataElements));
    field("Rules", String(summary.counts.rules));
  }
  console.log(c.dim("  JUnit report: bin/newman/logs"));
  blank();
}

function importStart(options) {
  resetSteps();
  banner("import", "Deploy a property export into an organization");
  field("Property", options.propertyName);
  if (options.propID) {
    field("Target property ID", options.propID);
  }
  if (options.settingsFile) {
    field("Settings", options.settingsFile);
  }
  field("Steps", options.actionsLabel || options.actions);
  blank();
}

function importDone(options) {
  blank();
  divider();
  console.log(c.green("✓ Import complete"));
  field("Property", options.propertyName);
  if (options.propID) {
    field("Property ID", options.propID);
  }
  blank();
}

function importEmbedCode(artifactURL) {
  blank();
  console.log(c.bold("  Production embed code"));
  console.log("  " + c.dim("<script src=\"" + artifactURL + "\" async></script>"));
  blank();
}

function deleteStart(options) {
  resetSteps();
  banner("delete", "Remove properties whose names contain a string");
  field("Name contains", options.searchStr);
  blank();
}

function deleteDone() {
  blank();
  divider();
  console.log(c.green("✓ Delete run finished"));
  console.log(c.dim("  Review JUnit report in bin/newman/logs for details."));
  blank();
}

function dryRun(mode, details) {
  banner(mode, "Dry run — no API calls");
  if (details) {
    Object.keys(details).forEach((key) => field(key, details[key]));
  }
  console.log(c.yellow("  (skipped)"));
  blank();
}

function configOk(configPath, source) {
  blank();
  console.log("  " + c.green("✓") + " Config loaded");
  field("File", path.resolve(configPath));
  if (source && source !== "flat") {
    field("Format", source);
  }
  blank();
}

function apiFailure(reportDir) {
  blank();
  console.log(c.red("✗ API request failed"));
  console.log(c.dim("  See report: " + reportDir));
  blank();
}

function warn(message) {
  console.log(c.yellow("! ") + message);
}

function error(message) {
  console.log(c.red("✗ ") + message);
}

const IMPORT_ACTION_LABELS = {
  C: "Create property",
  E: "Extensions",
  D: "Data elements",
  R: "Rules",
  L: "Publish (Dev)",
  P: "Publish (Prod)"
};

function formatImportActions(actions) {
  if (!actions || !actions.length) {
    return "Full import (all steps)";
  }
  return actions.map((code) => IMPORT_ACTION_LABELS[code] || code).join(" → ");
}

function countExportItems(value) {
  if (!value) {
    return 0;
  }
  if (Array.isArray(value)) {
    return value.length;
  }
  if (typeof value === "object") {
    return Object.keys(value).length;
  }
  return 0;
}

exports.resetSteps = resetSteps;
exports.formatImportActions = formatImportActions;
exports.countExportItems = countExportItems;
exports.banner = banner;
exports.field = field;
exports.stepStart = stepStart;
exports.stepDone = stepDone;
exports.stepFail = stepFail;
exports.authOk = authOk;
exports.authStart = authStart;
exports.exportStart = exportStart;
exports.exportDone = exportDone;
exports.importStart = importStart;
exports.importDone = importDone;
exports.importEmbedCode = importEmbedCode;
exports.deleteStart = deleteStart;
exports.deleteDone = deleteDone;
exports.dryRun = dryRun;
exports.configOk = configOk;
exports.apiFailure = apiFailure;
exports.warn = warn;
exports.error = error;
exports.stepLabel = stepLabel;
