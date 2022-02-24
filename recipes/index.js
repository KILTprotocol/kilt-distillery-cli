import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

var walk = function(dir, project) {
  var results = [];
  var list = fs.readdirSync(dir);
  list.forEach(function(file) {
      file = dir + '/' + file;
      var stat = fs.statSync(file);
      if (stat && stat.isDirectory()) { 
        results = results.concat(walk(file, project));
      } else { 
        const code = fs.readFileSync(file)
        results.push({
          path: file.split(project + '/').pop(),
          code: code
        });
      }
  });
  return results;
}

export default {
  'nextjs-did-login': walk(__dirname + '/nextjs-did-login', '/nextjs-did-login')
}