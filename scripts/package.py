"""Package reproducible source, staff static build and native JS exports."""
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
import hashlib,json
root=Path(__file__).resolve().parents[1];out=root/'artifacts';out.mkdir(exist_ok=True)
def write(path,files):
 with ZipFile(path,'w',ZIP_DEFLATED,compresslevel=9) as z:
  for name,p in sorted(files):
   info=ZipInfo(name,(2026,1,1,0,0,0));info.compress_type=ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,p.read_bytes())
ignore={'node_modules','dist','.git','.expo','artifacts','test-results','coverage'}
source=[p for p in root.rglob('*') if p.is_file() and not any(n in ignore for n in p.relative_to(root).parts) and not p.name.startswith('.env') and not p.suffix in {'.jks','.keystore','.p12','.mobileprovision'}]
write(out/'BrekMate_Frontend_Source.zip',[(str(Path('brekmate-fe')/p.relative_to(root)),p) for p in source])
for directory,name in [('apps/staff/dist','BrekMate_Staff_Web_Build.zip'),('apps/mobile/dist','BrekMate_Native_JS_Exports.zip')]:
 base=root/directory
 if not base.exists():raise SystemExit(f'Missing {directory}; run npm run check before packaging')
 write(out/name,[(str(p.relative_to(base)),p) for p in base.rglob('*') if p.is_file()])
manifest={p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in out.glob('*.zip')};(out/'checksums.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest,indent=2))
