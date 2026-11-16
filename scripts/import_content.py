"""Versioned web adaptation; complete manuscript guidance remains verbatim."""
from pathlib import Path
import json,re,hashlib
R=Path(__file__).resolve().parents[1];pages=json.loads((R/'sources/manuscript-pages.json').read_text())
P={p['page']:p for p in pages}
for p in pages:p['controls']=[];p['references']=[]
def add(n,k,label,t='text',**kw):
 d=dict(id=k,label=label,type=t,**kw);P[n]['controls'].append(d);return d
def text(n,k,label,source=None):return add(n,k,label,source=source) if source else add(n,k,label)
def many(n,prefix,labels):
 for i,s in enumerate(labels):text(n,f'{prefix}.{i+1}',s)
def matrix(n,k,label,rows,options,t='matrix'):return add(n,k,label,t,rows=rows,options=options)
def checks(n):
 lines=P[n]['lines'];i=0;group=0
 while i<len(lines):
  if '☐' not in lines[i]:i+=1;continue
  start=i;opts=[]
  while i<len(lines) and '☐' in lines[i]:
   opts += [re.sub(r'_{2,}','…',x).strip() for x in lines[i].split('☐')[1:]];i+=1
  group+=1;label=lines[max(0,start-1)]
  add(n,f'p{n}.choices{group}',label,'checks',options=opts)
for n in [6,9,12,14,16,19,23,26,31,36,38,40,42,45,49,52,66]:checks(n)
# Preparation and original evidence; same two sets reused throughout.
for n in [5,22]:add(n,'evidence', 'Your evidence sets','evidence')
fit=['Very fitted','Body-skimming','Relaxed','Loose','Oversized'];ratings=['Love it','Like it','Neutral',"Don’t like it",'Actively avoid it']
matrix(8,'fit.ratings','Now mark how you feel about each fit:',fit,ratings)
many(8,'fit.notes',['The fits I naturally gravitate towards:','The fits I tend to avoid:','Something I noticed:'])
many(9,'fit.observe',['I feel most like myself when my clothes ________.',"I don’t enjoy clothes that ________."])
text(10,'fit.pattern','My Fit Pattern')
sil=['Straight','Defined','Relaxed','Oversized','Fitted + relaxed','Cropped + long','Long + streamlined']
matrix(11,'silhouette.ratings','For each silhouette, mark:',sil,['Yes — I love this','Maybe — I like something about it','No — not for me'])
many(12,'silhouette.notes',['What makes you hesitate?','What do your NOs have in common?','The silhouette direction I naturally gravitate towards:','A silhouette combination I repeatedly enjoy:','A silhouette direction I tend to avoid:'])
matrix(13,'proportion.ratings','For each combination, mark:',['cropped top + high-rise trousers','hip-length top + trousers','long top + slimmer bottoms','oversized top + mini skirt','short jacket + long skirt','long cardigan + short dress'],['Love it','Like it','Unsure',"Don’t like it"])
many(13,'proportion.notes',['Which combinations make your outfits feel most natural?','Which combinations consistently feel “off” to you?'])
many(14,'length.notes',['Lengths I naturally gravitate towards:','Lengths I rarely choose:','A length I thought I liked but rarely actually wear:'])
neck=['Crew neck','High neck','Turtleneck','V-neck','Scoop','Sweetheart','Square','Boat','Halter','Off-shoulder','Strapless','Open button-down']
matrix(15,'neckline.sort','Put each into one of four groups:',neck,['I repeatedly choose this','I happily wear this','I admire this on other people','I generally avoid this'])
many(16,'neckline.notes',['Necklines I repeatedly enjoy:','Necklines I tend to avoid:','Something I noticed about how I like my upper body framed:'])
areas=['Arms','Shoulders','Legs','Cleavage','Back','Midriff','Thighs']
matrix(17,'exposure.scale','Look at these areas',areas,['Covered','Slightly visible','Moderate','Noticeable'])
matrix(18,'exposure.preferences','For each area:',areas,['I like showing it',"I’m comfortable showing it",'Sometimes','I generally keep it covered'])
text(18,'exposure.notes','I feel most comfortable with clothing that shows ______ while keeping ______ relatively covered.')
many(19,'comfort.notes',['My clothing comfort non-negotiables:',"Something I’m willing to compromise on occasionally:"])
for k,l,src in [('fit','MY FIT — I naturally prefer:','fit.pattern'),('silhouette','MY SILHOUETTE — The shapes I gravitate towards:','silhouette.notes.3'),('proportion','MY PROPORTIONS — The combinations I especially enjoy:','proportion.notes.1'),('length','MY LENGTHS — The lengths I repeatedly choose:','length.notes.1'),('neckline','MY NECKLINES / OPENINGS — I feel best in:','neckline.notes.1'),('exposure','MY SKIN EXPOSURE — I am most comfortable showing:','exposure.notes'),('comfort','MY COMFORT NON-NEGOTIABLES — My clothes need to:','comfort.notes.1')]:text(20,'body.'+k,l,src)
many(20,'body.synthesis',['The physical qualities I repeatedly choose are:','The physical qualities I tend to avoid are:','My clothes work best for me physically when:','One thing I understand about myself and clothes now that I did not notice before is:'])
add(23,'inspiration.top','Which five visual qualities appear repeatedly across your inspiration?','list',count=5)
matrix(23,'inspiration.want','Which of these do I actually want in my own wardrobe?',['Visual quality 1','Visual quality 2','Visual quality 3','Visual quality 4','Visual quality 5'],['I want this often','I want this sometimes','I like seeing it, but not wearing it'])
many(23,'inspiration.notes',['Are there any qualities that appear frequently in your inspiration but rarely appear in your actual clothes?','Why do you think that might be?',"Are there qualities you already wear without consciously realizing they’re part of your style?",'The visual qualities I naturally want more of are:',"The visual qualities I enjoy admiring but don’t necessarily need to wear are:"])
add(24,'inspiration.sort','Sort your inspiration','image-sort',options=['Beautiful + Me','Beautiful + Not Me','Interesting + Maybe Me','Not For Me'])
many(24,'admiration',['What makes these outfits appealing even though you don’t want to wear them?','What do you want to take from your BEAUTIFUL + ME group?',"Something I admire but don’t actually want for myself is:",'Something I repeatedly see and think “that’s me” is:', 'A style direction I might have confused with my personal style is:'])
dials=['Simple|Detailed','Understated|Noticeable','Soft|Structured','Feminine|Androgynous','Classic|Trend-forward','Relaxed|Polished','Minimal|Expressive','Subtle|Dramatic','Romantic|Edgy']
for i,d in enumerate(dials):add(25,f'dials.{i+1}',d.replace('|',' — '),'scale',ends=d.split('|'),min=1,max=7)
many(26,'intensity',['How much visual interest feels like enough?','When does an outfit start feeling too plain?','When does an outfit start feeling like too much?','My ideal amount of visual interest is:'])
for k,ends in [('femininity',['Soft / Feminine','Strong / Structured']),('polish',['Effortless / Relaxed','Highly Polished']),('edge',['Classic / Subtle','Strongly Edgy'])]:add(27,'balance.'+k,k.title(),'scale',ends=ends,min=1,max=7)
many(27,'balance.notes',['I like femininity when it feels ______ rather than ______.',"I like looking polished, but I don’t want my style to feel ______.",'I enjoy a little edge through ______.','My balance of femininity, polish and edge:'])
many(28,'colour.observe',['WORN OFTEN','ENJOYED WEARING','RECEIVED COMPLIMENTS IN','OWNED BUT RARELY WORN','LIKED ON OTHER PEOPLE','ACTIVELY DISLIKED','What colours do you naturally repeat?',"Are there colours you love in theory but don’t enjoy wearing?",'Are there colours you wear because they’re easy rather than because they feel like you?'])
roles=['Anchor','Support','Soft Neutral','Strong Neutral','Wildcard','Signature Accent']
for n in [29,30,61]:add(n,'colours','My Six-Colour Formula','colours',rows=roles)
text(29,'colour.reason','Why these colours work for me:')
text(30,'colour.new','The colour:');add(30,'colour.three','It works with:','list',count=3)
add(30,'colour.practical','Is this colour:','checks',options=['Easy to integrate','Usable with some effort','Mostly an accent','Beautiful but unnecessary for my wardrobe'])
many(30,'colour.direction',['The overall colour direction I want my wardrobe to have is:',"A colour I love but don’t necessarily need is:"])
many(31,'signatures.notes',['Which things appear again and again?','Which are so automatic that you barely think about them?','Which ones make an outfit feel more like you?'])
for k,l in [('automatic','I DO THIS AUTOMATICALLY'),('deliberate','I DO THIS DELIBERATELY')]:add(32,'signatures.'+k,l,'list',count=5)
add(32,'signatures.top','Your top three','list',count=3);text(32,'signatures.finish','My outfits often feel more like me when I add ______.')
for i,(l,src) in enumerate([("WHAT I’M DRAWN TO:",'inspiration.top'),('WHAT I ACTUALLY WANT TO WEAR:','inspiration.notes.4'),('MY VISUAL DIRECTION:',None),('MY IDEAL VISUAL INTENSITY:','intensity.4'),('MY FEMININITY / POLISH / EDGE BALANCE:','balance.notes.4'),('MY COLOUR DIRECTION:','colour.direction.1'),('MY STYLE SIGNATURES:','signatures.top')]):text(33,f'personality.{i+1}',l,src)
text(33,'personality.sentence','I want my clothes to feel ______ while looking ______.')
many(34,'repeats',['I naturally notice ______ in clothes.','I feel most visually satisfied when an outfit has ______.','My style becomes more recognisably mine when I add ______.',"I admire ______, but I do not necessarily want to wear it.",'Related preferences that may be pointing to the same thing:'])
add(34,'visual.pattern','Pattern I notice / Evidence behind it / What I think this means','patterns',count=1)
add(34,'visual.qualities','My core visual qualities','list',count=5);text(34,'visual.combination','The combination of qualities that feels most like me is ______.');many(34,'visual.direction',['The visual direction I seem to be building is ______.','A repeated detail or idea I want to remember is ______.'])
contexts=['Home','Errands','Casual outings','Work','School','Business meetings','Social outings','Dates','Church / religious activities','Family gatherings','Dinners','Parties','Weddings / formal occasions','Travel','Exercise','Other']
matrix(36,'life.frequency','Now mark how often each one actually occurs.',contexts,['Very frequent','Frequent','Occasional','Rare','Almost never'])
add(36,'life.top','My three most common dressing situations are:','list',count=3)
many(36,'life.less',['A situation I dress for much less often than I thought:','A situation I may own too many clothes for:'])
time=['Home / everyday life','Errands / practical activities','Work / business','Social life','Church / religious activities','Family','Dates / romantic occasions','Formal events','Travel','Exercise','Other']
add(37,'life.time','My 100-point time map','time',rows=time)
many(38,'life.map',['Which categories take up the largest share of your life?','Which categories take up very little of your life?','Why?','My three biggest real-life dressing contexts are:','The biggest mismatch I noticed is:'])
add(39,'life.situations','Look at your three most common situations','table',rows=['Situation 01','Situation 02','Situation 03'],columns=['Situation','What do your clothes need to help you do?'])
practical=['Comfort','Easy movement','Looking appropriate','Easy transitions','Easy styling','Weather suitability','Looking polished','Feeling relaxed','Being able to sit/walk comfortably','Other']
matrix(39,'life.needs','Now sort your needs',practical,['Must have','Nice to have',"Doesn’t matter much"])
add(39,'life.help','The three things my clothes most need to help me do are:','list',count=3)
many(40,'environment',['Which environmental factors strongly affect what you can realistically wear?','Which affect you somewhat?','Which ones barely matter?'])
pra=['Easy care','Comfortable','Versatile','Durable','Breathable','Weather-appropriate','Easy movement','Easy to style / match','Modest',"Secure / doesn’t require constant adjusting",'Affordable to replace','High quality','Low maintenance','Functional details','Other']
matrix(41,'practical.sort','Sort these qualities',pra,['Non-negotiable','Important','Nice to have',"I don’t really care"])
many(41,'practical.notes',['Which qualities did you place under NON-NEGOTIABLE?','Which qualities are nice to have but not worth compromising your style for?','To me, practical clothing means ______.',"I’m willing to sacrifice ______ in order to have more ______.","I don’t mind ______ if it means I get ______.",'I am not willing to compromise on ______.'])
many(42,'fantasy',['The biggest “fantasy life” category in my wardrobe is:','Why do I think I bought or wanted these clothes?','How often does this situation actually occur?'])
add(42,'life.compare','My actual life / My imagined life','table',rows=['I spend most of my time / I have accumulated or saved clothes for','I most often need clothes for / I thought I would spend more time','My clothes need to help me / I imagined myself dressing like'],columns=['My actual life','My imagined life'])
many(42,'life.mismatch',['My wardrobe seems prepared for ______, but my actual life requires more ______.','The biggest lifestyle mismatch I notice is…','If my wardrobe were designed around the life I actually live, it would prioritize ______ over ______.'])
for k,l,src in [('time','Most of my life is spent…','life.map.4'),('contexts','The situations I need my wardrobe to support most are…','life.top'),('help','My clothes need to help me…','life.help'),('practical','The practical qualities I value most are…','practical.notes.3'),('mismatch','The biggest lifestyle mismatch I notice is…','life.mismatch.2'),('priority','If my wardrobe were designed around the life I actually live, it would prioritize ______ over ______.','life.mismatch.3')]:text(43,'lifestyle.'+k,l,src)
many(44,'life.implications',['Most days, I need clothes that are ______.','I spend more time ______ than ______.','My wardrobe needs to support ______ most often.','For me, practicality means ______.',"I don’t need my wardrobe to be dominated by ______.",'I would benefit from having more clothes that ______.','Something I learned about my lifestyle and the way I dress is:'])
for k,l,src in [('body','Your Body','body.synthesis.3'),('personality','Your Personality','personality.sentence'),('life','Your Lifestyle','lifestyle.priority')]:text(45,'dots.'+k,l,src)
add(46,'repeated.qualities','Highlight or write down 5–8 qualities that appear repeatedly.','list',count=8);add(46,'repeated.top','Which three feel strongest?','list',count=3)
add(47,'patterns','Your strongest patterns','patterns',count=3);text(47,'patterns.connection','Across my body, personality, and lifestyle discoveries, a possible connecting pattern is:')
many(48,'tensions',['I like:','But I don’t want too much:','I want my clothes to feel:','without becoming:','I enjoy:','but I still need:','I want to look:','while feeling:','I want ______ without becoming ______.'])
for k,l in [('core','My core qualities'),('supporting','My supporting qualities'),('accent','My accent qualities')]:add(49,'qualities.'+k,l,'list',count=3)
text(49,'balance.why','Why?')
add(50,'translation','My style translation','table',rows=['01','02','03'],columns=['Style quality','What it means to me','How it may show up in clothing'])
many(51,'dictionary',['When I say “feminine,” I mean…','When I say “polished,” I mean…','When I say “casual,” I mean…','When I say “sexy,” I mean…','When I say “simple,” I mean…','When I say “stylish,” I mean…','When I say “__________,” I mean…'])
many(52,'like.me',["What works or doesn’t?",'Does it reflect the visual qualities I actually want?','Would this make sense for my actual life?','One physical quality:','One visual/personality quality:','One lifestyle quality:'])
many(53,'good.on.me',['Something can look good on me and still not be my style when…','I can admire an outfit without wanting to wear it because…',"A flattering outfit isn’t automatically a good outfit for me because…",'An outfit that looked good on me but didn’t feel like me:','Why?','An outfit that may not fit a traditional style rule but felt very much like me:'])
many(54,'direction',['I want my clothes to feel:','I want them to look:','I prefer:',"I don’t want my style to feel:",'My clothes need to work for:','I want to balance:'])
text(54,'style.brief','My version: I want to dress in a way that feels [CORE QUALITIES], combining [QUALITY] with [QUALITY], while keeping my clothes practical for [LIFESTYLE].')
many(55,'specific',['I want my style to feel…','I want people to see…','I want to feel… when I get dressed.',"I don’t want my style to become…",'The combination that feels most like me is…','I like clothes that…','I usually feel best when…',"I don’t really enjoy…"])
for k,l,src in [('body','The physical qualities I repeatedly prefer are:','body.synthesis.1'),('personality','The visual qualities I repeatedly want are:','visual.combination'),('lifestyle','The practical qualities my life requires are:','lifestyle.practical'),('tension','I want ______ without becoming ______.','tensions.9')]:text(56,'synthesis.'+k,l,src)
for k in ['core','supporting','accent']:add(56,'qualities.'+k,'My '+k+' style qualities','list',count=3)
many(56,'synthesis.language',['Silhouettes:','Fit:','Proportions:','Details:','Textures:','Accessories:'])
many(57,'brief',['I want my clothes to feel:','I want them to look:','The qualities I want most are:','I prefer:',"I don’t want my style to become:",'My clothes need to work for:','The balance I want to create is:'])
text(57,'style.statement','I want to dress in a way that ______.','style.brief')
many(57,'brief.complete',['My style works best when my clothes respect my body by…','My style feels like me when my clothes express…','My wardrobe works for my life when it supports…','The balance I am trying to create is…'])
add(57,'qualities.final','The three qualities I want to carry into my Blueprint are…','list',count=3,source='qualities.core')
text(59,'identity','My one-sentence style identity','style.statement')
many(59,'identity.notes',['I want my clothes to make me feel ______.','I want my appearance to communicate ______.','I feel most like myself when my clothes ______.','For me, this means:','I can see it in clothing through:'])
add(59,'qualities.final','My core qualities','list',count=3,source='qualities.core')
langs=['Fit','Silhouette','Proportion','Length','Necklines / Openings','Textures / Fabrics','Visual Detail','Shoes','Accessories']
add(60,'style.language','My style language','table',rows=langs,columns=['My preference','What this looks like for me'])
many(60,'language.notes',['I usually reach for:','I want my outfits to communicate:','The visual qualities I want to repeat are:'])
text(61,'colour.reason','Why it works for me:');text(61,'colour.final','When I look at my colours together, I want my wardrobe to feel:','colour.direction.1');text(61,'colour.new','New colour / item:');add(61,'colour.three','My three-item check','list',count=3);add(61,'colour.result','Result','checks',options=['This colour integrates easily.','It could work with some styling.',"I love it, but it doesn’t need to become a major wardrobe colour."])
many(62,'signatures.repeated',['Jewellery:','Accessories:','Shoes:','Styling details:','Clothing details:','Other:'])
add(62,'signatures.top','My top three style signatures','list',count=3)
text(62,'signatures.one','If I could keep only one:')
text(62,'signatures.auto','One of my signatures that happens automatically is:','signatures.automatic');text(62,'signatures.intent','One I want to make more deliberate is:','signatures.deliberate')
add(63,'outfits','My personal outfit directions','outfits',count=3)
many(64,'rules',['I prefer ______ over ______.','I feel most comfortable when ______.',"I don’t enjoy clothes that ______.",'I like outfits to ______.',"I don’t want my style to become ______.",'When choosing between two things I like, I usually choose the one that ______.'])
add(64,'rules.more','My “more of this” list','list',count=5);add(64,'rules.less','My “less of this” list','list',count=5);text(64,'rules.consider','Before deciding whether something works for me, I want to consider:')
many(65,'permission',["I don’t need to dress like ______ to be stylish.","I don’t need to own ______ just because it’s considered a wardrobe essential.","I don’t need my style to look ______.","I don’t need to follow the fashion rule that says ______.","I don’t need to force myself to like ______.",'I give myself permission to dress in a way that ______.'])
criteria=[]
for line in P[66]['lines']:
 if re.match(r'0[1-5] — ',line):criteria.append(re.sub(r' Score:.*','',line))
add(66,'compass.scores','Score each criterion from 0–5','compass',rows=criteria)
text(66,'compass.notes','What influenced my decision?')
# Personal preference cells reuse the customer's own profile, never an inferred label.
P[60]['controls'][0]['cellSources']={row+'::My preference':source for row,source in zip(langs,['body.fit','body.silhouette','body.proportion','body.length','body.neckline','synthesis.language.5','personality.3','signatures.repeated.3','signatures.repeated.2'])}
# Master dossier and one-glance references use the same canonical records, not new discovery.
for key,label,src in [('identity','My style sentence','style.statement'),('qualities.final','My core qualities','qualities.core'),('style.language','My style language',None),('colours','My six-colour formula',None),('signatures.top','My style signatures',None),('outfits','My personal outfit directions',None),('rules.summary','My personal style rules','rules.1'),('lifestyle.priority','My lifestyle priorities',None),('compass.reminder','Before buying, I want to remember:','rules.consider'),('style.statement','Final style statement','style.brief')]:
 existing=next((c for p in pages for c in p['controls'] if c['id']==key),None)
 if existing:P[67]['controls'].append(dict(existing,label=label))
 else:text(67,key,label,src)
for key,label,src in [('lifestyle.contexts','The situations I dress for most:',None),('lifestyle.help','My life requires clothes that:',None),('lifestyle.practical','The practical qualities I value most:',None),('master.environment','My environmental needs:','environment.1'),('rules.more','I want more of:',None),('rules.less','I want less of:',None),('rules.consider','I always consider:',None),('rules.5',"I don’t want my style to become:",None),('signatures.auto','Automatic signatures:',None),('signatures.intent','Deliberate signatures:',None)]:
 existing=next((c for p in pages for c in p['controls'] if c['id']==key),None)
 if existing:P[67]['controls'].append(dict(existing,label=label))
 else:text(67,key,label,src)
for key,label,src in [('glance.style','STYLE:','identity'),('glance.qualities','CORE QUALITIES:','qualities.final'),('glance.language','STYLE LANGUAGE:','style.language'),('glance.colours','COLOUR FORMULA:','colours'),('glance.signatures','SIGNATURES:','signatures.top'),('glance.outfits','OUTFIT DIRECTIONS:','outfits'),('glance.life','LIFESTYLE PRIORITIES:','lifestyle.priority'),('glance.permission','MY “DON’T NEED TO BECOME” REMINDER:','permission.6')]:text(68,key,label,src)
# Every exercise permits an additional user-authored note; editorial-only pages do not invent tasks.
for p in pages:
 n=p['page'];p['part']=0 if n<=5 else 1 if n<=20 else 2 if n<=34 else 3 if n<=44 else 4 if n<=57 else 5
 p['references']=[x for x in ([8,9] if n==10 else [11] if n==12 else [8,10,12,14,16,18,19] if n==20 else [22] if n in [23,24] else [23,24,25,27,28,32] if n in [33,34] else [36,37] if n==38 else [36,37,39,40,41,42] if n in [43,44] else [20,33,43] if n in [45,46,47,48,49,54,56,57] else [54,57] if n==59 else [20,33,50,51] if n==60 else [29,30] if n==61 else [31,32] if n==62 else [20,33,43,57] if n in [63,64,65,66] else [59,60,61,62,63,64,65,66] if n==67 else [67] if n==68 else [])]
 if p['controls'] and n not in [1,5,6,22]:text(n,f'p{n}.reflection','Something else I want to remember:')
 p['subtitle']=p['lines'][0] if len(p['lines'][0])<140 and n>1 else ''
 p['art']='fit' if n in [1,8,11,13] else 'necklines' if n in [15,16] else 'colour' if n in [28,29,30,61] else 'connections' if n in [45,47,58] else None
# All approved guidance is retained without production-only copy.
(R/'content/workbook.json').write_text(json.dumps({'version':'draft3-web-1','brand':'In Her Fashion','title':'Personal Style Blueprint','parts':['Preparation','Your Body','Your Personality','Your Lifestyle','Connect the Dots','Your Personal Style Blueprint'],'pages':pages},ensure_ascii=False,indent=2))
print('Structured',len(pages),'source pages;',sum(len(p['controls']) for p in pages),'component placements.')
