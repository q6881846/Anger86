import { useMemo, useState } from 'react';
import { useParamsModalStore } from '@/lib/store/paramsModalStore';
import { useParamsStore } from '@/lib/store/paramsStore';
import { useUIStore } from '@/lib/store/uiStore';
import {
  BUILT_IN_PRESETS,
  PARAM_METAS,
  type AdvancedParams,
  type ParamMeta,
} from '@/lib/types/advanced-params';

const STEP_KEYS = Array.from({ length: 20 }, (_, i) => `step${i + 1}`);

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'rgba(6,9,18,0.72)', backdropFilter: 'blur(6px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
};
const panelStyle: React.CSSProperties = {
  width: 'min(720px, 96vw)', maxHeight: '88vh', overflowY: 'auto',
  background: 'linear-gradient(160deg, rgba(22,27,46,0.98), rgba(14,18,32,0.98))',
  border: '1px solid rgba(212,166,87,0.22)', borderRadius: 16,
  boxShadow: '0 24px 80px rgba(0,0,0,0.6)', padding: '24px 28px',
};
const gold = '#d4a657';
const goldSoft = 'rgba(212,166,87,0.15)';
const goldBorder = 'rgba(212,166,87,0.3)';
const textColor = '#e8e4d8';
const muted = '#8b93a7';

function SliderRow({
  meta,
  value,
  overridden,
  onReset,
  onChange,
}: {
  meta: ParamMeta;
  value: number;
  overridden?: boolean;
  onReset?: () => void;
  onChange: (v: number) => void;
}) {
  const num = typeof value === 'number' ? value : meta.defaultValue;
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: textColor }}>{meta.label}</span>
          {overridden && (
            <span style={{ fontSize: 10, color: gold, border: `1px solid ${goldBorder}`, borderRadius: 4, padding: '1px 5px' }}>
              步骤覆盖
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontFamily: 'monospace', color: gold, minWidth: 44, textAlign: 'right' }}>
            {meta.type === 'number' ? num : num.toFixed(2)}
          </span>
          {overridden && onReset && (
            <button
              onClick={onReset}
              title="恢复默认覆盖"
              style={{ background: 'transparent', border: 'none', color: muted, cursor: 'pointer', fontSize: 13 }}
            >
              ↺
            </button>
          )}
        </div>
      </div>
      <div style={{ fontSize: 12, color: muted, marginTop: 2, marginBottom: 6 }}>{meta.description}</div>
      {meta.type === 'slider' ? (
        <>
          <input
            type="range"
            min={meta.min}
            max={meta.max}
            step={meta.step}
            value={num}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{ width: '100%', accentColor: gold }}
          />
          {meta.marks && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              {Object.entries(meta.marks).map(([k, label]) => (
                <span key={k} style={{ fontSize: 10, color: muted }}>{label}</span>
              ))}
            </div>
          )}
        </>
      ) : (
        <input
          type="number"
          min={meta.min}
          max={meta.max}
          step={meta.step}
          value={num}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            width: '100%', marginTop: 4, padding: '8px 10px', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${goldBorder}`,
            borderRadius: 8, color: textColor, fontSize: 14, fontFamily: 'monospace',
          }}
        />
      )}
    </div>
  );
}

export function AdvancedParamsPanel() {
  const { open, closeModal } = useParamsModalStore();
  const showToast = useUIStore((s) => s.showToast);

  const activePresetId = useParamsStore((s) => s.activePresetId);
  const customPresets = useParamsStore((s) => s.customPresets);
  const globalDefault = useParamsStore((s) => s.globalDefault);
  const templateOverrides = useParamsStore((s) => s.templateOverrides);

  const setBaseParam = useParamsStore((s) => s.setBaseParam);
  const setTemplateParam = useParamsStore((s) => s.setTemplateParam);
  const resetTemplateParam = useParamsStore((s) => s.resetTemplateParam);
  const clearTemplateOverrides = useParamsStore((s) => s.clearTemplateOverrides);
  const savePreset = useParamsStore((s) => s.savePreset);
  const deletePreset = useParamsStore((s) => s.deletePreset);
  const selectPreset = useParamsStore((s) => s.selectPreset);
  const resetAll = useParamsStore((s) => s.resetAll);

  const [selectedStep, setSelectedStep] = useState<string>(STEP_KEYS[0]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDesc, setPresetDesc] = useState('');

  const baseEffective = useMemo<AdvancedParams>(() => {
    const active =
      activePresetId &&
      [...BUILT_IN_PRESETS, ...customPresets].find((p) => p.id === activePresetId);
    return { ...(active ? active.params : globalDefault) };
  }, [activePresetId, customPresets, globalDefault]);

  const stepOverride = templateOverrides[selectedStep] || {};

  if (!open) return null;

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      showToast('请填写预设名称');
      return;
    }
    savePreset(presetName, presetDesc);
    setPresetName('');
    setPresetDesc('');
    setShowSaveForm(false);
    showToast('预设已保存');
  };

  return (
    <div style={overlayStyle} onClick={closeModal}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: gold, fontFamily: '"Noto Serif SC", serif' }}>
              高级参数
            </h2>
            <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>
              采样参数自定义 · 预设管理 · 按步骤覆盖（自动保存）
            </div>
          </div>
          <button
            onClick={closeModal}
            style={{ background: 'transparent', border: 'none', color: muted, fontSize: 22, cursor: 'pointer' }}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        {/* 预设选择 */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 13, color: textColor, fontWeight: 600, marginBottom: 8 }}>参数预设</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <PresetChip
              label="全局默认"
              active={!activePresetId}
              onClick={() => selectPreset(undefined)}
            />
            {[...BUILT_IN_PRESETS, ...customPresets].map((p) => (
              <PresetChip
                key={p.id}
                label={p.name}
                active={activePresetId === p.id}
                custom={!p.builtIn}
                onDelete={p.builtIn ? undefined : () => {
                  if (confirm(`删除预设「${p.name}」？`)) deletePreset(p.id);
                }}
                onClick={() => selectPreset(p.id)}
              />
            ))}
            <button
              onClick={() => setShowSaveForm((v) => !v)}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                background: goldSoft, border: `1px dashed ${goldBorder}`, color: gold,
              }}
            >
              + 存为预设
            </button>
          </div>

          {showSaveForm && (
            <div style={{ marginTop: 10, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: `1px solid ${goldBorder}` }}>
              <input
                placeholder="预设名称"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                style={inputStyle}
              />
              <textarea
                placeholder="描述（可选）"
                value={presetDesc}
                onChange={(e) => setPresetDesc(e.target.value)}
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', marginTop: 8 }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={handleSavePreset} style={primaryBtn}>保存</button>
                <button onClick={() => setShowSaveForm(false)} style={ghostBtn}>取消</button>
              </div>
            </div>
          )}
        </div>

        {/* 全局/预设参数滑块 */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: textColor, fontWeight: 600, marginBottom: 4 }}>
            当前参数
            <span style={{ fontSize: 11, color: muted, fontWeight: 400, marginLeft: 8 }}>
              {activePresetId ? '（编辑将修改所选预设）' : '（编辑将修改全局默认）'}
            </span>
          </div>
          {PARAM_METAS.map((meta) => (
            <SliderRow
              key={String(meta.key)}
              meta={meta}
              value={(baseEffective[meta.key] as number) ?? meta.defaultValue}
              onChange={(v) => setBaseParam(meta.key, v)}
            />
          ))}
        </div>

        {/* 按步骤覆盖 */}
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 13, color: textColor, fontWeight: 600 }}>
              按步骤覆盖
              <span style={{ fontSize: 11, color: muted, fontWeight: 400, marginLeft: 8 }}>
                仅对指定步骤生效，叠加在预设之上
              </span>
            </div>
            <button
              onClick={() => {
                if (Object.keys(stepOverride).length && confirm('清除该步骤的全部覆盖？')) {
                  clearTemplateOverrides(selectedStep);
                }
              }}
              style={ghostBtn}
            >
              清除本步骤覆盖
            </button>
          </div>
          <select
            value={selectedStep}
            onChange={(e) => setSelectedStep(e.target.value)}
            style={{ ...inputStyle, fontFamily: 'monospace' }}
          >
            {STEP_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
                {templateOverrides[k] ? ' ★' : ''}
              </option>
            ))}
          </select>
          <div style={{ marginTop: 4 }}>
            {PARAM_METAS.map((meta) => {
              const overridden = stepOverride[meta.key] !== undefined;
              return (
                <SliderRow
                  key={String(meta.key)}
                  meta={meta}
                  value={(overridden ? stepOverride[meta.key] : baseEffective[meta.key]) as number}
                  overridden={overridden}
                  onReset={() => resetTemplateParam(selectedStep, meta.key)}
                  onChange={(v) => setTemplateParam(selectedStep, meta.key, v)}
                />
              );
            })}
          </div>
        </div>

        {/* 底部 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, gap: 10 }}>
          <button
            onClick={() => {
              if (confirm('重置全部参数为出厂默认（含预设与步骤覆盖）？')) {
                resetAll();
                showToast('已恢复默认');
              }
            }}
            style={ghostBtn}
          >
            恢复默认
          </button>
          <button onClick={closeModal} style={primaryBtn}>完成</button>
        </div>
      </div>
    </div>
  );
}

function PresetChip({
  label,
  active,
  custom,
  onDelete,
  onClick,
}: {
  label: string;
  active: boolean;
  custom?: boolean;
  onDelete?: () => void;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
        background: active ? goldSoft : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? gold : 'rgba(255,255,255,0.1)'}`,
        color: active ? gold : textColor,
        transition: 'all 0.2s',
      }}
    >
      <span>{label}</span>
      {custom && onDelete && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{ color: muted, fontSize: 14, lineHeight: 1 }}
          title="删除预设"
        >
          ×
        </span>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)', border: `1px solid ${goldBorder}`,
  borderRadius: 8, color: textColor, fontSize: 14,
};
const primaryBtn: React.CSSProperties = {
  padding: '8px 18px', borderRadius: 8, fontSize: 14, cursor: 'pointer',
  background: gold, border: 'none', color: '#1a1408', fontWeight: 600,
};
const ghostBtn: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
  background: 'transparent', border: `1px solid ${goldBorder}`, color: gold,
};
