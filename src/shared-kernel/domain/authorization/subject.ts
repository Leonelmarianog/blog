export type AppAction = 'read' | 'create' | 'update' | 'delete' | 'manage';
export type AppSubject = 'User' | 'Session' | 'Profile' | 'Post' | 'Asset';
export type AppSubjectInstance = { id: string } & Record<string, unknown>;
