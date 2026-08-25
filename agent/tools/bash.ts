/**
 * A customer-facing enquiry agent has no business running shell commands.
 */
import { disableTool } from "eve/tools";

export default disableTool();
