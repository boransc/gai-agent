/**
 * No part of this agent needs to fetch arbitrary URLs, and a customer message is untrusted input that should never be able to steer an outbound request.
 */
import { disableTool } from "eve/tools";

export default disableTool();
