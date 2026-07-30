import React from 'react';
import {
  Character,
  RoleType,
  roleColorMap,
} from '@/lib/types/character';

interface CharacterCardProps {
  character: Character;
  roleNumber?: number; // 仅"配角"使用，用于显示 配角 #N
  onEdit?: () => void;
  onDelete?: () => void;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  roleNumber,
  onEdit,
  onDelete,
}) => {
  const role = character.role as RoleType;
  const roleClass = roleColorMap[role] || roleColorMap['配角'];
  const roleLabel =
    role === '配角' && roleNumber ? `配角 #${roleNumber}` : role;

  const hasSurface = !!character.surfaceIdentity;
  const hasTrue = !!character.trueIdentity;
  const hasConflict = !!character.innerConflict;
  const hasAbilities = character.abilities && character.abilities.length > 0;
  const hasStatus =
    character.status &&
    (character.status.mood || character.status.health || character.status.location);

  return (
    <div className="bg-[var(--ink-surface)] border border-[var(--ink-border)] rounded-xl p-4 flex flex-col h-full hover:border-[#7a9ef0]/40 transition-colors">
      {/* Header: 名字 + 角色标签 + 操作 */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <h4 className="text-white font-medium text-base truncate">
          {character.name || '未命名'}
        </h4>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-medium ${roleClass}`}
          >
            {roleLabel}
          </span>
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="编辑"
              className="text-gray-500 hover:text-white transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="删除"
              className="text-gray-500 hover:text-[#e85d68] transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 核心信息：表面 / 真实 / 冲突 */}
      <div className="space-y-2.5 flex-1">
        {(hasSurface || hasTrue || hasConflict) && (
          <>
            {hasSurface && (
              <InfoRow label="表面" content={character.surfaceIdentity} />
            )}
            {hasTrue && (
              <InfoRow label="真实" content={character.trueIdentity} highlight />
            )}
            {hasConflict && (
              <InfoRow label="冲突" content={character.innerConflict} />
            )}
          </>
        )}
        {!hasSurface && !hasTrue && !hasConflict && (
          <div className="text-[11px] text-gray-600 italic">
            （暂无设定，点击 ✎ 编辑）
          </div>
        )}
      </div>

      {/* 能力标签 */}
      {hasAbilities && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="text-[10px] text-[#7a9ef0] mb-1.5 font-medium">
            能力/特长
          </div>
          <div className="flex flex-wrap gap-1.5">
            {character.abilities.map((ab, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-[#7a9ef0]/10 border border-[#7a9ef0]/20 text-[11px] text-[#7a9ef0]"
                title={ab.desc || ''}
              >
                【{ab.name}】
                {ab.type ? (
                  <span className="text-gray-400 ml-0.5">{ab.type}</span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 当前状态 / 属性表 */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="text-[10px] text-gray-500 mb-1.5">当前状态 / 属性表</div>
        {hasStatus ? (
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {character.status.mood && (
              <StatusBadge label="心情" value={character.status.mood} />
            )}
            {character.status.health && (
              <StatusBadge label="状态" value={character.status.health} />
            )}
            {character.status.location && (
              <StatusBadge label="位置" value={character.status.location} />
            )}
          </div>
        ) : (
          <div className="text-[11px] text-gray-600 italic py-1">
            暂无属性 (如：心情、修为)
          </div>
        )}
      </div>

      {/* 剧情功能 */}
      {character.plotFunction && (
        <div className="mt-2 text-[10px] text-gray-600 truncate">
          功能: {character.plotFunction}
        </div>
      )}
    </div>
  );
};

const InfoRow: React.FC<{
  label: string;
  content: string;
  highlight?: boolean;
}> = ({ label, content, highlight }) => (
  <div className="text-[11px] leading-relaxed">
    <span
      className={`font-medium ${
        highlight ? 'text-[#e85d68]' : 'text-gray-400'
      }`}
    >
      {label}:
    </span>
    <span className="text-gray-300 ml-1">{content}</span>
  </div>
);

const StatusBadge: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="bg-[#0a0e1a] rounded px-2 py-1 border border-white/5">
    <span className="text-gray-500">{label}:</span>
    <span className="text-gray-300 ml-1">{value}</span>
  </div>
);
