export type UserState = 'default' | 'talking_to_admin';

export const userStates = new Map<number, UserState>();
export const adminThreadMap = new Map<number, number>(); // adminMsgId -> userId
