const vscode = require("vscode");
const sql = require("mssql");
const fs = require("fs");
const path = require("path");


async function loadConfig() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace is open.");
    return;
  }

  const configPath = path.join(workspaceFolders[0].uri.fsPath, "config.json");
  if (!fs.existsSync(configPath)) {
    vscode.window.showErrorMessage("config.json not found in the workspace.");
    return;
  }

  const config = fs.readFileSync(configPath, "utf8");
  return JSON.parse(config);
}

async function loadEvent() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace is open.");
    return;
  }

  const config = await loadConfig();
  if (!config) return;

  const eventsFile = config.eventsFile;
  if (!fs.existsSync(eventsFile)) {
    vscode.window.showErrorMessage(`events.json file not found in ${eventsFile}.`);
    return;
  }

  const events = fs.readFileSync(eventsFile, "utf8");
  return JSON.parse(events);
}

async function connectToDatabase(config, type) {
  try {
    const dbConfig = {
      server: config.server.name,
      user: config.server.user,
      password: config.server.pass,
      database: config[type].database,
      options: config.server.options
    };

    await sql.connect(dbConfig);
  } catch (err) {
    vscode.window.showErrorMessage(`Error connecting to (${database}): ${err}`);
    throw err;
  }
}

async function getMacros() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace is open.");
    return;
  }

  const config = await loadConfig();
  if (!config) return;


  const type = "app";
  const cpmuser = config.app.cpmuser;
  const folder = config.folders.macros;
  const appnames = config.app.appnames;

  if (!Array.isArray(appnames) || appnames.length === 0) {
    vscode.window.showErrorMessage("No APPNAMEs specified in config.json.");
    return;
  }

  try {
    await connectToDatabase(config, type);

    let result;
    for (const appname of appnames) {
      if (appname) {
        result = await sql.query`SELECT APPNAME, MACRONAME, MACRO FROM MACROS WHERE APPNAME = ${appname} AND USERNAME = ${cpmuser}`;
      } else {
        result = await sql.query`SELECT APPNAME, MACRONAME, MACRO FROM MACROS WHERE APPNAME = '' AND USERNAME = ${cpmuser}`;
      }

      if (result.recordset.length === 0) {
        vscode.window.showErrorMessage(`No macros found for APPNAME: ${appname || "Global"}`);
        continue;
      }

      const basePath = path.join(
        workspaceFolders[0].uri.fsPath,
        folder,
        appname || "Global"
      );

      if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, { recursive: true });
      }

      const macros = result.recordset;
      macros.forEach((macro) => {
        if (macro.MACRONAME) {
          const filePath = path.join(basePath, `${macro.MACRONAME}.js`);
          fs.writeFileSync(filePath, macro.MACRO);
        }
      });

      vscode.window.showInformationMessage(`Macros for ${appname || "Global"} have been saved.`);
    }
  } catch (err) {
    vscode.window.showErrorMessage(`Error fetching macros: ${err}`);
  } finally {
    await sql.close();
  }
}

async function getAllMacros() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace is open.");
    return;
  }

  const config = await loadConfig();
  if (!config) return;

  const type = "app";
  const cpmuser = config.app.cpmuser;
  const folder = config.folders.macros;

  try {
    await connectToDatabase(config, type);

    let result = await sql.query(`SELECT DISTINCT APPNAME FROM dbo.MACROS ORDER BY APPNAME;`);
    const resultset = result.recordset;

    const appnames = [];
    resultset.forEach((row) => {
      appnames.push(row.APPNAME);
    });

    for (const appname of appnames) {
      if (appname) {
        result = await sql.query`SELECT APPNAME, MACRONAME, MACRO FROM MACROS WHERE APPNAME = ${appname} AND USERNAME = ${cpmuser}`;
      } else {
        result = await sql.query`SELECT APPNAME, MACRONAME, MACRO FROM MACROS WHERE APPNAME = '' AND USERNAME = ${cpmuser}`;
      }

      if (result.recordset.length === 0) {
        if (appname) {
          vscode.window.showErrorMessage(`No macros found for APPNAME: ${appname}`);
        } else {
          vscode.window.showErrorMessage("No macros found for APPNAME: Global");
        }
        continue;
      }

      const basePath = path.join(
        workspaceFolders[0].uri.fsPath,
        folder,
        appname || "Global"
      );

      if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, { recursive: true });
      }

      const macros = result.recordset;
      macros.forEach((macro) => {
        if (macro.MACRONAME) {
          const filePath = path.join(basePath, `${macro.MACRONAME}.js`);
          fs.writeFileSync(filePath, macro.MACRO);
        }
      });
    }
    vscode.window.showInformationMessage(`All macros have been saved.`);
  } catch (err) {
    vscode.window.showErrorMessage(`Error fetching all macros: ${err}`);
  } finally {
    await sql.close();
  }
}

async function getMacrosByAppName(appname) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace is open.");
    return;
  }

  const config = await loadConfig();
  if (!config) return;

  const type = "app";
  const cpmuser = config.app.cpmuser;
  const folder = config.folders.macros;

  try {
    await connectToDatabase(config, type);

    let result;
    if (appname) {
      result = await sql.query`SELECT APPNAME, MACRONAME, MACRO FROM MACROS WHERE APPNAME = ${appname} AND USERNAME = ${cpmuser}`;

      //appname i tablo daki yazılmış haliyle degistiriyorum.
      appname = result.recordset[0].APPNAME
    } else {
      result = await sql.query`SELECT APPNAME, MACRONAME, MACRO FROM MACROS WHERE APPNAME = '' AND USERNAME = ${cpmuser}`;
    }

    if (result.recordset.length === 0) {
      if (appname) {
        vscode.window.showErrorMessage(`No macros found for APPNAME: ${appname}`);
      } else {
        vscode.window.showErrorMessage("No macros found for APPNAME: Global");
      }
      return;
    }

    const basePath = path.join(
      workspaceFolders[0].uri.fsPath,
      folder,
      appname || "Global"
    );

    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }

    const macros = result.recordset;
    macros.forEach((macro) => {
      const filePath = path.join(basePath, `${macro.MACRONAME}.js`);
      fs.writeFileSync(filePath, macro.MACRO);
    });

    vscode.window.showInformationMessage(`Macros for ${appname || "Global"} have been saved.`);
  } catch (err) {
    vscode.window.showErrorMessage(`Error fetching macros: ${err}`);
  } finally {
    await sql.close();
  }
}

async function getScript() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace is open.");
    return;
  }

  const config = await loadConfig();
  if (!config) return;

  const events = await loadEvent();
  if (!events) return;

  const type = "sec";
  const companyno = config.sec.companyno;
  const cpmuser = config.sec.cpmuser;
  const appnames = config.sec.appnames;
  const folder = config.folders.script;

  if (!Array.isArray(appnames) || appnames.length === 0) {
    vscode.window.showErrorMessage("No APPNAMEs specified in config.json.");
    return;
  }

  try {
    await connectToDatabase(config, type);

    let result;
    for (const appname of appnames) {
      result = await sql.query`SELECT APPNAME, TABLENAME, EVENT, SCRIPT FROM SECSCR WHERE COMPANYNO = ${companyno} AND USERNAME = ${cpmuser} AND APPNAME = ${appname} `;

      if (result.recordset.length === 0) {
        vscode.window.showErrorMessage(`No script found for APPNAME: ${appname}`);
        continue;
      }

      const scripts = result.recordset;

      scripts.forEach((script) => {
        const tablename = script.TABLENAME;
        const event = script.EVENT;
        const eventname = events[event];
        const basePath = path.join(
          workspaceFolders[0].uri.fsPath,
          folder,
          appname,
          tablename
        );

        if (!fs.existsSync(basePath)) {
          fs.mkdirSync(basePath, { recursive: true });
        }

        const filePath = path.join(basePath, `${eventname}.js`);

        fs.writeFileSync(filePath, script.SCRIPT);
      });

      vscode.window.showInformationMessage(`Script for ${appname} have been saved.`);
    }
  } catch (err) {
    vscode.window.showErrorMessage(`Error fetching script: ${err}`);
  } finally {
    await sql.close();
  }
}

async function getAllScript() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace is open.");
    return;
  }

  const config = await loadConfig();
  if (!config) return;

  const events = await loadEvent();
  if (!events) return;

  const type = "sec";
  const companyno = config.sec.companyno;
  const cpmuser = config.sec.cpmuser;
  const scriptfolder = config.folders.script;

  try {
    await connectToDatabase(config, type);

    let result = await sql.query`SELECT DISTINCT APPNAME, TABLENAME, EVENT, SCRIPT FROM SECSCR WHERE COMPANYNO = ${companyno} AND USERNAME = ${cpmuser}`;
    const resultset = result.recordset;

    const appnames = [];
    resultset.forEach((row) => {
      appnames.push(row.APPNAME);
    });

    for (const appname of appnames) {
      result = await sql.query`SELECT APPNAME, TABLENAME, EVENT, SCRIPT FROM SECSCR WHERE COMPANYNO = ${companyno} AND USERNAME = ${cpmuser} AND APPNAME = ${appname}`;

      if (result.recordset.length === 0) {
        vscode.window.showErrorMessage(`No script found for APPNAME: ${appname}`);
        continue;
      }

      const scripts = result.recordset;

      scripts.forEach((script) => {
        const tablename = script.TABLENAME;
        const event = script.EVENT;
        const eventname = events[event];
        const basePath = path.join(
          workspaceFolders[0].uri.fsPath,
          scriptfolder,
          appname,
          tablename
        );

        if (!fs.existsSync(basePath)) {
          fs.mkdirSync(basePath, { recursive: true });
        }

        const filePath = path.join(basePath, `${eventname}.js`);

        fs.writeFileSync(filePath, script.SCRIPT);
      });
    }
    vscode.window.showInformationMessage(`All script have been saved.`);
  } catch (err) {
    vscode.window.showErrorMessage(`Error fetching script: ${err}`);
  } finally {
    await sql.close();
  }
}

async function getScriptByAppName(appname) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace is open.");
    return;
  }

  if (!appname) return;

  const config = await loadConfig();
  if (!config) return;

  const events = await loadEvent();
  if (!events) return;

  const type = "sec";
  const companyno = config.sec.companyno;
  const cpmuser = config.sec.cpmuser;
  const folder = config.folders.script;

  try {
    await connectToDatabase(config, type);

    let result = await sql.query`SELECT APPNAME, TABLENAME, EVENT, SCRIPT FROM SECSCR WHERE COMPANYNO = ${companyno} AND USERNAME = ${cpmuser} AND APPNAME = ${appname}`;
    const scripts = result.recordset;

    if (scripts.length === 0) {
      vscode.window.showErrorMessage(`No script found for APPNAME: ${appname}`);
      return;
    }

    appname = scripts[0].APPNAME; //appname i tablo daki yazılmış haliyle degistiriyorum.

    scripts.forEach((script) => {
      const tablename = script.TABLENAME;
      const event = script.EVENT;
      const eventname = events[event];
      const basePath = path.join(
        workspaceFolders[0].uri.fsPath,
        folder,
        appname,
        tablename
      );

      if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, { recursive: true });
      }

      const filePath = path.join(basePath, `${eventname}.js`);

      fs.writeFileSync(filePath, script.SCRIPT);
    });

    vscode.window.showInformationMessage(`Script for ${appname} have been saved.`);
  } catch (err) {
    vscode.window.showErrorMessage(`Error fetching script: ${err}`);
  } finally {
    await sql.close();
  }
}

async function getLibrary() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace is open.");
    return;
  }

  const config = await loadConfig();
  if (!config) return;

  const type = "sec";
  const folder = config.folders.library;

  try {
    await connectToDatabase(config, type);

    let result = await sql.query`SELECT DISTINCT USERNAME FROM dbo.ACTSCR`;
    const resultset = result.recordset;

    const usernames = []
    resultset.forEach((row) => {
      usernames.push(row.USERNAME);
    });

    if (usernames.length === 0) {
      vscode.window.showErrorMessage("No USERNAMEs in UNITNAMES");
      return;
    }

    for (const username of usernames) {
      let result = await sql.query`SELECT USERNAME, UNITNAME, SCRIPT FROM dbo.ACTSCR WHERE USERNAME = ${username}`;

      if (result.recordset.length === 0) {
        if (username) {
          vscode.window.showErrorMessage(`No user found for LIBRARY: ${username}`);
        }
        continue;
      }

      const basePath = path.join(workspaceFolders[0].uri.fsPath, folder, username);
      if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, { recursive: true });
      }

      const script = result.recordset;
      script.forEach((row) => {
        if (row.UNITNAME) {
          const filePath = path.join(basePath, `${row.UNITNAME}.js`);
          fs.writeFileSync(filePath, row.SCRIPT);
        }
      });

      vscode.window.showInformationMessage(`Library for ${username} have been saved.`);
    }
  } catch (err) {
    vscode.window.showErrorMessage(`Error fetching library: ${err}`);
  } finally {
    await sql.close();
  }
}

async function getSearchScript(tablename) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace is open.");
    return;
  }

  const config = await loadConfig();
  if (!config) return;

  const type = "app";
  const folder = config.folders.searchScript;

  try {
    await connectToDatabase(config, type);

    let result;
    if (tablename) {
      result = await sql.query`SELECT ALANAD, ARAMASCRIPT FROM FLDDEF WHERE TABLOAD = ${tablename} AND ARAMASCRIPT <> ''`;
    }

    if (result.recordset.length === 0) {
      if (tablename) {
        vscode.window.showErrorMessage(`No search script found for TABLENAME: ${tablename}`);
      }
      return;
    }

    const basePath = path.join(
      workspaceFolders[0].uri.fsPath,
      folder,
      tablename
    );

    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }

    const searchscripts = result.recordset;
    searchscripts.forEach((script) => {
      const filePath = path.join(basePath, `${script.ALANAD}.js`);
      fs.writeFileSync(filePath, script.ARAMASCRIPT);
    });

    vscode.window.showInformationMessage(`Search Script for ${tablename} have been saved.`);
  } catch (err) {
    vscode.window.showErrorMessage(`Error fetching search script: ${err}`);
  } finally {
    await sql.close();
  }
}

async function setMacros(document) {
  const config = await loadConfig();
  if (!config) {
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('No workspace is open.');
    return;
  }

  const type = "app";
  const cpmuser = config.app.cpmuser;
  const filePath = document.fileName;
  const rootPath = path.dirname(filePath);
  const appname = path.basename(rootPath) === 'Global' ? '' : path.basename(rootPath);
  const macroname = path.basename(filePath, '.js');
  const macro = document.getText();
  let createbutton = 0;
  let caption = "";

  try {
    await connectToDatabase(config, type);

    const queryResult = await sql.query`SELECT COUNT(*) AS count FROM MACROS WHERE APPNAME = ${appname} AND MACRONAME = ${macroname} AND USERNAME = ${cpmuser}`;
    const macroExists = queryResult.recordset[0].count > 0;

    if (macroExists) {
      await sql.query`UPDATE MACROS SET MACRO = ${macro} WHERE APPNAME = ${appname} AND MACRONAME = ${macroname} AND USERNAME = ${cpmuser}`;
      vscode.window.showInformationMessage(`Macro ${macroname} for ${appname || 'Global'} has been updated.`);
    } else {
      if (macroname.startsWith("btn")) {
        createbutton = 1;
        caption = macroname;
      }

      await sql.query`INSERT INTO MACROS (APPNAME, USERNAME, MACRONAME, CREATEBUTTON, CAPTION, CATEGORYNAME, SHORTCUT, TIMERENABLED, TIMERINTERVAL, STARTUP, MACRO, DESCRIPTION)
          VALUES (${appname}, ${cpmuser}, ${macroname}, ${createbutton}, ${caption}, '', '', 0, 0, 0, ${macro}, '')`;

      vscode.window.showInformationMessage(`Macro ${macroname} for ${appname || 'Global'} has been inserted.`);
    }
  } catch (err) {
    vscode.window.showErrorMessage(`Error setting macro: ${err}`);
  } finally {
    await sql.close();
  }
}

async function setLibrary(document) {
  const config = await loadConfig();
  if (!config) {
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('No workspace is open.');
    return;
  }

  const type = "sec";
  const filePath = document.fileName;
  const rootPath = path.dirname(filePath);
  const username = path.basename(rootPath);
  const unitname = path.basename(filePath, '.js');
  const script = document.getText();

  try {
    await connectToDatabase(config, type);

    const queryResult = await sql.query`SELECT COUNT(*) AS count FROM ACTSCR WHERE USERNAME = ${username} AND UNITNAME = ${unitname}`;
    const scriptExists = queryResult.recordset[0].count > 0;

    if (scriptExists) {
      await sql.query`UPDATE ACTSCR SET SCRIPT = ${script} WHERE USERNAME = ${username} AND UNITNAME = ${unitname}`;
      vscode.window.showInformationMessage(`Script ${unitname} for ${username} has been updated.`);
    } else {
      await sql.query`INSERT ACTSCR (USERNAME, UNITNAME, CHANGEDATE, SCRIPT) VALUES (${username}, ${unitname}, GETDATE(), ${script})`;
      vscode.window.showInformationMessage(`Macro ${unitname} for ${username} has been inserted.`);
    }
  } catch (err) {
    vscode.window.showErrorMessage(`Error updating library: ${err}`);
  } finally {
    await sql.close();
  }
}

async function setScript(document) {
  const config = await loadConfig();
  if (!config) {
    return;
  }

  const events = await loadEvent();
  if (!events)
    return;

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('No workspace is open.');
    return;
  }

  const type = "sec";
  const companyno = config.sec.companyno;
  const username = config.sec.cpmuser;
  const filePath = document.fileName;
  const tableNamePath = path.dirname(filePath);
  const parentPath = path.dirname(tableNamePath);
  const tablename = path.basename(tableNamePath);
  const appname = path.basename(parentPath);
  const eventname = path.basename(filePath, '.js');

  //'eventname:value' mi 'events:object' içinde arar ve eslesenin 'key:key' ini dondürür.
  const eventno = Object.keys(events).find(key => events[key] === eventname);
  const script = document.getText();

  try {
    if (!eventno) {
      vscode.window.showErrorMessage(`Error inserting script: ${eventname} not found!`);
      return;
    }

    await connectToDatabase(config, type);

    const queryResult = await sql.query`SELECT COUNT(*) AS count FROM SECSCR 
      WHERE COMPANYNO = ${companyno} AND USERNAME = ${username} AND APPNAME = ${appname} AND TABLENAME = ${tablename} AND EVENT = ${eventno}`;

    const macroExists = queryResult.recordset[0].count > 0;

    if (macroExists) {
      await sql.query`UPDATE SECSCR SET SCRIPT = ${script} WHERE COMPANYNO = ${companyno} AND USERNAME = ${username} AND APPNAME = ${appname} AND TABLENAME = ${tablename} AND EVENT = ${eventno}`;
      vscode.window.showInformationMessage(`Script ${tablename}/${eventname} for ${appname} has been updated.`);
    } else {
      await sql.query`
          INSERT SECSCR (COMPANYNO, USERNAME, APPNAME, TABLENAME, EVENT, SCRIPT) 
          VALUES (${companyno}, ${username}, ${appname}, ${tablename}, ${eventno}, ${script})
      `;
      vscode.window.showInformationMessage(`Script ${tablename}/${eventname} for ${appname} has been inserted.`);
    }
  } catch (err) {
    vscode.window.showErrorMessage(`Error updating script: ${err}`);
  } finally {
    await sql.close();
  }
}

async function setSearchScript(document) {
  const config = await loadConfig();
  if (!config) {
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('No workspace is open.');
    return;
  }

  const type = "app";
  const filePath = document.fileName;
  const rootPath = path.dirname(filePath);
  const tablename = path.basename(rootPath);
  const fieldname = path.basename(filePath, '.js');
  const searchscript = document.getText();

  try {
    await connectToDatabase(config, type);

    const queryResult = await sql.query`SELECT COUNT(*) AS count FROM FLDDEF WHERE TABLOAD = ${tablename} AND ALANAD = ${fieldname}`;
    const scriptExists = queryResult.recordset[0].count > 0;

    if (scriptExists) {
      await sql.query`UPDATE FLDDEF SET ARAMASCRIPT = ${searchscript} WHERE TABLOAD = ${tablename} AND ALANAD = ${fieldname}`;
      vscode.window.showInformationMessage(`Search Script ${fieldname} for ${tablename} has been updated.`);
    }
  } catch (err) {
    vscode.window.showErrorMessage(`Error updating search script: ${err}`);
  } finally {
    await sql.close();
  }
}

async function evrakTip(arg) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace is open.");
    return;
  }

  if (!arg) return;

  const config = await loadConfig();
  if (!config) return;

  const type = "app";
  const filename = 'evraktip.md';

  try {
    await connectToDatabase(config, type);

    let query = '';
    let aciklama = arg;
    let kod = parseInt(arg, 10);
    let result;

    if (isNaN(kod)) {
      query = `SELECT KOD, ACIKLAMA FROM REFKRT WHERE TABLOAD = 'EVRBAS' AND ALANAD = 'EVRAKTIP' AND ACIKLAMA LIKE '%${aciklama}%'`;
    } else {
      query = `SELECT KOD, ACIKLAMA FROM REFKRT WHERE TABLOAD = 'EVRBAS' AND ALANAD = 'EVRAKTIP' AND KOD = ${kod}`;
    }
    result = await sql.query(query);

    const data = result.recordset;

    printMarkdown(data, filename);
  } catch (err) {
    vscode.window.showErrorMessage(`EvrakTip: ${arg} Not found!: ${err}`);
  } finally {
    await sql.close();
  }
}

async function companies() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace is open.");
    return;
  }

  const config = await loadConfig();
  if (!config) {
    return;
  }

  const type = "sec";
  const filename = 'companies.md';

  try {
    await connectToDatabase(config, type);

    let query = "SELECT COMPANYNO, COMPANYNAME, SERVERNAME, DATABASENAME FROM dbo.SECCMP";
    let result = await sql.query(query);
    const data = result.recordset;

    printMarkdown(data, filename);
  } catch (err) {
    vscode.window.showErrorMessage(`Companies: ${err}`);
  } finally {
    await sql.close();
  }
}

async function printMarkdown(data, filename) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace is open.");
    return;
  }

  const config = await loadConfig();
  if (!config) return;

  if (data.length === 0) return;

  try {
    const output = config.folders.output;

    // Kolon adlarını al
    const columnNames = Object.keys(data[0]);

    // Kolon genişliklerini belirle
    const columnWidths = columnNames.map(col => {
      const maxWidth = data.reduce((max, row) => {
        return Math.max(max, row[col] ? row[col].toString().length : 0);
      }, col.length);
      return maxWidth;
    });

    // Markdown tablo başlığı oluştur
    const header = columnNames.map((col, i) => col.padEnd(columnWidths[i])).join(' | ');
    const separator = columnNames.map((col, i) => '-'.repeat(columnWidths[i])).join(' | ');

    // Markdown tablo satırları oluştur
    const dataRows = data.map(row => {
      return columnNames.map((col, i) => {
        const cell = row[col] ? row[col].toString() : '';
        return cell.padEnd(columnWidths[i]);
      }).join(' | ');
    });

    const basePath = path.join(workspaceFolders[0].uri.fsPath, output);
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }
    const filePath = path.join(basePath, filename);

    fs.writeFileSync(filePath, `| ${header} |\n| ${separator} |\n`);

    dataRows.forEach((row) => {
      fs.appendFileSync(filePath, `| ${row} |\n`);
    });

    vscode.window.showInformationMessage(`Output: ${output}/${filename}`);
  } catch (err) {
    vscode.window.showErrorMessage(`Not found!: ${err}`);
  } finally {
    await sql.close();
  }
}

function formatDateTurkish(date) {
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false, // 24 saat formatı için
    timeZone: 'Europe/Istanbul' // Türkiye saati için
  };

  return date.toLocaleDateString('tr-TR', options);
}

function greet() {
  const now = new Date();
  const formattedDate = formatDateTurkish(now);
  vscode.window.showInformationMessage("Bugün : " + formattedDate);

  vscode.window.showInformationMessage("Selam Emre!");
}

async function activate(context) {
  const config = await loadConfig();
  if (!config)
    return;

  //app
  const macros = config.folders.macros;
  const searchScript = config.folders.searchScript;

  //sec
  const script = config.folders.script;
  const library = config.folders.library;

  //Auto Save
  vscode.workspace.onDidSaveTextDocument((document) => {
    if (document.languageId === "javascript") {
      let mainFolderName = path.basename(path.dirname(path.dirname(document.fileName)));

      if (mainFolderName == macros) { // Macros ise
        setMacros(document);
      } else if (mainFolderName == library) { // Library ise
        setLibrary(document);
      } else if (mainFolderName == searchScript) { // Search Script ise
        setSearchScript(document);
      } else { // değilse Script mi?
        mainFolderName = path.basename(path.dirname(path.dirname(path.dirname(document.fileName))))
        if (mainFolderName == script) { // Script ise
          setScript(document);
        }
      }
    }
  });

  //Selam
  let selamCommand = vscode.commands.registerCommand(
    "extension.greet",
    greet
  );
  context.subscriptions.push(selamCommand);

  //Get All Macros
  let getAllMacrosCommand = vscode.commands.registerCommand(
    "extension.getAllMacros",
    getAllMacros
  );
  context.subscriptions.push(getAllMacrosCommand);

  //Get Macros
  let getMacrosCommand = vscode.commands.registerCommand(
    "extension.getMacros",
    getMacros
  );
  context.subscriptions.push(getMacrosCommand);

  //Get Script
  let getScriptCommand = vscode.commands.registerCommand(
    "extension.getScript",
    getScript
  );
  context.subscriptions.push(getScriptCommand);

  //Get All Script
  let getAllScriptCommand = vscode.commands.registerCommand(
    "extension.getAllScript",
    getAllScript
  );
  context.subscriptions.push(getAllScriptCommand);

  //Get Library
  let getLibraryCommand = vscode.commands.registerCommand(
    "extension.getLibrary",
    getLibrary
  );
  context.subscriptions.push(getLibraryCommand);

  //Companies
  let companiesCommand = vscode.commands.registerCommand(
    "extension.companies",
    companies
  );
  context.subscriptions.push(companiesCommand);

  //Get Macros By Appname
  let getMacrosCommandByAppName = vscode.commands.registerCommand(
    "extension.getMacrosByAppName",
    async () => {
      const appName = await vscode.window.showInputBox({
        prompt: "Enter APPNAME"
      });
      if (appName !== undefined) {
        getMacrosByAppName(appName);
      }
    }
  );
  context.subscriptions.push(getMacrosCommandByAppName);

  //Get Script By Appname
  let getScriptCommandByAppName = vscode.commands.registerCommand(
    "extension.getScriptByAppName",
    async () => {
      const appName = await vscode.window.showInputBox({
        prompt: "Enter APPNAME"
      });
      if (appName !== undefined) {
        getScriptByAppName(appName);
      }
    }
  );
  context.subscriptions.push(getScriptCommandByAppName);

  //Evrak Tip
  let evrakTipCommand = vscode.commands.registerCommand(
    "extension.evrakTip",
    async () => {
      const evraktip = await vscode.window.showInputBox({
        prompt: "Evrak Tip (number/text) : "
      });
      if (evraktip !== undefined) {
        evrakTip(evraktip);
      }
    }
  );
  context.subscriptions.push(evrakTipCommand);

  //Get Search Script
  let getSearchScriptCommand = vscode.commands.registerCommand(
    "extension.getSearchScript",
    async () => {
      const tabloname = await vscode.window.showInputBox({
        prompt: "Tablo Ad : "
      });

      if (tabloname !== undefined) {
        getSearchScript(tabloname.toUpperCase());
      }
    }
  );
  context.subscriptions.push(getSearchScriptCommand);
}

function deactivate() { }

module.exports = {
  activate,
  deactivate,
};
