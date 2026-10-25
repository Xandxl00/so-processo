// Gera a versão pra publicar em publicar/:
//   index.html → site de apresentação (com as imagens dentro do próprio arquivo)
//   app.html   → o app (com CSS e JS dentro do próprio arquivo)
// e o zip com os dois. Rodar com: npm run site
// Arquivo único não tem como "esquecer uma pasta" no upload.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const raiz = path.join(__dirname, '..');
const destino = path.join(raiz, 'publicar');
const ler = (arquivo) => fs.readFileSync(path.join(raiz, arquivo), 'utf8');

function trocarUma(texto, de, para) {
  if (!texto.includes(de)) throw new Error(`Não achei "${de}" pra trocar`);
  return texto.split(de).join(para);
}

// App: CSS e JS entram no HTML, e o link "Sobre o projeto" aponta pro site.
let app = ler('index.html');
app = trocarUma(app, '<link rel="stylesheet" href="css/style.css">', `<style>\n${ler('css/style.css')}</style>`);
for (const js of ['js/tarefas.js', 'js/app.js']) {
  const codigo = ler(js);
  if (codigo.includes('</script')) throw new Error(`${js} tem </script> no meio`);
  app = trocarUma(app, `<script src="${js}"></script>`, `<script>\n${codigo}</script>`);
}
app = trocarUma(app, 'href="site/index.html"', 'href="index.html"');

// Site: imagens viram data URI e os botões "Abrir o app" apontam pro app.html.
let site = ler('site/index.html');
site = trocarUma(site, 'href="../index.html"', 'href="app.html"');
site = site.replace(/src="img\/([\w-]+\.jpg)"/g, (_, nome) => {
  const imagem = fs.readFileSync(path.join(raiz, 'site', 'img', nome)).toString('base64');
  return `src="data:image/jpeg;base64,${imagem}"`;
});

for (const [nome, html] of [['app.html', app], ['index.html', site]]) {
  if (/(href|src)="(css|js|img)\//.test(html)) throw new Error(`${nome} ainda aponta pra arquivo externo`);
}

fs.mkdirSync(destino, { recursive: true });
fs.writeFileSync(path.join(destino, 'app.html'), app);
fs.writeFileSync(path.join(destino, 'index.html'), site);

const zip = path.join(destino, 'so-processo-site.zip');
fs.rmSync(zip, { force: true });
execFileSync('tar', ['-a', '-c', '-f', zip, 'index.html', 'app.html'], { cwd: destino });

for (const nome of ['index.html', 'app.html', 'so-processo-site.zip']) {
  const tamanho = Math.round(fs.statSync(path.join(destino, nome)).size / 1024);
  console.log(`publicar/${nome}  ${tamanho} KB`);
}
