const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const { Command } = require('commander');
const superagent = require('superagent');

const program = new Command();

program
  .requiredOption('-h, --host <host>', 'Адреса сервера')
  .requiredOption('-p, --port <port>', 'Порт сервера')
  .requiredOption('-c, --cache <cacheDir>', 'Шлях до директорії кешу')
  .parse(process.argv);

const { host, port, cache: cacheDir } = program.opts();

const server = http.createServer(async (req, res) => {
  const method = req.method;
  const urlPath = req.url.slice(1); 

  if (!urlPath) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('Bad Request: No HTTP code provided');
  }

  const filePath = path.join(cacheDir, `${urlPath}.jpg`);

  try {
    if (method === 'GET') {
      try {
        const data = await fs.readFile(filePath);
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        return res.end(data);
      } catch (err) {
        try {
          const response = await superagent.get(`https://http.cat/${urlPath}`);
          await fs.writeFile(filePath, response.body);
          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          return res.end(response.body);
        } catch (fetchErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          return res.end('Not Found');
        }
      }
    } else if (method === 'PUT') {
      let body = [];
      req.on('data', chunk => body.push(chunk));
      req.on('end', async () => {
        body = Buffer.concat(body);
        await fs.writeFile(filePath, body);
        res.writeHead(201, { 'Content-Type': 'text/plain' });
        res.end('Created');
      });
    } else if (method === 'DELETE') {
      try {
        await fs.unlink(filePath);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Deleted');
      } catch (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    } else {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

server.listen(port, host, () => {
  console.log(`Сервер запущено на http://${host}:${port}`);
});
