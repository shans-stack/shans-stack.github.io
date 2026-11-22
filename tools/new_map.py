#!/usr/bin/env python3
"""生成专题图页面 maps/<id>/index.html。页面本身只带地图 id，内容全部来自 data/。
用法：python3 tools/new_map.py vast VAST     （第二个参数是页面标题里的名字）
已存在的页面会被覆盖：它不含手写内容，模板改了以后重跑即可。"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    mid, title = sys.argv[1], sys.argv[2]
    tpl = open(os.path.join(HERE, 'map.tpl.html'), encoding='utf-8').read()
    html = tpl.replace('{{ID}}', mid).replace('{{TITLE}}', title)
    assert '{{' not in html and html.strip()
    d = os.path.join(ROOT, 'maps', mid)
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, 'index.html')
    open(p + '.new', 'w', encoding='utf-8').write(html)
    os.replace(p + '.new', p)
    print(p)


if __name__ == '__main__':
    main()
