import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

const projects = [
  { id: '01', type: 'IMAGE / VISUAL', title: '光的另一种形态', en: 'A Study of Light', description: '以光、材质与空间为线索，探索视觉叙事中的情绪与想象。', video: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_030111_a9e15665-d379-4a7f-8116-695bbe452ad1.mp4', tags: ['视觉设计', '图像创作'], color: '#362c5b' },
  { id: '02', type: 'MOTION / FILM', title: '流动的瞬间', en: 'Moments in Motion', description: '从影像节奏出发，将抽象的感受转化为可感知的动态画面。', video: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260429_171347_f640c30d-ec21-426a-98bc-77e07c2c60cb.mp4', tags: ['动态影像', '视觉叙事'], color: '#5b3021' },
  { id: '03', type: 'IMAGE / CONCEPT', title: '想象的边界', en: 'Beyond the Frame', description: '在真实与虚构之间，构建具有氛围感的概念视觉世界。', video: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260503_104800_bc43ae09-f494-43e3-97d7-2f8c1692cfd7.mp4', tags: ['概念设计', '图像创作'], color: '#213b5d' },
  { id: '04', type: 'DOCUMENT / RESEARCH', title: '从想法到呈现', en: 'Ideas into Form', description: '通过调研、整理与设计，将复杂的信息转化为清晰的表达。', video: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_161253_c72b1869-400f-45ed-ac0c-52f68c2ed5bd.mp4', tags: ['内容策划', '文档设计'], color: '#293b3b' },
];
type Project = typeof projects[number];

// The hero is a broader showcase; the four detailed case studies remain below.
const heroProjects: Project[] = [
  ...projects,
  { ...projects[0], id: '05', title: '自然的回声', en: 'Echoes of Nature', type: 'IMAGE / EXPLORATION', video: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_115655_b4d9cd77-feed-43cd-a198-af78ebdf1f7a.mp4' },
  { ...projects[1], id: '06', title: '空间的诗意', en: 'Poetry of Space', type: 'MOTION / EXPLORATION', video: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_024928_1efd0b0d-6c02-45a8-8847-1030900c4f63.mp4' },
  { ...projects[2], id: '07', title: '蓝色练习', en: 'Blue Studies', type: 'IMAGE / EXPERIMENT' },
  { ...projects[0], id: '08', title: '光的轨迹', en: 'Traces of Light', type: 'IMAGE / STUDY' },
  { ...projects[3], id: '09', title: '材质档案', en: 'Material Archive', type: 'IMAGE / MATERIAL' },
  { ...projects[1], id: '10', title: '时间切片', en: 'Slices of Time', type: 'MOTION / STUDY' },
  { ...projects[2], id: '11', title: '无声的场域', en: 'Silent Fields', type: 'IMAGE / ATMOSPHERE' },
];

type MediaAsset = File | { name: string; type: string; url: string };
type ProjectEdits = { id: string; title?: string; en?: string; description?: string; story?: string; cover?: MediaAsset; gallery?: MediaAsset[] };

function openPortfolioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('portfolio-editor', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('projects', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadEdits(): Promise<ProjectEdits[]> {
  const db = await openPortfolioDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readonly');
    const request = tx.objectStore('projects').getAll();
    request.onsuccess = () => resolve(request.result as ProjectEdits[]);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

async function saveEdits(id: string, patch: Partial<ProjectEdits>): Promise<ProjectEdits> {
  const db = await openPortfolioDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    const request = store.get(id);
    let result: ProjectEdits;
    request.onsuccess = () => { result = { ...(request.result || { id }), ...patch, id }; store.put(result); };
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onabort = () => { db.close(); reject(tx.error); };
    tx.onerror = () => { /* onabort handles the error */ };
  });
}

function useFileURL(file?: MediaAsset) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file) { setUrl(''); return; }
    if (!(file instanceof Blob)) { setUrl(new URL(file.url, document.baseURI).href); return; }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

function Media({ project, cover, className = '' }: { project: Project; cover?: MediaAsset; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const fileUrl = useFileURL(cover);
  const isImage = !!cover && cover.type.startsWith('image/');
  const src = cover ? fileUrl : project.video;
  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;
    let visible = false;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      if (visible && !document.hidden && !motion.matches) video.play().catch(() => {});
      else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(video);
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', sync);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); motion.removeEventListener('change', sync); };
  }, [src, isImage]);
  if (isImage) return <img className={className} src={src || undefined} alt={`${project.title}封面`} style={{ background: project.color }} />;
  return <video ref={ref} className={className} src={src || undefined} loop muted playsInline preload="metadata" aria-label={`${project.title}封面视频`} style={{ background: project.color }} />;
}

function DetailAsset({ file, index, onReplace, onRemove }: { file: MediaAsset; index: number; onReplace: (file: File) => void; onRemove: () => void }) {
  const url = useFileURL(file);
  return <div className="detail-asset">
    {file.type.startsWith('image/') ? <img src={url || undefined} alt={`项目素材 ${index + 1}`} /> : <video src={url || undefined} controls playsInline preload="metadata" />}
    <div className="detail-asset-tools"><label className="media-action">替换素材<input type="file" accept="image/*,video/*" onChange={e => { const f = e.target.files?.[0]; if (f) onReplace(f); e.target.value = ''; }} /></label><button type="button" onClick={onRemove}>移除</button></div>
  </div>;
}

// Concave cylindrical wall: middle recedes, outer cards turn toward the viewer.
function useArcCarousel(active: number) {
  const track = useRef<HTMLDivElement>(null);
  const phase = useRef(0);
  const destination = useRef(0);
  useLayoutEffect(() => {
    const root = track.current;
    if (!root) return;
    const cards = Array.from(root.querySelectorAll<HTMLButtonElement>('.carousel-item'));
    const count = cards.length;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let width = root.clientWidth;
    const from = phase.current;
    let delta = (active - destination.current) % count;
    if (delta > count / 2) delta -= count;
    if (delta < -count / 2) delta += count;
    const to = destination.current + delta;
    destination.current = to;
    const started = performance.now();
    const duration = 1400 + Math.max(0, Math.abs(to - from) - 1) * 180;
    const paint = () => {
      const mobile = width <= 650;
      const radius = mobile ? width * 1.18 : width * 0.64;
      const depth = mobile ? 210 : width * 0.28;
      cards.forEach((card, i) => {
        let offset = ((i - phase.current) % count + count) % count;
        if (offset > count / 2) offset -= count;
        const angle = offset * 0.30;
        const x = Math.sin(angle) * radius;
        const z = (1 - Math.cos(angle)) * radius - depth;
        const distance = Math.abs(offset);
        // Wrap behind the cropped edges, never through the center of the arc.
        const visible = distance < 4.65;
        card.style.transform = `translate3d(${x.toFixed(2)}px, 0, ${z.toFixed(2)}px) rotateY(${(-angle * 180 / Math.PI).toFixed(2)}deg)`;
        card.style.opacity = String(Math.max(0, 1 - Math.max(0, distance - 3) / 1.65));
        card.style.visibility = visible ? 'visible' : 'hidden';
        card.style.pointerEvents = visible ? 'auto' : 'none';
        card.style.zIndex = String(Math.round(z + 1000));
      });
    };
    const tick = (now: number) => {
      const t = motion.matches ? 1 : Math.min(1, (now - started) / duration);
      const eased = t * t * t * (t * (t * 6 - 15) + 10);
      phase.current = from + (to - from) * eased;
      paint();
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    const resize = new ResizeObserver(() => { width = root.clientWidth; paint(); });
    resize.observe(root);
    paint();
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); };
  }, [active]);
  return track;
}

export default function App() {
  const stackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const arcTrack = useArcCarousel(active);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);
  const [edits, setEdits] = useState<Record<string, ProjectEdits>>({});
  const [saveMessage, setSaveMessage] = useState('');
  useEffect(() => {
    Promise.all([
      fetch(new URL('portfolio-defaults.json', document.baseURI)).then(response => response.ok ? response.json() as Promise<ProjectEdits[]> : []).catch(() => [] as ProjectEdits[]),
      loadEdits(),
    ]).then(([defaults, items]) => {
      const combined: Record<string, ProjectEdits> = Object.fromEntries(defaults.map(item => [item.id, item]));
      items.forEach(item => { combined[item.id] = { ...combined[item.id], ...item }; });
      setEdits(combined);
    }).catch(() => setSaveMessage('无法读取本地素材，请检查浏览器存储权限。'));
  }, []);
  const updateProject = async (id: string, patch: Partial<ProjectEdits>) => {
    try {
      const saved = await saveEdits(id, patch);
      setEdits(current => ({ ...current, [id]: { ...current[id], ...saved } }));
      setSaveMessage('已保存到当前浏览器');
    } catch {
      setSaveMessage('保存失败，请检查浏览器存储空间或权限后重试。');
    }
  };
  const resolved = (p: Project): Project => ({ ...p, ...(edits[p.id]?.title !== undefined ? { title: edits[p.id].title! } : {}), ...(edits[p.id]?.en !== undefined ? { en: edits[p.id].en! } : {}), ...(edits[p.id]?.description !== undefined ? { description: edits[p.id].description! } : {}) });
  const exportPortfolio = async () => {
    try {
      const records = Object.values(edits);
      const encode = async (asset: MediaAsset): Promise<{ name: string; type: string; data: string }> => {
        const file = asset instanceof File ? asset : new File([await (await fetch(new URL(asset.url, document.baseURI))).blob()], asset.name, { type: asset.type });
        return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, type: file.type, data: String(reader.result) });
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
        });
      };
      const data = await Promise.all(records.map(async record => ({
        ...record,
        cover: record.cover ? await encode(record.cover) : undefined,
        gallery: await Promise.all((record.gallery || []).map(encode)),
      })));
      const blob = new Blob([JSON.stringify({ version: 1, projects: data })], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'portfolio-backup.json';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setSaveMessage('备份已导出，请妥善保存。');
    } catch { setSaveMessage('导出失败，请检查浏览器存储权限。'); }
  };
  const validFiles = (files: File[]) => {
    const valid = files.filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'));
    if (valid.length !== files.length) setSaveMessage('请只选择图片或视频文件。');
    return valid;
  };
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (paused || selected || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setActive(i => (i + 1) % heroProjects.length), 4200);
    return () => clearInterval(timer);
  }, [paused, selected]);
  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', key);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', key); triggerRef.current?.focus(); };
  }, [selected]);
  useEffect(() => {
    const list = stackRef.current;
    if (!list) return;
    const cards = Array.from(list.querySelectorAll<HTMLElement>('.project-stack'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const update = () => {
      frame = 0;
      const base = window.innerWidth <= 650 ? 65 : 88;
      const stride = cards[0]?.offsetHeight || 1;
      const progress = (base - list.getBoundingClientRect().top) / stride;
      cards.forEach((card, i) => {
        const depth = reduced.matches ? 0 : Math.max(0, Math.min(cards.length - 1 - i, progress - i));
        card.style.setProperty('--stack-scale', String(1 - depth * 0.046));
        card.style.setProperty('--stack-dim', String(depth * 0.12));
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    reduced.addEventListener('change', schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      reduced.removeEventListener('change', schedule);
    };
  }, []);
  const open = (p: Project, el: HTMLElement) => { triggerRef.current = el; setSelected(p); };
  return <>
    <header className="nav-wrap"><nav className="nav glass" aria-label="主导航"><a className="logo" href="#top">YOUR NAME<span className="logo-dot">.</span></a><div className="nav-links"><a href="#work">作品</a><a href="#about">关于</a><a href="#contact">联系</a></div></nav></header>
    <main id="top">
      <section className="hero"><div className="hero-copy"><div className="availability"><span /> PORTFOLIO · OPEN TO WORK</div><h1>Ideas made<br/><em>visible.</em></h1><p>用影像、设计与故事，让想法拥有形状。</p><a className="hero-link" href="#work">探索精选作品</a></div>
        <div className="carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-label="精选作品轮播">
          <div className="carousel-fade left"/><div className="carousel-fade right"/>
          <div className="carousel-track" ref={arcTrack}>{heroProjects.map((p, i) => <button key={p.id} className={`carousel-item ${i === active ? 'is-active' : ''}`} onClick={(e) => { if (i === active) open(p, e.currentTarget); else setActive(i); }} aria-label={`查看 ${resolved(p).title}`}><Media project={resolved(p)} cover={edits[p.id]?.cover}/><span className="carousel-caption"><span>{resolved(p).en}</span></span></button>)}</div>
          <div className="carousel-controls"><button onClick={() => setActive((active + heroProjects.length - 1) % heroProjects.length)} aria-label="上一个作品">上一张</button><span>{String(active + 1).padStart(2, '0')} <i/> {String(heroProjects.length).padStart(2, '0')}</span><button onClick={() => setActive((active + 1) % heroProjects.length)} aria-label="下一个作品">下一张</button></div>
        </div><div className="scroll-note">SCROLL TO EXPLORE</div>
      </section>
      <section id="work" className="work-section"><div className="intro" id="about"><span className="eyebrow">A SELECTION OF WORK</span><h2>Thoughtful work.<br/><em>Made to be felt.</em></h2><p>从一个想法出发，到一段影像、一张图像或一份完整的表达。<br/>这里记录我对创意、技术与视觉叙事的探索。</p><span className="sample-note">以下项目为展示示例，可替换为你的真实作品</span></div>
        <div className="project-list" ref={stackRef}>{projects.map((p, i) => <article className="project-stack" key={p.id} style={{ '--index': i } as React.CSSProperties}><button className="project-card" onClick={(e) => open(p, e.currentTarget)} aria-label={`打开项目：${resolved(p).title}`}><Media project={resolved(p)} cover={edits[p.id]?.cover} className="project-media"/><div className="project-shade"/><div className="project-top"><span>{p.type}</span><span>SELECTED WORK / {p.id}</span></div><div className="project-bottom"><div><span className="project-en">{resolved(p).en}</span><h3>{resolved(p).title}</h3><p>{resolved(p).description}</p></div></div></button></article>)}</div>
      </section>
      <footer id="contact"><div className="footer-glow"/><span className="eyebrow">LET'S CREATE SOMETHING MEANINGFUL</span><h2>Have an idea?<br/><em>Let’s bring it to life.</em></h2><p>期待与你分享想法，也期待下一次有趣的合作。</p><a className="contact-button glass" href="mailto:hello@example.com">联系我</a><div className="footer-bottom"><span>© 2026 YOUR NAME · PORTFOLIO</span><span>示例邮箱，请替换为你的联系方式</span><a href="#top">回到顶部</a></div></footer>
    </main>
    {selected && <div className="modal-backdrop" onMouseDown={(e) => { if(e.target === e.currentTarget) setSelected(null); }}><div className="modal glass" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="modal-bar"><span>SELECTED WORK / {selected.id}</span><div className="modal-header-actions"><button type="button" onClick={() => void exportPortfolio()}>导出备份</button><button ref={closeRef} onClick={() => setSelected(null)} aria-label="关闭项目详情">关闭</button></div></div>
      <div className="cover-editor"><Media project={resolved(selected)} cover={edits[selected.id]?.cover} className="modal-media"/><label className="cover-replace" title="点击更换封面"><input type="file" aria-label="更换封面" accept="image/*,video/*" onChange={e => { const file = validFiles(Array.from(e.target.files || []))[0]; if (file) void updateProject(selected.id, { cover: file }); e.target.value = ''; }} /></label>{edits[selected.id]?.cover && <button type="button" className="cover-reset" onClick={() => void updateProject(selected.id, { cover: undefined })}>恢复示例封面</button>}</div>
      <div className="modal-body"><div className="editor-hint">点击文字编辑 · 支持图片和视频 · 内容保存在当前浏览器</div><div className="modal-heading"><div><span className="eyebrow">{selected.type} · 项目详情</span><h2 id="dialog-title" className="editable" contentEditable suppressContentEditableWarning role="textbox" aria-label="编辑项目标题" onBlur={e => void updateProject(selected.id, { title: e.currentTarget.textContent?.trim() || selected.title })}>{resolved(selected).title}</h2><em className="editable" contentEditable suppressContentEditableWarning role="textbox" aria-label="编辑英文标题" onBlur={e => void updateProject(selected.id, { en: e.currentTarget.textContent?.trim() || selected.en })}>{resolved(selected).en}</em></div><div className="tags">{selected.tags.map(t => <span key={t}>{t}</span>)}</div></div>
      <div className="modal-copy"><p className="editable" contentEditable suppressContentEditableWarning role="textbox" aria-label="编辑项目简介" onBlur={e => void updateProject(selected.id, { description: e.currentTarget.textContent?.trim() || selected.description })}>{resolved(selected).description}</p><p className="editable" contentEditable suppressContentEditableWarning role="textbox" aria-label="编辑项目说明" onBlur={e => void updateProject(selected.id, { story: e.currentTarget.textContent?.trim() || '' })}>{edits[selected.id]?.story ?? '点击这里填写项目背景、创作过程或成果。'}</p></div>
      <div className="detail-gallery">{(edits[selected.id]?.gallery || []).map((file, i) => <DetailAsset key={`${i}-${file.name}-${file instanceof File ? file.lastModified : file.url}`} file={file} index={i} onReplace={replacement => { const files = validFiles([replacement]); if (!files.length) return; const gallery = [...(edits[selected.id]?.gallery || [])]; gallery[i] = files[0]; void updateProject(selected.id, { gallery }); }} onRemove={() => { const gallery = [...(edits[selected.id]?.gallery || [])]; gallery.splice(i, 1); void updateProject(selected.id, { gallery }); }} />)}</div>
      <div className="add-material"><label className="add-material-button">添加素材<input type="file" accept="image/*,video/*" multiple onChange={e => { const files = validFiles(Array.from(e.target.files || [])); if (files.length) void updateProject(selected.id, { gallery: [...(edits[selected.id]?.gallery || []), ...files] }); e.target.value = ''; }} /></label><span>图片和视频可多选，按选择顺序添加</span></div><div className="save-message" role="status">{saveMessage}</div>
      </div></div></div>}
  </>;
}
