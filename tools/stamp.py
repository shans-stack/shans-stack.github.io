#!/usr/bin/env python3
"""给网页里引用的本站脚本和样式加版本号（?v=文件内容哈希前 8 位），防浏览器用旧缓存。

GitHub Pages 让浏览器把 js/css 缓存 10 分钟。网页先更新、脚本还是旧的，两边对不上，
地图就画不出来。文件内容一变，版本号跟着变，浏览器只能去拿新的。

用法：python3 tools/stamp.py        # 改完任何 js/css 或 data/*.js 后、提交前跑一次
vault_sync.py build 写完会自动跑。重复跑没有副作用。
"""
import hashlib, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = re.compile(r'''((?:src|href)=["'])([^"'?#]+\.(?:js|css))(\?v=[0-9a-f]+)?(["'])''')
_cache = {}


def digest(path):
    if path not in _cache:
        _cache[path] = hashlib.sha256(open(path, 'rb').read()).hexdigest()[:8]
    return _cache[path]


def stamp_file(path):
    text = open(path, encoding='utf-8').read()
    base = os.path.dirname(path)

    def rep(m):
        url = m.group(2)
        if re.match(r'^(?:[a-z]+:)?//', url):
            return m.group(0)
        target = os.path.normpath(os.path.join(base, url))
        if not target.startswith(ROOT) or not os.path.isfile(target):
            return m.group(0)
        return m.group(1) + url + '?v=' + digest(target) + m.group(4)

    new = REF.sub(rep, text)
    if new != text:
        assert new.strip()
        open(path + '.new', 'w', encoding='utf-8').write(new)
        os.replace(path + '.new', path)
        return True
    return False


def main():
    changed = 0
    for dp, dn, fn in os.walk(ROOT):
        dn[:] = [d for d in dn if not d.startswith('.') and d not in ('node_modules', 'design')]
        for f in fn:
            if f.endswith('.html'):
                changed += stamp_file(os.path.join(dp, f))
    print('stamp: %d 个网页更新了版本号' % changed)
    return 0


if __name__ == '__main__':
    sys.exit(main())
