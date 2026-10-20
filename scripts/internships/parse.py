import re, csv, sys, html
import os; R=os.environ.get('REPOS','repos')+'/'
INC=re.compile(r'software|developer|engineer|data|\bai\b|\bml\b|machine|full.?stack|backend|front.?end|platform|infrastructure|devops|cloud|security|research|quant|intelligence|computer|programm|analytics|swe|sde|technolog',re.I)
EXC=re.compile(r'mechanical|electrical|civil|chemical|marketing|sales|finance|accounting|\bhr\b|human resources|product manager|product design|ux|designer|hardware|supply chain|manufactur|quality assurance technician|nurs|pharm|legal|recruit|operations intern|business analyst|safety',re.I)
def strip(s):
    s=re.sub(r'<[^>]+>','',s); s=re.sub(r'\[!\[[^\]]*\]\([^)]*\)\]\(([^)]*)\)',r'\1',s); s=re.sub(r'\[[^\]]*\]\(([^)]*)\)',r'\1',s)
    return html.unescape(s).replace('**','').strip()
def link(cell):
    ms=re.findall(r'href="([^"]+)"',cell) or re.findall(r'\]\((https?://[^)]+)\)',cell)
    return ms[-1] if ms else ''
rows=[]
def table_rows(text):
    for ln in text.splitlines():
        if not ln.startswith('|'): continue
        c=[x.strip() for x in ln.strip().strip('|').split('|')]
        if not c or re.match(r'^:?-+',c[0]) or c[0] in('Company','Name'): continue
        yield c
def run(file,source,section_of,mapper):
    text=open(R+file).read(); prev=''
    for sec,chunk in section_of(text):
        for c in table_rows(chunk):
            r=mapper(c,sec)
            if not r: continue
            if r['Company'] in('↳','') : r['Company']=prev
            prev=r['Company']; rows.append(r)
# negarprh
def sec_md(text,pat=r'^#{2,3} .*'):
    parts=re.split(r'(?m)(^#{2,3} .*)',text); cur='top'
    yield cur,parts[0]
    for i in range(1,len(parts),2): yield strip(parts[i]).strip('# ').strip(), parts[i+1]
def m_can(c,sec):
    if len(c)<5: return None
    comp,role,loc,ap,date=c[:5]
    if 'Closed' in ap: return None
    return dict(Source='negarprh/Canadian-Tech-Internships-2027',Company=strip(comp),Role=strip(role),Location=strip(loc),Posted=strip(date),Link=link(ap),Extra='',Tier='Canada')
run('negarprh_Canadian-Tech-Internships-2027.md','',sec_md,m_can)
def m_sa(tier):
    def m(c,sec):
        if sec.startswith('2027 USA') or sec.startswith('2027 International'): pass
        if len(c)==6: comp,role,loc,sal,post,age=c
        elif len(c)==5: comp,role,loc,post,age=c; sal=''
        else: return None
        return dict(Source='speedyapply/2027-SWE-College-Jobs'+tier,Company=strip(comp),Role=strip(role),Location=strip(loc),Posted=strip(age),Link=link(post),Extra=strip(sal),Tier=sec)
    return m
run('speedyapply_2027-SWE-College-Jobs.md','',sec_md,m_sa(''))
run('speedyapply_INTERN_INTL.md','',sec_md,m_sa(' (intl)'))
def sec_zap(text):
    parts=re.split(r'<summary><h3>(.*?)</h3></summary>',text)
    for i in range(1,len(parts),2): yield strip(parts[i]), parts[i+1]
def m_zap(c,sec):
    if sec not in('💻 Software Engineering','📊 Data Science & AI') or len(c)<6: return None
    comp,role,loc,age,visa,ap=c[:6]
    return dict(Source='zapplyjobs/Internships-2027',Company=strip(comp),Role=strip(role),Location=strip(loc),Posted=strip(age),Link=link(ap),Extra=strip(visa),Tier=sec[2:])
run('zapplyjobs_Internships-2027.md','',sec_zap,m_zap)
# filters
CAN=re.compile(r'\b(ON|QC|BC|AB|MB|SK|NS|NB|NL|PE)\b|Canada|Toronto|Waterloo|Vancouver|Montreal|Ottawa|Calgary|Kitchener|Mississauga|Remote',re.I)
out=[]; seen=set()
for r in rows:
    if r['Source'].startswith('speedyapply') and '(intl)' in r['Source'] and not CAN.search(r['Location']): continue
    if r['Source'].startswith('negarprh') and not INC.search(r['Role']): continue
    if EXC.search(r['Role']) and not re.search(r'software|developer|data|\bai\b|\bml\b',r['Role'],re.I): continue
    key=r['Link'] or (r['Company']+r['Role']+r['Location'])
    if key in seen: continue
    seen.add(key)
    loc=r['Location']
    CANX=re.compile(r'\b(ON|QC|BC|AB|MB|SK|NS|NB|NL|PE)\b|Canada|Toronto|Waterloo|Vancouver|Montr[eé]al|Ottawa|Calgary|Kitchener|Mississauga|Edmonton|Winnipeg|Halifax|Victoria, BC',re.I)
    USX=re.compile(r'\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC|US|USA)\b|United States|New York|San Francisco|Seattle|Chicago|Boston|Austin|Remote - US')
    if CANX.search(loc): r['Region']='Canada'
    elif USX.search(loc): r['Region']='US'
    elif re.search(r'^remote$|remote \(?(us|north america|na)\)?|^remote,? ?$',loc,re.I): r['Region']='Remote'
    elif r['Source'].startswith('speedyapply/2027-SWE-College-Jobs') and '(intl)' not in r['Source'] or r['Source'].startswith('zapply'): r['Region']='US'
    else: continue
    out.append(r)
pri={'Canada':0,'Remote':1,'US':2}
out.sort(key=lambda r:(pri[r['Region']], 0 if 'FAANG' in r['Tier'] else 1, r['Company'].lower()))
cols=['Status','Region','Company','Role','Location','Posted','Link','Tier','Extra','Source','Notes']
w=csv.DictWriter(open(os.environ.get('OUT','backlog.csv'),'w',newline=''),fieldnames=cols,extrasaction='ignore')
w.writeheader()
for r in out: r['Status']='';r['Notes']='';w.writerow(r)
from collections import Counter
print(len(rows),'raw',len(out),'kept',Counter(r['Region'] for r in out),Counter(r['Source'] for r in out))
print([r for r in out if 'shopify' in r['Company'].lower()])
