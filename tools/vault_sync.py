#!/usr/bin/env python3
"""知识库 ⇄ 网站文字同步。

知识库是源头：每个技术点的「对外讲解」写在知识库对应页面里，用
<!-- public:start <站 id> --> 和 <!-- public:end <站 id> --> 框住。本脚本只读框内文字。
对应关系（站 id → 知识库页面）和禁写词清单都只放在知识库里，不进这个公开仓库。

用法：
  python3 tools/vault_sync.py export <站 id>      # 把网站现有文字转成知识库里的对外讲解块，打印出来
  python3 tools/vault_sync.py check               # 只检查：哪些站的库内文字和网页不同、有没有禁写内容、步数对不对
  python3 tools/vault_sync.py build               # 检查通过后，把库内文字写回网页；任何一项不过就不写、退出码非 0
  python3 tools/vault_sync.py roundtrip           # 自测：每站 网页 → 块 → 网页 应该完全一致

知识库路径取环境变量 SS_VAULT，没有就读 ~/.config/shans-stack/vault。
"""
import html, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def _vault():
    v = os.environ.get('SS_VAULT')
    if not v:
        cfg = os.path.expanduser('~/.config/shans-stack/vault')
        if os.path.exists(cfg):
            v = open(cfg, encoding='utf-8').read().strip()
    if not v:
        sys.exit('找不到知识库：设环境变量 SS_VAULT，或在 ~/.config/shans-stack/vault 写入知识库路径。')
    return os.path.expanduser(v)


VAULT = _vault()
# 站与知识库页面的对应、禁写词清单都只放在知识库里，不进这个公开仓库。
PRIVATE = os.path.join(VAULT, 'Skills', 'shans-stack')
MAP = os.path.join(PRIVATE, 'vault-map.json')


def load_forbid():
    f = os.path.join(PRIVATE, 'forbidden.txt')
    if not os.path.exists(f):
        sys.exit('缺少禁写词清单 ' + f + '，不做检查就不能生成。')
    return [l.rstrip('\n') for l in open(f, encoding='utf-8') if l.strip() and not l.startswith('#')]


FORBID = load_forbid()


def node_cfg(path):
    out = subprocess.run(['node', os.path.join(ROOT, 'tools', 'cfg_extract.js'), path], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def cfg_span(text):
    m = re.search(r'window\.SS_TOPIC_CFG\s*=\s*', text)
    j = m.end()
    while text[j] != '{':
        j += 1
    s, d, q = j, 0, None
    while j < len(text):
        c = text[j]
        if q:
            if c == '\\':
                j += 2
                continue
            if c == q:
                q = None
        elif c in '"\'`':
            q = c
        elif c == '{':
            d += 1
        elif c == '}':
            d -= 1
            if d == 0:
                return s, j + 1
        j += 1
    raise ValueError('unbalanced SS_TOPIC_CFG')


# ---------- HTML ⇄ Markdown（正文只用 p / b / code / ul / li / a） ----------
def inline_h2m(s):
    s = re.sub(r'<a href="([^"]*)"[^>]*>(.*?)</a>', lambda m: '[' + m.group(2) + '](' + html.unescape(m.group(1)) + ')', s)
    s = re.sub(r'<b>(.*?)</b>', r'**\1**', s)
    s = re.sub(r'<code>(.*?)</code>', lambda m: '`' + html.unescape(m.group(1)) + '`', s)
    return html.unescape(s)


def inline_m2h(s):
    out, i = [], 0
    for m in re.finditer(r'`([^`]*)`|\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)', s):
        out.append(html.escape(s[i:m.start()], quote=False))
        if m.group(1) is not None:
            out.append('<code>' + html.escape(m.group(1), quote=False) + '</code>')
        elif m.group(2) is not None:
            out.append('<b>' + inline_m2h(m.group(2)) + '</b>')
        else:
            out.append('<a href="' + html.escape(m.group(4)) + '">' + inline_m2h(m.group(3)) + '</a>')
        i = m.end()
    out.append(html.escape(s[i:], quote=False))
    return ''.join(out)


def para_h2m(p):
    p = p.strip()
    blocks = re.findall(r'<ul>.*?</ul>|<p>.*?</p>', p, re.S)
    if len(blocks) > 1 and ''.join(blocks) == p:
        return '\n\n'.join(para_h2m(x) for x in blocks)
    m = re.fullmatch(r'<ul>(.*)</ul>', p, re.S)
    if m:
        items = re.findall(r'<li>(.*?)</li>', m.group(1), re.S)
        return '\n'.join('- ' + inline_h2m(x).strip() for x in items)
    m = re.fullmatch(r'<p>(.*)</p>', p, re.S)
    body = m.group(1) if m else p
    if '<p>' in body or '<ul>' in body:
        raise ValueError('nested block: ' + p[:80])
    return inline_h2m(body).strip()


def para_m2h(block):
    lines = block.strip().split('\n')
    if all(l.startswith('- ') for l in lines):
        return '<ul>' + ''.join('<li>' + inline_m2h(l[2:]) + '</li>' for l in lines) + '</ul>'
    return '<p>' + inline_m2h(' '.join(l.strip() for l in lines)) + '</p>'


# ---------- 网页 ⇄ 对外讲解块 ----------
def page_parts(sid):
    path = os.path.join(ROOT, 'topics', sid, 'index.html')
    text = open(path, encoding='utf-8').read()
    cfg = node_cfg(path)
    h1 = re.search(r'<h1 data-en="([^"]*)">([^<]*)</h1>', text)
    src = re.search(r'<div class="src">.*?<ul>(.*?)</ul></div>', text, re.S)
    sources = [(inline_h2m(z), inline_h2m(html.unescape(e))) for e, z in re.findall(r'<li data-en="([^"]*)">(.*?)</li>', src.group(1), re.S)] if src else []
    return text, cfg, (html.unescape(h1.group(2)), html.unescape(h1.group(1))), sources


def to_block(sid):
    _, cfg, title, sources = page_parts(sid)
    url = 'https://shans-stack.github.io/topics/%s/' % sid
    out = ['<!-- public:start %s -->' % sid,
           '> [!info] 本块同步到公开网站 [Shan\'s Stack](%s)。只写有公开出处的事实，不写客户名、人名、价格、内部内容；改动规则见 [[Skills/shans-stack/SKILL|shans-stack]]「对外讲解」。' % url,
           '', '**页面标题**：' + title[0], '**Page title**: ' + title[1], '']
    for i, s in enumerate(cfg['steps'], 1):
        out += ['### 第 %d 步' % i, '**标题**：' + s['t'][0], '**Title**: ' + s['t'][1]]
        if s.get('s'):
            out += ['**短名**：' + s['s'][0], '**Short**: ' + s['s'][1]]
        out += ['**一句话**：' + s['d'][0], '**One line**: ' + s['d'][1], '']
        for p in s['b'][0]:
            out += [para_h2m(p), '']
        out += ['<!-- en -->', '']
        for p in s['b'][1]:
            out += [para_h2m(p), '']
    out += ['### 出处']
    for z, e in sources:
        out += ['- ' + z, '  - ' + e]
    out += ['<!-- public:end %s -->' % sid]
    return '\n'.join(out) + '\n'


def parse_block(block):
    title = (re.search(r'^\*\*页面标题\*\*：(.*)$', block, re.M).group(1).strip(), re.search(r'^\*\*Page title\*\*: (.*)$', block, re.M).group(1).strip())
    parts = re.split(r'^### ', block, flags=re.M)
    steps, sources = [], []
    for part in parts[1:]:
        head, _, body = part.partition('\n')
        if head.startswith('出处'):
            for m in re.finditer(r'^- (.*)\n  - (.*)$', body, re.M):
                sources.append((m.group(1).strip(), m.group(2).strip()))
            continue
        def field(k):
            m = re.search(r'^\*\*' + re.escape(k) + r'\*\*[：:] ?(.*)$', body, re.M)
            return m.group(1).strip() if m else None
        st = {'t': [field('标题'), field('Title')], 'd': [field('一句话'), field('One line')]}
        if field('短名') is not None:
            st['s'] = [field('短名'), field('Short')]
        rest = re.sub(r'^\*\*[^*]+\*\*[：:].*\n?', '', body, flags=re.M)
        zh, _, en = rest.partition('<!-- en -->')
        def paras(t):
            return [para_m2h(b) for b in re.split(r'\n\s*\n', t.strip()) if b.strip()]
        st['b'] = [paras(zh), paras(en)]
        if None in st['t'] + st['d']:
            raise ValueError('step missing field: ' + head)
        steps.append(st)
    return title, steps, sources


def read_vault_block(page, sid):
    text = open(os.path.join(VAULT, page), encoding='utf-8').read()
    m = re.search(r'<!-- public:start %s -->\n(.*?)<!-- public:end %s -->' % (re.escape(sid), re.escape(sid)), text, re.S)
    if not m:
        raise ValueError('no public block for %s in %s' % (sid, page))
    return m.group(1)


def anim_steps(sid):
    p = os.path.join(ROOT, 'assets', 'anim', sid + '.js')
    m = re.search(r"steps\s*:\s*(\d+)\s*,\s*mount", open(p, encoding='utf-8').read())
    return int(m.group(1)) if m else None


def render(sid, title, steps, sources):
    """把库内文字写进网页文本，返回新文本。"""
    text, cfg, _, _ = page_parts(sid)
    s, e = cfg_span(text)
    newcfg = {'anim': cfg['anim'], 'ar': cfg['ar'], 'steps': steps}
    cfgtext = json.dumps(newcfg, ensure_ascii=False, indent=1)
    ar = text[s:e]
    arm = re.search(r'ar\s*:\s*(\[[^\]]*\])', ar)
    if arm:  # 保留原来写成算式的宽高比（如 960/476）
        cfgtext = re.sub(r'"ar": \[[^\]]*\]', '"ar": ' + arm.group(1), cfgtext, count=1)
    text = text[:s] + cfgtext + text[e:]
    text = re.sub(r'<h1 data-en="[^"]*">[^<]*</h1>', lambda m: '<h1 data-en="%s">%s</h1>' % (html.escape(title[1]), html.escape(title[0], quote=False)), text, count=1)
    lis = ''.join('\n      <li data-en="%s">%s</li>' % (html.escape(inline_m2h(en)), inline_m2h(zh)) for zh, en in sources)
    text = re.sub(r'(<div class="src">.*?<ul>).*?(\n?\s*</ul></div>)', lambda m: m.group(1) + lis + '\n    </ul></div>', text, count=1, flags=re.S)
    return text


def public_text(title, steps, sources):
    bits = list(title)
    for st in steps:
        bits += st['t'] + st['d'] + st['b'][0] + st['b'][1]
    for z, e in sources:
        bits += [z, e]
    return '\n'.join(bits)


def check_one(sid, page):
    block = read_vault_block(page, sid)
    title, steps, sources = parse_block(block)
    problems = []
    n = anim_steps(sid)
    if n is not None and n != len(steps):
        problems.append('步数不符：库内 %d 步，动画 %d 步' % (len(steps), n))
    body = public_text(title, steps, sources)
    for pat in FORBID:
        for m in re.finditer(pat, re.sub(r'<[^>]+>', ' ', body)):
            problems.append('禁写命中：%r 附近「%s」' % (pat, body[max(0, m.start() - 20):m.end() + 20].replace('\n', ' ')))
    new = render(sid, title, steps, sources)
    old = open(os.path.join(ROOT, 'topics', sid, 'index.html'), encoding='utf-8').read()
    return new, new != old, problems


# ---------- 技术名词表：知识库一页 ⇄ data/terms.js ----------
GLOSSARY = 'Wiki/Concepts/Work/Tech-Glossary.md'
TERMS = os.path.join(ROOT, 'data', 'terms.js')


def load_terms():
    out = subprocess.run(['node', '-e', 'const c={window:{}};c.SS=c.window.SS={};require("vm").runInNewContext(require("fs").readFileSync(process.argv[1],"utf8"),c);process.stdout.write(JSON.stringify(c.SS.terms))', TERMS], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def glossary_md(terms):
    groups = {}
    for k, v in terms.items():
        g = (v['en'][:1] or '#').upper()
        groups.setdefault(g if g.isalpha() else '#', []).append((k, v))
    out = ['<!-- public:start glossary -->',
           "> [!info] 本页整页同步到公开网站的术语表 https://shans-stack.github.io/glossary/ 。只写有公开出处的定义，不写客户名、人名、价格、内部内容；改动规则见 [[Skills/shans-stack/SKILL|shans-stack]]「对外讲解」。",
           '']
    for g in sorted(groups):
        out += ['## ' + g, '']
        for k, v in sorted(groups[g], key=lambda kv: kv[1]['en'].lower()):
            out += ['### ' + v['en'] + ('｜' + v['zh'] if v['zh'] != v['en'] else ''),
                    '- id: ' + k, '- 中文：' + v['zh'], '- English: ' + v['en']]
            if v.get('alias'):
                out += ['- 别名：' + ' / '.join(v['alias'])]
            out += ['- 定义：' + v['d'][0], '- Definition: ' + v['d'][1]]
            if v.get('see'):
                out += ['- 详见：' + v['see']]
            out += ['- 标签：' + v.get('tag', 'generic'), '']
    out += ['<!-- public:end glossary -->']
    return '\n'.join(out) + '\n'


def parse_glossary(text):
    m = re.search(r'<!-- public:start glossary -->\n(.*?)<!-- public:end glossary -->', text, re.S)
    if not m:
        raise ValueError('no glossary block')
    terms = {}
    for part in re.split(r'^### ', m.group(1), flags=re.M)[1:]:
        f = dict(re.findall(r'^- ([^：:]+)[：:] ?(.*)$', part, re.M))
        k = f['id'].strip()
        t = {'zh': f['中文'].strip(), 'en': f['English'].strip()}
        if f.get('别名'):
            t['alias'] = [x.strip() for x in f['别名'].split(' / ') if x.strip()]
        t['d'] = [f['定义'].strip(), f['Definition'].strip()]
        if f.get('详见'):
            t['see'] = f['详见'].strip()
        t['tag'] = f.get('标签', 'generic').strip()
        terms[k] = t
    return terms


def terms_js(terms):
    lines = ['window.SS = window.SS || {};', '/* 由知识库 ' + GLOSSARY + ' 生成（tools/vault_sync.py），不要手改。 */', 'SS.terms = {']
    items = list(terms.items())
    for i, (k, v) in enumerate(items):
        lines.append('  ' + json.dumps(k, ensure_ascii=False) + ': ' + json.dumps(v, ensure_ascii=False) + (',' if i < len(items) - 1 else ''))
    lines.append('};')
    return '\n'.join(lines) + '\n'


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    if cmd == 'export':
        sys.stdout.write(to_block(sys.argv[2]))
        return 0
    if cmd == 'glossary-export':
        sys.stdout.write(glossary_md(load_terms()))
        return 0
    if cmd == 'roundtrip':
        bad = 0
        for sid in sorted(os.listdir(os.path.join(ROOT, 'topics'))):
            if not os.path.exists(os.path.join(ROOT, 'topics', sid, 'index.html')):
                continue
            b = to_block(sid)
            inner = b.split('\n', 1)[1].rsplit('<!-- public:end', 1)[0]
            title, steps, sources = parse_block(inner)
            _, cfg, t0, s0 = page_parts(sid)
            def norm(sts):
                return [dict(st, b=[html.unescape(''.join(st['b'][0])), html.unescape(''.join(st['b'][1]))]) for st in sts]
            if norm(steps) != norm(cfg['steps']) or tuple(title) != t0 or [tuple(x) for x in sources] != [tuple(x) for x in s0]:
                bad += 1
                for i, (a, c) in enumerate(zip(norm(steps), norm(cfg['steps']))):
                    if a != c:
                        x, y = json.dumps(a, ensure_ascii=False, sort_keys=True), json.dumps(c, ensure_ascii=False, sort_keys=True)
                        k = next((j for j in range(min(len(x), len(y))) if x[j] != y[j]), min(len(x), len(y)))
                        print('DIFF', sid, 'step', i + 1, '| got:', x[max(0, k - 40):k + 60], '| want:', y[max(0, k - 40):k + 60])
                        break
                else:
                    print('DIFF', sid, 'title/sources')
        print('roundtrip mismatches:', bad)
        return 1 if bad else 0
    mapping = json.load(open(MAP, encoding='utf-8'))
    changed, failed = [], []
    for row in mapping:
        try:
            new, diff, problems = check_one(row['id'], row['page'])
        except Exception as e:
            failed.append((row['id'], [str(e)]))
            continue
        if problems:
            failed.append((row['id'], problems))
        elif diff:
            changed.append((row['id'], new))
    gl_new = None
    try:
        gpath = os.path.join(VAULT, GLOSSARY)
        if os.path.exists(gpath):
            gterms = parse_glossary(open(gpath, encoding='utf-8').read())
            gp = []
            gbody = '\n'.join(v['zh'] + ' ' + v['en'] + ' ' + ' '.join(v.get('alias', [])) + ' ' + ' '.join(v['d']) for v in gterms.values())
            for pat in FORBID:
                for m in re.finditer(pat, gbody):
                    gp.append('禁写命中：%r 附近「%s」' % (pat, gbody[max(0, m.start() - 20):m.end() + 20].replace('\n', ' ')))
            if gp:
                failed.append(('glossary', gp))
            else:
                js = terms_js(gterms)
                if js != open(TERMS, encoding='utf-8').read():
                    gl_new = js
    except Exception as e:
        failed.append(('glossary', [str(e)]))
    for sid, ps in failed:
        print('FAIL', sid)
        for p in ps:
            print('  -', p)
    print('changed:', ' '.join(s for s, _ in changed) or '无', '| glossary changed' if gl_new else '')
    if cmd == 'build':
        if failed:
            print('有站没通过检查，什么都没写。')
            return 2
        for sid, new in changed:
            p = os.path.join(ROOT, 'topics', sid, 'index.html')
            open(p + '.new', 'w', encoding='utf-8').write(new)
            os.replace(p + '.new', p)
        if gl_new:
            open(TERMS + '.new', 'w', encoding='utf-8').write(gl_new)
            os.replace(TERMS + '.new', TERMS)
        print('已写回 %d 站%s' % (len(changed), '，术语表已更新' if gl_new else ''))
    return 2 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
