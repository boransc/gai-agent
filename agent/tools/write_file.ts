/**
 * No sandbox filesystem access is needed, and nothing here should persist files.
 */
import { disableTool } from "eve/tools";

export default disableTool();
