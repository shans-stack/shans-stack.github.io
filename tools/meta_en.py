#!/usr/bin/env python3
"""把每个页面 <head> 里给爬虫和链接预览看的文字写成英文。

网站默认英文，但语言切换在浏览器里由 JS 完成；Slack、WhatsApp、微信、iMessage
生成链接预览时只读静态 HTML，所以 <title>、description 和分享标签必须本身就是英文。

改的内容（可重复运行，结果不变）：
  <html lang="en">、<title>、<meta name="description">、
  <!-- share:start --> 到 <!-- share:end --> 之间的 og: / twitter: 标签。
文字来源：知识点页取 data/stations.js 的 t[1]（英文标题）与 d[1]（英文一句话）；
专题图取 data/maps.js 的 en 与 d.en；首页、术语表、演示页用下面写死的英文。

用法：python3 tools/meta_en.py          改写全部页面
      python3 tools/meta_en.py --check  只检查，有页面不符合就 exit 1
"""
import html, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SITE = 'https://shans-stack.github.io/'
NAME = "Shan's Stack"

JS = r"""
global.window = global; global.SS = {};
require(process.argv[1] + '/data/stations.js');
require(process.argv[1] + '/data/maps.js');
const S = (window.SS || SS).stations, M = (window.SS || SS).maps;
const out = {stations: {}, maps: []};
for (const [id, s] of Object.entries(S)) if (s.page) out.stations[id] = {page: s.page, t: s.t, d: s.d, steps: s.steps, en: s.en};
for (const m of M) out.maps.push({id: m.id, href: m.href, en: m.en, d: m.d});
process.stdout.write(JSON.stringify(out));
"""

FIXED = {
    'index.html': ("Shan's Stack · AI Infrastructure, One Station at a Time",
                   'AI infrastructure explained one station at a time: a metro map of six general lines, '
                   'plus maps for VAST, DDN, WEKA, NVIDIA, AI token factories and performance benchmarks. '
                   'Each station is a short step-by-step explainer you can present full screen.'),
    'glossary/index.html': ("Glossary · Shan's Stack",
                            'Plain-language definitions of the AI infrastructure terms used across Shan\'s Stack.'),
    'present.html': ("Presentation · Shan's Stack",
                     'Present a Shan\'s Stack explainer full screen, one step at a time.'),
}


def load():
    r = subprocess.run(['node', '-e', JS, ROOT], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def pages():
    data = load()
    out = []
    for rel, (t, d) in FIXED.items():
        out.append((rel, t, d))
    for m in data['maps']:
        if m['id'] == 'home':
            continue
        t = '%s Map · %s' % (m['en'], NAME)
        out.append((m['href'], t, m['d']['en']))
    for sid, s in sorted(data['stations'].items()):
        title = (s.get('t') or [None, None])[1] or s.get('en') or sid
        d = (s.get('d') or [None, None])[1] or ''
        if s.get('steps'):
            d = d.rstrip() + ' Explained in %d steps.' % s['steps']
        out.append((s['page'], '%s · %s' % (title, NAME), d))
    return out


def rewrite(src, rel, title, desc):
    a = lambda x: html.escape(x, quote=False).replace('"', '&quot;')
    url = SITE + (rel[:-len('index.html')] if rel.endswith('index.html') else rel)
    share = ('<!-- share:start -->\n'
             '<meta property="og:type" content="website">\n'
             '<meta property="og:site_name" content="%s">\n'
             '<meta property="og:title" content="%s">\n'
             '<meta property="og:description" content="%s">\n'
             '<meta property="og:url" content="%s">\n'
             '<meta property="og:locale" content="en_US">\n'
             '<meta name="twitter:card" content="summary">\n'
             '<meta name="twitter:title" content="%s">\n'
             '<meta name="twitter:description" content="%s">\n'
             '<!-- share:end -->') % (a(NAME), a(title), a(desc), a(url), a(title), a(desc))
    t = re.sub(r'<html lang="[^"]*">', '<html lang="en">', src, count=1)
    t, n1 = re.subn(r'<title>.*?</title>', lambda m: '<title>%s</title>' % html.escape(title, quote=False), t, count=1, flags=re.S)
    assert n1 == 1, rel + ' 没有 <title>'
    t = re.sub(r'\n?<!-- share:start -->.*?<!-- share:end -->', '', t, flags=re.S)
    dm = '<meta name="description" content="%s">' % a(desc)
    if re.search(r'<meta name="description" content="[^"]*">', t):
        t = re.sub(r'<meta name="description" content="[^"]*">', lambda m: dm, t, count=1)
    else:
        t = t.replace('</title>', '</title>\n' + dm, 1)
    t = t.replace(dm, dm + '\n' + share, 1)
    return t


def main():
    check = '--check' in sys.argv[1:]
    bad, changed = [], 0
    for rel, title, desc in pages():
        p = os.path.join(ROOT, rel)
        if not os.path.exists(p):
            bad.append(rel + '（文件不存在）')
            continue
        src = open(p, encoding='utf-8').read()
        new = rewrite(src, rel, title, desc)
        if re.search(r'[一-鿿]', title + desc):
            bad.append(rel + '（英文文字里有中文）')
        if new == src:
            continue
        if check:
            bad.append(rel + '（head 不是最新英文）')
            continue
        assert new.strip()
        open(p + '.new', 'w', encoding='utf-8').write(new)
        os.replace(p + '.new', p)
        changed += 1
    print('改写 %d 页' % changed if not check else '检查完毕')
    if bad:
        print('\n'.join(bad))
        sys.exit(1)


if __name__ == '__main__':
    main()
