// 从知识点页 HTML 里取出 window.SS_TOPIC_CFG 对象（括号配对，跳过字符串），输出 JSON。
// 用法：node tools/cfg_extract.js topics/<id>/index.html
const fs=require('fs');
function extract(html){
  const m=/window\.SS_TOPIC_CFG\s*=\s*/.exec(html);if(!m)throw new Error('no SS_TOPIC_CFG');
  let j=m.index+m[0].length;while(html[j]!=='{')j++;const s=j;let d=0,q=null;
  for(;j<html.length;j++){const c=html[j];
    if(q){if(c==='\\'){j++;continue}if(c===q)q=null;continue}
    if(c==='"'||c==="'"||c==='`'){q=c;continue}
    if(c==='{')d++;else if(c==='}'){d--;if(d===0){j++;break}}}
  return {start:s,end:j,obj:Function('return ('+html.slice(s,j)+')')()};
}
module.exports={extract};
if(require.main===module){const r=extract(fs.readFileSync(process.argv[2],'utf8'));process.stdout.write(JSON.stringify(r.obj))}
