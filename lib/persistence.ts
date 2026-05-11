import { Preferences } from '@capacitor/preferences';

/**
 * +Vaquejada — Sistema de Persistência de Estado
 * Garante que o app retorne exatamente para onde estava após multitarefa ou reinício.
 */

export enum PersistenceKey {
  APP_CURRENT_VIEW = 'app_current_view',
  AUCTION_STATE = 'auction_module_state',
  MARKET_DRAFT = 'market_create_draft',
  SOCIAL_ACTIVE_TAB = 'social_active_tab',
  PROFILE_ACTIVE_TAB = 'profile_active_tab',
  LAST_EVENT = 'arena_last_event',
  LAST_STORE = 'arena_last_store',
  LAST_VIEW = 'arena_last_view'
}

export const persistence = {
  /**
   * Salva um valor no armazenamento persistente
   */
  async save(key: PersistenceKey | string, value: any): Promise<void> {
    try {
      const data = typeof value === 'string' ? value : JSON.stringify(value);
      await Preferences.set({
        key,
        value: data
      });
    } catch (err) {
      console.warn(`Error saving persistence key ${key}:`, err);
    }
  },

  /**
   * Recupera um valor do armazenamento persistente
   */
  async load<T>(key: PersistenceKey | string): Promise<T | null> {
    try {
      const { value } = await Preferences.get({ key });
      if (!value) return null;
      
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (err) {
      console.warn(`Error loading persistence key ${key}:`, err);
      return null;
    }
  },

  /**
   * Remove uma chave do armazenamento
   */
  async remove(key: PersistenceKey | string): Promise<void> {
    await Preferences.remove({ key });
  },

  /**
   * Limpa rascunhos específicos do usuário
   */
  async clearUserDrafts(userId: string): Promise<void> {
    await Preferences.remove({ key: `${PersistenceKey.MARKET_DRAFT}_${userId}` });
    await Preferences.remove({ key: `auction_draft_${userId}` });
  }
};
