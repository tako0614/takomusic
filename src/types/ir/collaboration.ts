// Collaboration types

export interface ProjectNote {
  type: 'projectNote';
  id: string;
  author: string;
  timestamp: number;
  tick?: number;                   // Optional position reference
  trackId?: string;
  text: string;
  resolved: boolean;
  replies?: ProjectNote[];
}

export interface Collaborator {
  type: 'collaborator';
  id: string;
  name: string;
  email?: string;
  role: 'owner' | 'editor' | 'viewer';
  color: string;                   // For cursor/selection color
}
