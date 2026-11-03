const fs=require('node:fs'),path=require('node:path');
const base=__dirname,standalone=path.join(base,'src/index.html');
let html=fs.readFileSync(standalone,'utf8');
for(const [file,pattern] of [
 ['game-core.js',/(<script data-inlined-from="game-core.js">)[\s\S]*?(<\/script>)/],
 ['game.jsx',/(<script type="text\/babel" data-inlined-from="game.jsx">)[\s\S]*?(<\/script>)/],
 ['prototype.css',/(<style data-inlined-from="prototype.css">)[\s\S]*?(<\/style>)/]
]){
 if(!pattern.test(html))throw Error('Missing inline marker: '+file);
 html=html.replace(pattern,(_,start,end)=>start+'\n'+fs.readFileSync(path.join(base,'src',file),'utf8').trim()+'\n'+end);
}
fs.writeFileSync(standalone,html);
fs.writeFileSync(path.join(base,'site/public/game.html'),html);
console.log('Standalone and hosted HTML synchronized.');
