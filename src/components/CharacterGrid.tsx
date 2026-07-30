import React, { useState } from 'react';
import {
  Character,
  CharacterAbility,
  CharacterStatus,
  RoleType,
  ROLE_ORDER,
} from '@/lib/types/character';
import { CharacterCard } from './CharacterCard';

interface CharacterGridProps {
  characters: Character[];
  onUpdate: (idx: number, patch: Partial<Character>) => void;
  onDelete: (idx: number) => void;
  onAdd: () => void;
}

const ROLE_OPTIONS: RoleType[] = [
  '主角',
  '核心角色',
  '配角',
  '反派',
  '功能性角色',
  '工具人',
];

export const CharacterGrid: React.FC<CharacterGridProps> = ({
  characters,
  onUpdate,
  onDelete,
  onAdd,
}) => {
  // 排序：主角在前，配角按出场序；记录原始索引以便编辑/删除
  const indexed = characters.map((c, i) => ({ c, i }));
  indexed.sort((a, b) => {
    const ra = ROLE_ORDER[a.c.role] ?? 9;
    const rb = ROLE_ORDER[b.c.role] ?? 9;
    if (ra !== rb) return ra - rb;
    return a.i - b.i;
  });
  let pc = 0;
  const items = indexed.map(({ c, i }) => ({
    character: c,
    originalIdx: i,
    roleNumber: c.role === '配角' ? ++pc : 0,
  }));

  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<Character | null>(null);

  const openEdit = (originalIdx: number) => {
    setForm(characters[originalIdx]);
    setEditIdx(originalIdx);
  };

  const closeEdit = () => {
    setEditIdx(null);
    setForm(null);
  };

  const saveEdit = () => {
    if (editIdx === null || !form) return;
    onUpdate(editIdx, { ...form });
    closeEdit();
  };

  const updateAbility = (ai: number, patch: Partial<CharacterAbility>) => {
    if (!form) return;
    const next = form.abilities.map((a, i) => (i === ai ? { ...a, ...patch } : a));
    setForm({ ...form, abilities: next });
  };
  const addAbility = () => {
    if (!form) return;
    setForm({
      ...form,
      abilities: [...form.abilities, { name: '', desc: '', type: '' }],
    });
  };
  const removeAbility = (ai: number) => {
    if (!form) return;
    setForm({ ...form, abilities: form.abilities.filter((_, i) => i !== ai) });
  };
  const updateStatus = (patch: Partial<CharacterStatus>) => {
    if (!form) return;
    setForm({ ...form, status: { ...form.status, ...patch } });
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
        {items.map(({ character, originalIdx, roleNumber }) => (
          <CharacterCard
            key={originalIdx}
            character={character}
            roleNumber={roleNumber}
            onEdit={() => openEdit(originalIdx)}
            onDelete={() => onDelete(originalIdx)}
          />
        ))}

        {/* 添加按钮 */}
        <button
          onClick={onAdd}
          className="border border-dashed border-white/10 rounded-xl flex items-center justify-center min-h-[280px] text-gray-600 hover:text-gray-400 hover:border-white/20 transition-colors"
        >
          <div className="text-center">
            <div className="text-2xl mb-1">+</div>
            <div className="text-sm">手动添加角色</div>
          </div>
        </button>
      </div>

      {/* 编辑弹窗 */}
      {editIdx !== null && form && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={closeEdit}
        >
          <div
            className="bg-[var(--ink-card)] border border-[var(--ink-border)] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">编辑角色</h3>
              <button
                onClick={closeEdit}
                className="text-gray-500 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* 名字 + 角色类型 */}
            <div className="flex gap-3 mb-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="角色名"
                className="flex-1 bg-[var(--ink-surface)] border border-[var(--ink-border)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#d4a657]"
              />
              <select
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as RoleType })
                }
                className="bg-[var(--ink-surface)] border border-[var(--ink-border)] rounded-lg px-3 py-2 text-sm text-[#d4a657] outline-none"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* 表面 / 真实 / 冲突 */}
            <LabeledInput
              label="表面身份"
              value={form.surfaceIdentity}
              onChange={(v) => setForm({ ...form, surfaceIdentity: v })}
              placeholder="他人眼中的标签（如：西街铁匠）"
            />
            <LabeledInput
              label="真实身份"
              value={form.trueIdentity}
              onChange={(v) => setForm({ ...form, trueIdentity: v })}
              placeholder="隐藏的一面（如：元婴大佬）"
            />
            <LabeledInput
              label="内在冲突"
              value={form.innerConflict}
              onChange={(v) => setForm({ ...form, innerConflict: v })}
              placeholder="欲望 vs 恐惧"
            />
            <LabeledInput
              label="剧情功能"
              value={form.plotFunction}
              onChange={(v) => setForm({ ...form, plotFunction: v })}
              placeholder="推动主线 / 制造冲突 / 提供信息…"
            />

            {/* 能力列表 */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-[#7a9ef0]">
                  能力/特长
                </span>
                <button
                  onClick={addAbility}
                  className="text-[11px] text-[#7a9ef0] hover:underline"
                >
                  + 添加能力
                </button>
              </div>
              {form.abilities.map((ab, ai) => (
                <div key={ai} className="flex gap-2 mb-1.5 items-center">
                  <input
                    value={ab.name}
                    onChange={(e) => updateAbility(ai, { name: e.target.value })}
                    placeholder="能力名"
                    className="flex-1 bg-[var(--ink-surface)] border border-[var(--ink-border)] rounded px-2 py-1 text-xs text-white outline-none"
                  />
                  <input
                    value={ab.desc}
                    onChange={(e) => updateAbility(ai, { desc: e.target.value })}
                    placeholder="一句话描述"
                    className="flex-1 bg-[var(--ink-surface)] border border-[var(--ink-border)] rounded px-2 py-1 text-xs text-gray-300 outline-none"
                  />
                  <select
                    value={ab.type}
                    onChange={(e) =>
                      updateAbility(ai, {
                        type: e.target.value as CharacterAbility['type'],
                      })
                    }
                    className="bg-[var(--ink-surface)] border border-[var(--ink-border)] rounded px-1 py-1 text-xs text-gray-300 outline-none"
                  >
                    <option value="">类型</option>
                    <option value="主动">主动</option>
                    <option value="被动">被动</option>
                    <option value="限制">限制</option>
                  </select>
                  <button
                    onClick={() => removeAbility(ai)}
                    className="text-gray-500 hover:text-[#e85d68] text-sm px-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* 状态/属性表 */}
            <div className="mb-4">
              <div className="text-[11px] font-medium text-gray-500 mb-1.5">
                当前状态 / 属性表
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={form.status.mood}
                  onChange={(e) => updateStatus({ mood: e.target.value })}
                  placeholder="心情"
                  className="bg-[var(--ink-surface)] border border-[var(--ink-border)] rounded px-2 py-1 text-xs text-gray-300 outline-none"
                />
                <input
                  value={form.status.health}
                  onChange={(e) => updateStatus({ health: e.target.value })}
                  placeholder="状态/修为"
                  className="bg-[var(--ink-surface)] border border-[var(--ink-border)] rounded px-2 py-1 text-xs text-gray-300 outline-none"
                />
                <input
                  value={form.status.location}
                  onChange={(e) => updateStatus({ location: e.target.value })}
                  placeholder="位置"
                  className="bg-[var(--ink-surface)] border border-[var(--ink-border)] rounded px-2 py-1 text-xs text-gray-300 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={closeEdit}
                className="px-4 py-2 rounded-lg border border-[var(--ink-border)] text-sm text-gray-300 hover:bg-white/5"
              >
                取消
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 rounded-lg bg-[#7a9ef0] hover:bg-[#5a7ed0] text-white text-sm"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LabeledInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
  <div className="mb-3">
    <div className="text-[11px] font-medium text-gray-400 mb-1">{label}</div>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[var(--ink-surface)] border border-[var(--ink-border)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#d4a657]"
    />
  </div>
);
