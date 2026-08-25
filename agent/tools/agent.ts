/**
 * Delegating to a copy of itself would let a child run the pipeline with fresh state, bypassing the ordering guarantees, and doubles token spend.
 */
import { disableTool } from "eve/tools";

export default disableTool();
