/**
 * Shared Draft Isolation & Participant ACL Service
 * 
 * Rules:
 * 1. A document is readable by a participant if the participant's groups intersect the document's allowedGroups.
 * 2. The shared draft may ONLY use documents readable by EVERY invited participant of the meeting.
 */

export interface ParticipantWithGroups {
  name?: string;
  email: string;
  groups: string[];
}

/**
 * Checks whether a document is readable by a single participant based on group intersection.
 */
export function isDocumentReadableByParticipant(
  docAllowedGroups: string[],
  participantGroups: string[]
): boolean {
  if (!docAllowedGroups || docAllowedGroups.length === 0) return false;
  if (!participantGroups || participantGroups.length === 0) return false;
  return docAllowedGroups.some(g => participantGroups.includes(g));
}

/**
 * Checks whether a document is permitted to be included or referenced in the meeting's shared draft.
 * The shared draft may ONLY use documents readable by EVERY invited participant of the meeting.
 */
export function isDocumentAllowedInSharedDraft(
  docAllowedGroups: string[],
  invitedParticipants: { groups: string[] }[]
): boolean {
  if (!invitedParticipants || invitedParticipants.length === 0) {
    return true;
  }
  return invitedParticipants.every(participant =>
    isDocumentReadableByParticipant(docAllowedGroups, participant.groups)
  );
}

/**
 * Given a list of documents and meeting participants, returns only those documents
 * that can be safely used in the shared draft without leaking restricted policy knowledge.
 */
export function getDocumentsPermittedInSharedDraft<T extends { allowedGroups: string[] }>(
  documents: T[],
  invitedParticipants: { groups: string[] }[]
): T[] {
  return documents.filter(doc => isDocumentAllowedInSharedDraft(doc.allowedGroups, invitedParticipants));
}
