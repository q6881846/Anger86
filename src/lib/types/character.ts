export type RoleType =
  | '主角'
  | '核心角色'
  | '配角'
  | '反派'
  | '功能性角色'
  | '工具人';

export interface CharacterAbility {
  name: string;
  desc: string;
  type: '主动' | '被动' | '限制' | '';
}

export interface CharacterStatus {
  mood: string;
  health: string;
  location: string;
}

export interface Character {
  role: RoleType;
  name: string;
  surfaceIdentity: string; // 表面身份（他人眼中的标签）
  trueIdentity: string; // 真实身份（隐藏的一面）
  innerConflict: string; // 内在冲突（欲望 vs 恐惧）
  abilities: CharacterAbility[]; // 能力/特长（标签化数组）
  status: CharacterStatus; // 当前状态 / 属性表
  plotFunction: string; // 剧情功能
}

export const ROLE_ORDER: Record<RoleType, number> = {
  主角: 0,
  核心角色: 1,
  反派: 2,
  配角: 3,
  功能性角色: 4,
  工具人: 5,
};

export const roleColorMap: Record<RoleType, string> = {
  主角: 'bg-[#d4a657] text-[#0a0e1a]',
  核心角色: 'bg-[#d4a657]/20 text-[#d4a657]',
  配角: 'bg-[#7a9ef0]/20 text-[#7a9ef0]',
  反派: 'bg-[#e85d68]/20 text-[#e85d68]',
  功能性角色: 'bg-gray-700 text-gray-300',
  工具人: 'bg-[#8a6cff]/20 text-[#8a6cff]',
};
