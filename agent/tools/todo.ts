/**
 * Enquiry progress is tracked in durable session state (agent/lib/state.ts), not a model-managed list.
 */
import { disableTool } from "eve/tools";

export default disableTool();
