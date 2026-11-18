import { ROOT } from './lib.mjs';
import { createAppServer, prepareServerWorkspace } from './server.mjs';
prepareServerWorkspace(ROOT);
const server=createAppServer(ROOT);
const port=Number(process.env.PORT || 4317);
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${port} is in use. Choose another PORT.`:error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{const p=server.address().port;console.log(`Next Role is ready: http://127.0.0.1:${p}\nDemo: http://127.0.0.1:${p}/demo/dashboard.html\nPress Ctrl+C to stop.`);});
