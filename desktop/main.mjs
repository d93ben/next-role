import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, session, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, atomic, dashboardState, inside, readJSON, renderDashboard } from '../scripts/lib.mjs';
import { runCareer } from '../scripts/cli.mjs';
import { saveDashboardAction } from '../scripts/dashboard-actions.mjs';
import { dashboardOrigin, dashboardScope, portableParent, prepareWorkspace, resourcePath, scopeRoot } from './workspace.mjs';

protocol.registerSchemesAsPrivileged([{scheme:'nextrole', privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
const args = process.argv.slice(app.isPackaged ? 1 : 2);
const portableDir = app.isPackaged ? portableParent(process.platform, process.execPath, process.env.PORTABLE_EXECUTABLE_DIR) : ROOT;
const preferencesFile = path.join(app.getPath('userData'),'workspace-location.json');
let root;
let mainWindow;
const option = (argv, name) => {
  const index = argv.indexOf(name);
  if (index < 0) return null;
  if (!argv[index+1] || argv[index+1].startsWith('--')) throw new Error('Missing path after ' + name);
  return path.resolve(argv[index+1]);
};

function defaultRoot() {
  const portable = path.join(portableDir, 'workspace');
  if (fs.existsSync(path.join(portable,'workspace.json'))) return portable;
  if (fs.existsSync(preferencesFile)) {
    const saved = readJSON(preferencesFile).workspace;
    if (typeof saved === 'string' && fs.existsSync(path.join(saved,'workspace.json'))) return saved;
  }
  return portable;
}

async function chooseFolder() {
  const result = await dialog.showOpenDialog({
    title:'Choose a folder for your Next Role workspace',
    buttonLabel:'Use this folder',
    defaultPath:app.getPath('documents'),
    properties:['openDirectory','createDirectory']
  });
  if (result.canceled) return null;
  const folder = result.filePaths[0];
  return fs.existsSync(path.join(folder,'workspace.json')) || path.basename(folder)==='workspace'
    ? folder : path.join(folder,'workspace');
}

async function openRoot(chosen, remember) {
  // A short simultaneous CLI write should finish without interrupting startup.
  for (let attempt=0;;attempt++) {
    try { prepareWorkspace(chosen); break; }
    catch (error) {
      if (!error.message.includes('update is in progress') || attempt >= 15) throw error;
      await new Promise(resolve => setTimeout(resolve,200));
    }
  }
  if (remember) atomic(preferencesFile,JSON.stringify({workspace:chosen}));
  root = chosen;
}

async function cli() {
  const argv = args.slice(args.indexOf('--cli')+1);
  const output = option(argv,'--output');
  if (output) argv.splice(argv.indexOf('--output'),2);
  const selected = option(argv,'--workspace') || defaultRoot();
  if (argv[0] === 'init') prepareWorkspace(selected);
  const result = runCareer(argv,selected) + '\n';
  if (output) fs.writeFileSync(output,result);
  else process.stdout.write(result);
}

const contentTypes = {'.pdf':'application/pdf','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.html':'text/html; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.json':'application/json'};
function version(scope) { return readJSON(inside(scopeRoot(root,scope),'dashboard-version.json')); }
function documentResponse(request) {
  try {
    const scope = dashboardScope(request.url);
    if (scope) {
      const state = dashboardState(scopeRoot(root,scope), version(scope).built_at);
      return new Response(renderDashboard(state), {headers:{
        'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store',
        'Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'self'; form-action 'none'; base-uri 'none'"
      }});
    }
    const file = resourcePath(root,request.url);
    if (file && fs.statSync(file).isFile()) {
      return new Response(fs.readFileSync(file), {headers:{
        'Content-Type':contentTypes[path.extname(file).toLowerCase()] || 'text/plain; charset=utf-8',
        'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',
        'Content-Security-Policy':"sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:"
      }});
    }
  } catch (error) {
    console.error('Next Role could not open a workspace resource:',error.message);
  }
  return new Response('Workspace resource unavailable.',{status:404});
}

function senderScope(event) {
  const frame = event.senderFrame;
  const scope = frame && dashboardScope(frame.url);
  if (!mainWindow || event.sender !== mainWindow.webContents || frame !== event.sender.mainFrame || !scope)
    throw new Error('Only the dashboard can change workspace records.');
  return scope;
}

async function openDashboard() {
  const explicit = option(args,'--workspace');
  let chosen = explicit || defaultRoot();
  let remember = false;
  if (!explicit && process.platform === 'darwin' && !fs.existsSync(path.join(chosen,'workspace.json'))) {
    chosen = await chooseFolder();
    remember = true;
  }
  if (!chosen) { app.quit(); return; }
  try { await openRoot(chosen,remember); }
  catch (error) {
    if (explicit || !['EACCES','EPERM','EROFS'].includes(error.code)) throw error;
    chosen = await chooseFolder();
    if (!chosen) { app.quit(); return; }
    await openRoot(chosen,true);
  }
  const local = session.fromPartition('next-role-dashboard');
  local.protocol.handle('nextrole', documentResponse);
  local.setPermissionRequestHandler((_contents,_permission,callback) => callback(false));
  local.setPermissionCheckHandler(() => false);
  local.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','file://*/*']},(_details,done) => done({cancel:true}));
  const prefs = {session:local,sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true};
  mainWindow = new BrowserWindow({width:1280,height:850,minWidth:640,minHeight:420,title:'Next Role',
    webPreferences:{...prefs,preload:path.join(ROOT,'desktop','preload.cjs')}});
  mainWindow.webContents.on('will-navigate',(event,url) => { if (!dashboardScope(url)) event.preventDefault(); });
  mainWindow.webContents.setWindowOpenHandler(({url}) => {
    const target = new URL(url);
    if (['https:','http:'].includes(target.protocol) && !target.username && !target.password) {
      shell.openExternal(target.href).catch(console.error);
    } else if (resourcePath(root,url)) {
      const viewer = new BrowserWindow({parent:mainWindow,width:900,height:750,webPreferences:prefs});
      viewer.webContents.setWindowOpenHandler(() => ({action:'deny'}));
      viewer.webContents.on('will-navigate',event => event.preventDefault());
      viewer.loadURL(url).catch(console.error);
    }
    return {action:'deny'};
  });
  ipcMain.handle('dashboard:refresh',(event,previous) => {
    const scope = senderScope(event);
    const folder = scopeRoot(root,scope);
    if (fs.existsSync(path.join(folder,'.write.lock'))) return null;
    const current = version(scope).built_at;
    return current === previous ? null : dashboardState(folder,current);
  });
  ipcMain.handle('dashboard:save',(event,payload) => {
    const folder = scopeRoot(root,senderScope(event));
    if (readJSON(inside(folder,'workspace.json')).workspace_id !== payload.workspace_id)
      throw new Error('The workspace changed. Open the current dashboard before saving.');
    return saveDashboardAction(folder,payload);
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform==='darwin' ? [{role:'appMenu'}] : []),
    {label:'File',submenu:[
      {label:'Show workspace folder',click:() => shell.openPath(root)},
      {label:'Open another workspace…',click:async () => {
        const folder = await chooseFolder();
        if (!folder) return;
        try { await openRoot(folder,true); await mainWindow.loadURL(dashboardOrigin+'/workspace/dashboard.html'); }
        catch (error) { dialog.showErrorBox('Could not open workspace', error.message); }
      }}, {type:'separator'}, {role:'quit'}
    ]}, {role:'editMenu'}, {role:'viewMenu'}
  ]));
  await mainWindow.loadURL(dashboardOrigin+'/workspace/dashboard.html');
}

app.on('window-all-closed',() => app.quit());
try {
  if (args.includes('--cli')) {
    await cli();
    app.exit(0);
  } else {
    await app.whenReady();
    await openDashboard();
  }
} catch (error) {
  if (args.includes('--cli')) console.error('Next Role: '+error.message);
  else dialog.showErrorBox('Could not open Next Role',error.message);
  app.exit(1);
}

