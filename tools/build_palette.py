#!/usr/bin/env python3
"""从 tools/pal.py 生成 assets/palette.css。页面只用低饱和（muted）一套：浅色、深色跟随系统。
用法：python3 tools/build_palette.py"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from pal import PAL, GRAY_L, GRAY_D, ACTIVE

SANS = '"Schibsted Grotesk","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif'


def block(sel, d, extra=''):
    return sel + '{' + ';'.join('--%s:%s' % (k, v) for k, v in d.items()) + extra + '}'


def main():
    p = PAL[ACTIVE]
    light = dict(GRAY_L, f=SANS, fh='var(--f)')
    light.update(p['L']['base'])
    light.update({'l%d' % (i + 1): c for i, c in enumerate(p['L']['l'])})
    dark = dict(GRAY_D)
    dark.update(p['D']['base'])
    dark.update({'l%d' % (i + 1): c for i, c in enumerate(p['D']['l'])})
    css = ['/* 由 tools/build_palette.py 从 tools/pal.py 生成，不要手改。配色：%s（%s）。 */' % (p['zh'], p['en'])]
    css.append(block(':root', light, ';color-scheme:light'))
    css.append('@media (prefers-color-scheme:dark){' + block(':root:not([data-theme=light])', dark, ';color-scheme:dark') + '}')
    css.append(block(':root[data-theme=dark]', dark, ';color-scheme:dark'))
    out = os.path.join(HERE, '..', 'assets', 'palette.css')
    text = '\n'.join(css) + '\n'
    assert text.strip()
    tmp = out + '.new'
    open(tmp, 'w', encoding='utf-8').write(text)
    os.replace(tmp, out)
    print(os.path.normpath(out), len(text))


if __name__ == '__main__':
    main()
