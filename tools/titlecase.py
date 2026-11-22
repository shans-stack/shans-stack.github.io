"""英文标题 Title Case（用户偏好：标题每个实词首字母大写）。
规则：首词、末词、冒号后的词一律大写；a/an/the、并列连词、短介词小写；
原本含大写或数字的词（RDMA、NVMe-oF、CNode、GPUs、vLLM、8+2）原样保留；连字符两边各自处理。"""
import re
SMALL = set('a an the and but or nor for so yet as at by in of on to up via vs per from into onto over with than off'.split())

def _word(w, force):
    if not w or not re.search(r'[A-Za-z]', w):
        return w
    core = re.match(r"^([^A-Za-z]*)(.*?)([^A-Za-z0-9]*)$", w)
    pre, mid, post = core.groups()
    if any(c.isupper() for c in mid) or re.search(r'\d', mid):
        return w
    if '-' in mid:
        ps = mid.split('-')
        return pre + '-'.join(_word(q, force or i == 0) if q else q for i, q in enumerate(ps)) + post
    if not force and mid.lower() in SMALL:
        return pre + mid.lower() + post
    return pre + mid[:1].upper() + mid[1:] + post

def tc(s):
    parts = re.split(r'(\s+)', s.strip())
    words = [i for i, p in enumerate(parts) if p and not p.isspace()]
    out = list(parts)
    for n, i in enumerate(words):
        prev = parts[words[n - 1]] if n else ''
        force = n == 0 or n == len(words) - 1 or prev.endswith((':', '—', '–', '?', '!')) or prev.endswith('.')
        out[i] = _word(parts[i], force)
    return ''.join(out)

if __name__ == '__main__':
    for t in ['AI infrastructure, one stop at a time', 'Why RDMA is fast', 'RoCE: RDMA over Ethernet',
              'Classic TCP: the CPU touches every step', 'How erasure coding saves space', 'NVMe-oF: remote drives that act local',
              'Switch topology: fat-tree and rail', 'KV cache offload: sharing inference KV cache on VAST', 'How vendors do it']:
        print(tc(t))
