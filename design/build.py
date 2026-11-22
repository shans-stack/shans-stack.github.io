#!/usr/bin/env python3
"""一份源文件生成三套配色：out4/a2-{macaron,muted,oldmoney}/{home,topic}.html。
三套之间只有 <html data-palette> 的默认值不同；页面底部的切换只改这个属性。"""
import os, sys, re
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from pal import PAL, GRAY_L, GRAY_D
R = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(R, 'out4')
DIRS = {'macaron': 'a2-macaron', 'muted': 'a2-muted', 'oldmoney': 'a2-oldmoney'}

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700'
         '&family=Schibsted+Grotesk:wght@400;500;600;700'
         '&family=Newsreader:opsz,wght@6..72,500;6..72,600'
         '&family=Noto+Serif+SC:wght@500;600&display=swap" rel="stylesheet">')

SANS = '"Schibsted Grotesk","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif'
SERIF = '"Newsreader","Noto Serif SC","Songti SC","STSong",Georgia,serif'


def block(sel, d):
    return sel + '{' + ';'.join('--%s:%s' % (k, v) for k, v in d.items()) + '}'


def palcss():
    out = []
    out.append(block(':root', dict(GRAY_L, f=SANS, fh='var(--f)')) .replace('}', ';color-scheme:light}'))
    for k, p in PAL.items():
        d = dict(p['L']['base'])
        d.update({'l%d' % (i + 1): c for i, c in enumerate(p['L']['l'])})
        if k == 'oldmoney':
            d['fh'] = SERIF
        out.append(block(':root[data-palette=%s]' % k, d))
    dark = []
    for pre in (':root:not([data-theme=light])', ':root[data-theme=dark]'):
        rows = [block(pre, GRAY_D).replace('}', ';color-scheme:dark}')]
        for k, p in PAL.items():
            d = dict(p['D']['base'])
            d.update({'l%d' % (i + 1): c for i, c in enumerate(p['D']['l'])})
            rows.append(block(pre + '[data-palette=%s]' % k, d))
        dark.append(rows)
    css = '/* 灰阶来自 A 版；五条线 --l1（AI 应用，最上）到 --l5（存储，最下）。由 build.py 从 pal.py 生成 */\n'
    css += '\n'.join(out) + '\n'
    css += '@media (prefers-color-scheme:dark){\n' + '\n'.join(dark[0]) + '\n}\n'
    css += '\n'.join(dark[1]) + '\n'
    return css


PALJS = '''<script>/* 配色：目录给默认值，?palette= 可覆盖；切换只改 data-palette，并把选择带到站内链接上 */
(function(){
  var root=document.documentElement,DEF=root.getAttribute('data-palette'),OK=/^(macaron|muted|oldmoney)$/;
  var q=new URLSearchParams(location.search),p=q.get('palette');
  if(p&&OK.test(p))root.setAttribute('data-palette',p);
  function sync(){var c=root.getAttribute('data-palette');document.querySelectorAll('[data-pal]').forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-pal')===c?'true':'false')})}
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-pal]');
    if(b){var v=b.getAttribute('data-pal');root.setAttribute('data-palette',v);sync();
      try{var u=new URL(location.href);if(v===DEF)u.searchParams.delete('palette');else u.searchParams.set('palette',v);history.replaceState(null,'',u)}catch(x){}
      return}
    var a=e.target.closest&&e.target.closest('a[href]');
    if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    var h=a.getAttribute('href'),c=root.getAttribute('data-palette');
    if(c===DEF||!/^(home|topic)\\.html/.test(h))return;
    try{var t=new URL(h,location.href);t.searchParams.set('palette',c);e.preventDefault();location.href=t.href}catch(x){}
  });
  document.addEventListener('DOMContentLoaded',sync);
})();
</script>'''

PALSWCSS = '''.pal{display:flex;align-items:center;gap:2px;flex-wrap:wrap}
.pal>span{margin-right:6px}
.pal button{display:inline-flex;align-items:center;gap:7px;min-height:36px;padding:0 10px;border:1px solid transparent;border-radius:2px;background:none;color:var(--ink3);font:400 13px var(--f);cursor:pointer}
.pal button:hover{color:var(--ink)}
.pal button[aria-pressed=true]{color:var(--ink);border-color:var(--rule2)}
.pal .sw{display:inline-flex;gap:1px}
.pal .sw i{width:4px;height:12px;display:block}'''


def palsw():
    btns = []
    for k, p in PAL.items():
        sw = ''.join('<i style="background:%s"></i>' % c for c in p['L']['l'])
        btns.append('<button type="button" data-pal="%s" aria-pressed="false"><span class="sw" aria-hidden="true">%s</span><span data-en="%s">%s</span></button>' % (k, sw, p['en'], p['zh']))
    return ('<div class="pal" role="group" aria-label="配色" data-en-label="Colour scheme"><span data-en="Colours">配色</span>'
            + ''.join(btns) + '</div>')


SYMS = '''<svg width="0" height="0" style="position:absolute" aria-hidden="true">
 <symbol id="i-ai" viewBox="0 0 48 48"><circle cx="9" cy="15" r="5"/><circle cx="9" cy="33" r="5"/><circle cx="24" cy="8" r="5"/><circle cx="24" cy="24" r="5"/><circle cx="24" cy="40" r="5"/><circle cx="39" cy="15" r="5"/><circle cx="39" cy="33" r="5"/><path d="M13 13.5l7-3.5 1.4 2.8-7 3.5zM13 31.5l7 3.5 1.4-2.8-7-3.5zM35 13.5l-7-3.5-1.4 2.8 7 3.5zM35 31.5l-7 3.5-1.4-2.8 7-3.5zM14 22.5h6v3h-6zM28 22.5h6v3h-6z"/></symbol>
 <symbol id="i-dat" viewBox="0 0 48 48"><path d="M5 6h38v9H5zM5 19h11v9H5zM18.5 19h11v9h-11zM32 19h11v9H32zM5 32h11v9H5zM18.5 32h11v9h-11zM32 32h11v9H32z"/></symbol>
 <symbol id="i-cmp" viewBox="0 0 48 48"><path fill-rule="evenodd" d="M12 12h24v24H12zM19 19v10h10V19z"/><path d="M15 5h3v7h-3zM22.5 5h3v7h-3zM30 5h3v7h-3zM15 36h3v7h-3zM22.5 36h3v7h-3zM30 36h3v7h-3zM5 15h7v3H5zM5 22.5h7v3H5zM5 30h7v3H5zM36 15h7v3h-7zM36 22.5h7v3h-7zM36 30h7v3h-7z"/></symbol>
 <symbol id="i-net" viewBox="0 0 48 48"><path d="M3 17h14v14H3zM31 17h14v14H31zM17 22h14v4H17zM22 5h4v12h-4z"/><path d="M17 5h14v4H17z"/></symbol>
 <symbol id="i-sto" viewBox="0 0 48 48"><path fill-rule="evenodd" d="M5 8h38v9H5zM34 11h5v3h-5zM5 20h38v9H5zM34 23h5v3h-5zM5 32h38v9H5zM34 35h5v3h-5z"/></symbol>
 <symbol id="i-mark" viewBox="0 0 22 22"><rect x="0" y="0" width="10" height="10"/><rect x="12" y="0" width="10" height="10"/><rect x="0" y="12" width="10" height="10"/><rect style="fill:var(--ink3)" x="12" y="12" width="10" height="10"/></symbol>
</svg>'''

LANGJS = '''<script>(function(){
  var q=new URLSearchParams(location.search);
  if(q.get('theme')==='dark'||q.get('theme')==='light')document.documentElement.setAttribute('data-theme',q.get('theme'));
  function get(){if(q.get('lang')==='en'||q.get('lang')==='zh')return q.get('lang');try{return localStorage.getItem('ss-lang')||'zh'}catch(e){return 'zh'}}
  function put(v){try{localStorage.setItem('ss-lang',v)}catch(e){}}
  function apply(lang){
    document.documentElement.lang = lang==='en'?'en':'zh-CN';
    document.querySelectorAll('[data-en]').forEach(function(el){
      if(el.dataset.zh===undefined) el.dataset.zh=el.innerHTML;
      el.innerHTML = lang==='en'?el.dataset.en:el.dataset.zh;
    });
    document.querySelectorAll('[data-en-label]').forEach(function(el){
      if(el.dataset.zhLabel===undefined) el.dataset.zhLabel=el.getAttribute('aria-label')||'';
      el.setAttribute('aria-label', lang==='en'?el.dataset.enLabel:el.dataset.zhLabel);
    });
    var b=document.querySelector('[data-lang-toggle]');
    if(b){b.textContent = lang==='en'?'中文':'EN'; b.setAttribute('aria-label', lang==='en'?'切换到中文':'Switch to English');}
    window.SS_LANG=lang; document.dispatchEvent(new CustomEvent('ss-lang',{detail:lang}));
  }
  window.ssToggleLang=function(){var n=(window.SS_LANG==='en')?'zh':'en';put(n);apply(n)};
  document.addEventListener('DOMContentLoaded',function(){
    var b=document.querySelector('[data-lang-toggle]'); if(b) b.addEventListener('click',window.ssToggleLang);
    apply(get());
  });
})();
</script>'''


def main():
    parts = dict(FONTS=FONTS, PALJS=PALJS, PALCSS=palcss(), PALSWCSS=PALSWCSS, PALSW=palsw(), SYMS=SYMS, LANGJS=LANGJS)
    for page in ('home', 'topic'):
        src = open(os.path.join(HERE, page + '.src.html'), encoding='utf-8').read()
        for k, v in parts.items():
            src = src.replace('{{%s}}' % k, v)
        for key, d in DIRS.items():
            html = src.replace('{{PAL}}', key)
            left = re.findall(r'\{\{[A-Z]+\}\}', html)
            assert not left, left
            os.makedirs(os.path.join(OUT, d, 'shots'), exist_ok=True)
            p = os.path.join(OUT, d, page + '.html')
            tmp = p + '.new'
            assert html.strip()
            open(tmp, 'w', encoding='utf-8').write(html)
            os.replace(tmp, p)
            print(p, len(html))


if __name__ == '__main__':
    main()
