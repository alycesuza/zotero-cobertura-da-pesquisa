"use strict";
var Core = (() => {
  const norm = value => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const doi = value => String(value || "").trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "").toLowerCase();
  function validDOI(value) {return /^10\.\d{4,9}\/\S+$/i.test(doi(value));}
  function isbn(value) {
    const s = String(value || "").replace(/[^0-9X]/gi, "").toUpperCase();
    if (s.length === 13) return [...s].reduce((sum, n, i) => sum + Number(n) * (i % 2 ? 3 : 1), 0) % 10 === 0;
    if (s.length === 10 && /^\d{9}[\dX]$/.test(s)) return [...s].reduce((sum, n, i) => sum + (n === "X" ? 10 : Number(n)) * (10 - i), 0) % 11 === 0;
    return false;
  }
  function storedCodes(item) {
    return [...new Set((item.attachments || []).filter(a => !a.deleted && ["imported_file", "imported_url", "embedded_image"].includes(a.linkMode)).map(a => a.key))].sort().join(", ");
  }
  function context(text, index) {return text.slice(Math.max(0, index - 100), Math.min(text.length, index + 220)).replace(/\s+/g, " ").trim();}
  function csv(rows) {
    if (!rows.length) return "";
    const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
    const escape = value => {
      let s = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");
      if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    return "\uFEFF" + [headers, ...rows.map(row => headers.map(key => row[key]))].map(row => row.map(escape).join(";")).join("\r\n");
  }
  function tags(item, prefix) {return (item.tags || []).filter(t => norm(t).startsWith(norm(prefix))).map(t => t.slice(t.indexOf(":") + 1).trim()).filter(Boolean);}
  const issue = (item, severity, field, message) => ({key:item.key, title:item.title, severity, field, message});
    function validateExpected(value) {
    if(!Array.isArray(value)||value.length>5000)throw new Error("Use uma lista JSON de até 5.000 pares país/categoria.");
    return value.map(row=>{if(typeof row.country!=="string"||!row.country.trim()||typeof row.category!=="string"||!row.category.trim())throw new Error("Cada linha precisa de country e category preenchidos.");return {country:row.country.trim(),category:row.category.trim()};});
  }
  function coverage(items,expected=[]) {
    expected=validateExpected(expected);const groups=new Map();
    const key=(a,b)=>norm(a)+"\u0000"+norm(b);
    function ensure(country,category) {const k=key(country,category);if(!groups.has(k))groups.set(k,{country,category,items:[]});return groups.get(k);}
    for(const row of expected)ensure(row.country,row.category);
    const unclassified=[];
    for(const item of items) {
      const countries=[...tags(item,"País:"),...tags(item,"Country:")],categories=[...tags(item,"Categoria:"),...tags(item,"Category:")];
      if(!countries.length||!categories.length){unclassified.push({country:"Não classificado",category:"Não classificado",status:"Faltam etiquetas de país/categoria",keys:item.key,title:item.title});continue;}
      for(const country of new Set(countries))for(const category of new Set(categories))ensure(country,category).items.push(item);
    }
    return [...groups.values()].map(group=>{
      const keys=[...new Set(group.items.map(x=>x.key))].sort();
      const stored=group.items.some(x=>(x.attachments||[]).some(a=>!a.deleted&&["imported_file","imported_url","linked_file"].includes(a.linkMode)));
      const flags=group.items.flatMap(x=>(x.tags||[]).filter(t=>/^Confer[eê]ncia.*:/i.test(t)||/^Status:/i.test(t)));
      let status=!keys.length?"Sem registro na seleção analisada":!stored?"Registro sem arquivo associado":"Arquivo associado; conferência pendente";
      if(stored&&flags.length)status="Classificação registrada: "+[...new Set(flags)].join(" | ");
      return {country:group.country,category:group.category,status,keys:keys.join(", "),records:keys.length};
    }).concat(unclassified);
  }
  const PluginCore={coverage,validateExpected};

  return {norm, doi, validDOI, isbn, storedCodes, csv, tags, ...PluginCore};
})();
if (typeof module !== "undefined") module.exports = Core;
