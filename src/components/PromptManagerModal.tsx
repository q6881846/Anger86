import { useEffect, useState, useCallback } from 'react';
import { usePromptModalStore } from '@/lib/store/promptModalStore';
import { useUIStore } from '@/lib/store/uiStore';
import { listPrompts, getRawPrompt, updatePrompt, type PromptMeta, type PromptTemplate } from '@/lib/prompts/prompt-api';

const OUTPUT_TYPES: Array<PromptTemplate['outputType']> = ['markdown', 'json', 'stream'];

export function PromptManagerModal() {
  const { open, initialStepKey, closeModal } = usePromptModalStore();
  const showToast = useUIStore((s) => s.showToast);

  const [list, setList] = useState<PromptMeta[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [tpl, setTpl] = useState<PromptTemplate | null>(null);
  const [name, setName] = useState('');
  const [system, setSystem] = useState('');
  const [user, setUser] = useState('');
  const [outputType, setOutputType] = useState<PromptTemplate['outputType']>('markdown');

  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);

  // 加载列表
  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const data = await listPrompts();
      setList(data.sort((a, b) => a.id - b.id));
    } catch (e) {
      showToast('提示词列表加载失败');
    } finally {
      setListLoading(false);
    }
  }, [showToast]);

  // 打开时加载列表，并自动选中指定 step
  useEffect(() => {
    if (!open) return;
    loadList();
    setSelectedKey(initialStepKey || null);
    setTpl(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 选中某个 prompt 时拉取详情
  useEffect(() => {
    if (!open || !selectedKey) {
      setTpl(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    getRawPrompt(selectedKey)
      .then((raw) => {
        if (cancelled) return;
        const t = raw as PromptTemplate;
        setTpl(t);
        setName(t.name);
        setSystem(t.system || '');
        setUser(t.user || '');
        setOutputType(t.outputType || 'markdown');
      })
      .catch(() => {
        if (!cancelled) showToast('提示词加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedKey, open, showToast]);

  if (!open) return null;

  const handleSave = async () => {
    if (!selectedKey) return;
    setSaving(true);
    try {
      await updatePrompt(selectedKey, { name, system, user, outputType });
      showToast('已保存 ✦');
    } catch (e) {
      showToast(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    closeModal();
  };

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5,8,16,0.78)',
        backdropFilter: 'blur(6px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        animation: 'fade-up 0.25s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1080px, 100%)',
          maxHeight: '88vh',
          background: 'var(--ink-card)',
          border: '1px solid var(--ink-border)',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 头部 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 22px',
            borderBottom: '1px solid var(--ink-border)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#e8e4d8' }}>
            提示词管理 <span style={{ fontWeight: 400, color: '#6a7388', fontSize: 13 }}>（点击模块查看并编辑）</span>
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--ink-border)',
              color: '#8a93a8',
              borderRadius: 8,
              width: 34,
              height: 34,
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {/* 主体：左列表 + 右编辑 */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* 左：列表 */}
          <div
            style={{
              width: 280,
              borderRight: '1px solid var(--ink-border)',
              overflowY: 'auto',
              padding: 12,
              flexShrink: 0,
            }}
          >
            {listLoading ? (
              <div style={{ color: '#6a7388', fontSize: 13, padding: 12 }}>加载中…</div>
            ) : (
              list.map((p) => {
                const active = p.key === selectedKey;
                return (
                  <button
                    key={p.key}
                    onClick={() => setSelectedKey(p.key)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      marginBottom: 6,
                      borderRadius: 10,
                      border: active
                        ? '1px solid rgba(212,166,87,0.5)'
                        : '1px solid transparent',
                      background: active ? 'rgba(212,166,87,0.12)' : 'var(--ink-surface)',
                      color: active ? '#f0c674' : '#c7ccd9',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#6a7388', marginTop: 2 }}>
                      {p.key} · {p.outputType}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* 右：编辑区 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {!selectedKey ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6a7388',
                  fontSize: 14,
                }}
              >
                从左侧选择一个模块提示词进行查看 / 编辑
              </div>
            ) : loadingDetail ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6a7388' }}>
                加载中…
              </div>
            ) : tpl ? (
              <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* 名称 */}
                <div>
                  <label style={labelStyle}>名称</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* 输出类型 */}
                <div>
                  <label style={labelStyle}>输出类型</label>
                  <select
                    value={outputType}
                    onChange={(e) => setOutputType(e.target.value as PromptTemplate['outputType'])}
                    style={inputStyle}
                  >
                    {OUTPUT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* 变量（只读展示） */}
                <div>
                  <label style={labelStyle}>可用变量</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {tpl.variables.length === 0 ? (
                      <span style={{ color: '#6a7388', fontSize: 12 }}>无</span>
                    ) : (
                      tpl.variables.map((v) => (
                        <span
                          key={v}
                          style={{
                            fontSize: 12,
                            padding: '3px 10px',
                            borderRadius: 20,
                            background: 'rgba(212,166,87,0.12)',
                            color: '#f0c674',
                            border: '1px solid rgba(212,166,87,0.25)',
                          }}
                        >
                          {`{{${v}}}`}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* System */}
                <div>
                  <label style={labelStyle}>System 提示词</label>
                  <textarea
                    value={system}
                    onChange={(e) => setSystem(e.target.value)}
                    style={{ ...textareaStyle, minHeight: 120 }}
                    placeholder="（留空则使用默认）"
                  />
                </div>

                {/* User */}
                <div>
                  <label style={labelStyle}>User 提示词</label>
                  <textarea
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    style={{ ...textareaStyle, minHeight: 260 }}
                  />
                </div>

                {/* 保存 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingBottom: 4 }}>
                  <button
                    onClick={handleClose}
                    style={{
                      padding: '9px 18px',
                      borderRadius: 8,
                      border: '1px solid var(--ink-border)',
                      background: 'var(--ink-surface)',
                      color: '#8a93a8',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      padding: '9px 22px',
                      borderRadius: 8,
                      border: 'none',
                      background: saving ? '#2a3650' : 'linear-gradient(135deg, #d4a657, #f0c674)',
                      color: saving ? '#6a7388' : '#0a0e1a',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: saving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {saving ? '保存中…' : '保存修改'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e85d68' }}>
                该提示词不存在或加载失败
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#8a93a8',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid var(--ink-border)',
  background: 'var(--ink-surface)',
  color: '#e8e4d8',
  fontSize: 13,
  outline: 'none',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  borderRadius: 8,
  border: '1px solid var(--ink-border)',
  background: 'var(--ink-surface)',
  color: '#e8e4d8',
  fontSize: 13,
  lineHeight: 1.7,
  resize: 'vertical',
  outline: 'none',
  fontFamily: '"Noto Sans SC", monospace',
};
