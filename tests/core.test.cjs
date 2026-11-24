const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const core=require('../src/core.js');
const item=(overrides={})=>({key:'SYNTH001',title:'Synthetic example',date:'2020',type:'book',creators:[{lastName:'Example'}],tags:[],attachments:[],...overrides});
test('CSV export protects spreadsheet formulas and preserves quotes',()=>{
 const csv=core.csv([{title:'=HYPERLINK("x")',evidence:'Line; "quoted"'}]);
 assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes('""quoted""'));
});
test('package contains no database, account credentials or real document fixture',()=>{
 const manifest=require('../src/manifest.json');const pkg=require('../package.json');
 assert.equal(manifest.version,pkg.version);assert.equal(manifest.applications.zotero.id,pkg.zotero.id);
 assert.equal(manifest.applications.zotero.strict_min_version,'10.0');
 for(const file of fs.readdirSync('src'))assert.ok(!/\.(sqlite|pdf|docx|env)$/i.test(file));
 for(const file of fs.readdirSync('src').filter(x=>x.endsWith('.js')))new vm.Script(fs.readFileSync('src/'+file,'utf8'),{filename:file});
});
test('normalizes accented countries and does not equate missing records with missing legislation',()=>{
 const rows=core.coverage([item({tags:['País: México','Categoria: C1'],attachments:[{linkMode:'imported_file'}]})],[{country:'Mexico',category:'C1'},{country:'Brasil',category:'C2'}]);
 assert.equal(rows.length,2);assert.equal(rows[0].records,1);
 assert.equal(rows[1].status,'Sem registro na seleção analisada');
});
test('flags unclassified items and rejects malformed expected matrices',()=>{
 assert.equal(core.coverage([item()])[0].country,'Não classificado');
 assert.throws(()=>core.coverage([],[{country:'Brasil'}]));
 assert.throws(()=>core.validateExpected({}));
});
