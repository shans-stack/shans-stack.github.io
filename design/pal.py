# 三套配色的唯一数据源
GRAY_L=dict(bg='#F9F9F8',surface='#FFFFFF',ink='#1C1E22',ink2='#474C54',ink3='#686D75',rule='#DADCDF',rule2='#B9BDC3',blk='#A9AEB5')
GRAY_D=dict(bg='#15171A',surface='#1C1F23',ink='#ECEDEF',ink2='#BABEC5',ink3='#959AA2',rule='#2F3338',rule2='#4A4F56',blk='#5B6168')
PAL={
 'macaron':dict(zh='马卡龙',en='Macaron',
   L=dict(base={},l=['#E07F9C','#DE945A','#9C86D6','#6A9FD3','#45AD8E']),
   D=dict(base={},l=['#DB93A7','#DBA578','#A996DA','#86AEDA','#76C0A6'])),
 'muted':dict(zh='低饱和',en='Muted',
   L=dict(base={},l=['#B07780','#B08A3E','#877A9C','#5E7A93','#76906B']),
   D=dict(base={},l=['#CB9AA1','#CCAA68','#A99CBD','#8FA8BE','#9CB390'])),
 'oldmoney':dict(zh='老钱风',en='Old money',
   L=dict(base=dict(bg='#F5F0E6',surface='#FBF8F2',ink='#2A2520',ink2='#4C453D',ink3='#6B6359',rule='#E0D7C8',rule2='#C4B9A7',blk='#B2A796'),
          l=['#7B2D3B','#A47B37','#2D3E5F','#2F5B45','#857567']),
   D=dict(base=dict(bg='#1A1815',surface='#221F1B',ink='#EFE9DE',ink2='#C9C0B2',ink3='#A39A8C',rule='#35302A',rule2='#4F483F',blk='#625A4F'),
          l=['#CF7F8B','#D2AF6C','#8FA4CC','#7FB096','#B6A697'])),
}
NAMES=[('AI 应用','AI Application'),('数据','Data'),('计算','Compute'),('网络','Network'),('存储','Storage')]

# 第七、八色（专题图的厂商「硬件」「软件」两条产品线用）：岩灰褐、石墨蓝，和技术线的彩色分开。
PAL['muted']['L']['l'] += ['#8E7F6E', '#4F5A66']
PAL['muted']['D']['l'] += ['#B5A796', '#A3ADB8']
# 第九色（VAST「介质与写入」线用）：橄榄灰。
PAL['muted']['L']['l'] += ['#8A8A5C']
PAL['muted']['D']['l'] += ['#B3B38A']
# 第十、十一色（NVIDIA 图线多时用）：陶土、暗靛。
PAL['muted']['L']['l'] += ['#A0705A', '#6F6A8F']
PAL['muted']['D']['l'] += ['#C99A84', '#9C97BB']
