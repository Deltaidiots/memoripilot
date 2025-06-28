/**
 * Represents a working mode for the Memory Bank.
 */
export interface Mode {
  /**
   * The unique identifier for the mode.
   */
  id: string;
  
  /**
   * The display name of the mode.
   */
  name: string;
  
  /**
   * Description of the mode's purpose.
   */
  description: string;
  
  /**
   * The files this mode should read for context.
   */
  readFiles: string[];
  
  /**
   * The files this mode can write to.
   */
  writeFiles: string[];
  
  /**
   * Prompt enhancement for this mode.
   */
  promptPrefix: string;
  
  /**
   * Natural language triggers for this mode.
   */
  triggers: string[];
}
