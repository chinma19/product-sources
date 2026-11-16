"""Pass one short-lived Site credential on stdin; never persist or print it."""
import os,sys,json,subprocess
c=json.load(sys.stdin);env=os.environ.copy();env['GIT_TERMINAL_PROMPT']='0'
if c.get('auth_mode')!='work_proxy':
 env.update(GIT_CONFIG_COUNT='1',GIT_CONFIG_KEY_0='http.extraHeader',GIT_CONFIG_VALUE_0='Authorization: Bearer '+c['token'])
subprocess.run(['git','push',c['remote_url'],'HEAD:'+c.get('branch','main')],env=env,check=True)
print('Exact source commit pushed to the Site repository.')
