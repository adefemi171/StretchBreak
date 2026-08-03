import type { TeamMember } from '../utils/types';

const STORAGE_KEY = 'stretchbreak-team';

export const getAllTeamMembers = (): TeamMember[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const saveTeamMember = (member: TeamMember): void => {
  const members = getAllTeamMembers();
  const existingIndex = members.findIndex(m => m.id === member.id);
  
  if (existingIndex >= 0) {
    members[existingIndex] = member;
  } else {
    members.push(member);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
};

export const deleteTeamMember = (id: string): void => {
  const members = getAllTeamMembers();
  const filtered = members.filter(m => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const createTeamMemberId = (): string => {
  return `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getTeamTimeOff = (): Set<string> => {
  const members = getAllTeamMembers();
  const allTimeOff = new Set<string>();
  
  members.forEach(member => {
    member.timeOff.forEach(date => {
      if (date && typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
        allTimeOff.add(date.trim());
      }
    });
  });
  
  return allTimeOff;
};

export const getConflictingTeamMembers = (dates: string[]): Array<{ member: TeamMember; conflictingDates: string[] }> => {
  const members = getAllTeamMembers();
  const conflicts: Array<{ member: TeamMember; conflictingDates: string[] }> = [];
  
  members.forEach(member => {
    const conflictingDates = dates.filter(date => member.timeOff.includes(date));
    if (conflictingDates.length > 0) {
      conflicts.push({ member, conflictingDates });
    }
  });
  
  return conflicts;
};
